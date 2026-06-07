"use client";

import * as React from "react";
import { toast } from "sonner";
import { Lock, UserPlus, Users } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MemberTable, type MemberAction } from "./member-table";
import { PendingInvites } from "./pending-invites";
import { RolesMatrix } from "./roles-matrix";
import { ChangeRoleDialog } from "./change-role-dialog";
import { InviteModal } from "./invite-modal";
import { PeopleSkeleton } from "./people-skeletons";
import { GatedControl } from "./gated-control";
import { buildInvites, buildMembers, roleMeta } from "./data";
import { canManagePeople, firstName, sortMembers } from "./utils";
import type { CircleRole, Invite, Member } from "./types";

/** The People screen: members, pending invitations, and a roles & permissions reference. */
export function PeopleScreen() {
  const { role } = useAppShell();
  const canManage = canManagePeople(role);

  const [now] = React.useState(() => new Date());
  const [members, setMembers] = React.useState<Member[]>(() => sortMembers(buildMembers(now)));
  const [invites, setInvites] = React.useState<Invite[]>(() => buildInvites(now));
  const [loading, setLoading] = React.useState(true);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [changeRole, setChangeRole] = React.useState<Member | null>(null);
  const [removing, setRemoving] = React.useState<Member | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const activeCount = members.filter((m) => m.status === "active").length;

  const handleMemberAction = (member: Member, action: MemberAction) => {
    switch (action) {
      case "change-role":
        setChangeRole(member);
        break;
      case "resend":
        toast.success(`Invite resent to ${member.email}`);
        break;
      case "suspend":
        setMembers((prev) => sortMembers(prev.map((m) => (m.id === member.id ? { ...m, status: "suspended" } : m))));
        toast(`${firstName(member.name)} suspended`);
        break;
      case "reactivate":
        setMembers((prev) => sortMembers(prev.map((m) => (m.id === member.id ? { ...m, status: "active" } : m))));
        toast.success(`${firstName(member.name)} reactivated`);
        break;
      case "remove":
        setRemoving(member);
        break;
    }
  };

  const confirmChangeRole = (newRole: CircleRole) => {
    if (changeRole) {
      setMembers((prev) => prev.map((m) => (m.id === changeRole.id ? { ...m, role: newRole } : m)));
      toast.success(`${firstName(changeRole.name)} is now ${roleMeta[newRole].label}`);
    }
    setChangeRole(null);
  };

  const confirmRemove = () => {
    if (removing) {
      setMembers((prev) => prev.filter((m) => m.id !== removing.id));
      toast(`${firstName(removing.name)} removed from the circle`);
    }
    setRemoving(null);
  };

  const handleInvited = (newInvites: Invite[]) => {
    setInvites((prev) => [...newInvites, ...prev]);
    setInviteOpen(false);
    toast.success(newInvites.length === 1 ? "Invitation sent" : `${newInvites.length} invitations sent`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">People in this circle</h1>
          <p className="mt-1 text-muted-foreground">
            {loading ? "Loading members…" : `${activeCount} active ${activeCount === 1 ? "member" : "members"} caring for Antonio.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              View only
            </Badge>
          )}
          <GatedControl canManage={canManage}>
            <Button onClick={() => setInviteOpen(true)} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              <span className="ml-1">Invite people</span>
            </Button>
          </GatedControl>
        </div>
      </div>

      {/* Members */}
      {loading ? (
        <PeopleSkeleton />
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <Users className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold">No one here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Invite family and carers to start the circle.</p>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              <span className="ml-1">Invite people</span>
            </Button>
          )}
        </div>
      ) : (
        <MemberTable members={members} canManage={canManage} onAction={handleMemberAction} />
      )}

      {/* Pending invitations */}
      {!loading && (
        <PendingInvites
          invites={invites}
          canManage={canManage}
          onResend={(inv) => toast.success(`Invite resent to ${inv.email}`)}
          onRevoke={(inv) => {
            setInvites((prev) => prev.filter((i) => i.id !== inv.id));
            toast(`Invitation to ${inv.email} revoked`);
          }}
        />
      )}

      {/* Roles reference */}
      {!loading && <RolesMatrix />}

      {/* Dialogs */}
      {inviteOpen && (
        <InviteModal open onOpenChange={setInviteOpen} now={now} onInvited={handleInvited} />
      )}
      {changeRole && (
        <ChangeRoleDialog
          member={changeRole}
          open
          onOpenChange={(o) => !o && setChangeRole(null)}
          onConfirm={confirmChangeRole}
        />
      )}
      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing ? firstName(removing.name) : "this person"}?</AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll lose all access to this care circle. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
