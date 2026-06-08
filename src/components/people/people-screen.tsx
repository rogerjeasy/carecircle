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
import { PhoneDialog } from "./phone-dialog";
import { InviteModal } from "./invite-modal";
import { GatedControl } from "./gated-control";
import { roleMeta } from "./data";
import { canManagePeople, firstName, sortMembers } from "./utils";
import {
  invitePeople,
  changeMemberRole,
  setMemberStatus,
  removeMember,
  revokeInvite,
  resendInvite,
  updateMemberPhone,
} from "@/lib/people/actions";
import type { CircleRole, Invite, Member, PeopleData } from "./types";

export interface PeopleScreenProps {
  /** Real members + pending invites loaded server-side, or null when there's no circle/data. */
  initial: PeopleData | null;
}

/** The People screen: members, pending invitations, and a roles & permissions reference. */
export function PeopleScreen({ initial }: PeopleScreenProps) {
  const { role } = useAppShell();
  const canManage = canManagePeople(role);

  const [members, setMembers] = React.useState<Member[]>(() => sortMembers(initial?.members ?? []));
  const [invites, setInvites] = React.useState<Invite[]>(initial?.invites ?? []);
  const recipientName = initial?.recipientName ?? null;

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [changeRole, setChangeRole] = React.useState<Member | null>(null);
  const [editingPhone, setEditingPhone] = React.useState<Member | null>(null);
  const [removing, setRemoving] = React.useState<Member | null>(null);

  const activeCount = members.filter((m) => m.status === "active").length;

  /** Optimistically mutate a member, persist, and revert on failure. */
  const persistMember = (
    next: (prev: Member[]) => Member[],
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMsg?: string
  ) => {
    const prev = members;
    setMembers(sortMembers(next(prev)));
    if (successMsg) toast(successMsg);
    void action().then((res) => {
      if (!res.ok) {
        setMembers(prev);
        toast.error(res.error ?? "Couldn't save the change");
      }
    });
  };

  const handleMemberAction = (member: Member, action: MemberAction) => {
    switch (action) {
      case "change-role":
        setChangeRole(member);
        break;
      case "edit-phone":
        setEditingPhone(member);
        break;
      case "resend":
        void resendInvite(member.id).then((res) =>
          res.ok ? toast.success(`Invite resent to ${member.email}`) : toast.error(res.error ?? "Couldn't resend")
        );
        break;
      case "suspend":
        persistMember(
          (prev) => prev.map((m) => (m.id === member.id ? { ...m, status: "suspended" } : m)),
          () => setMemberStatus(member.id, "suspended"),
          `${firstName(member.name)} suspended`
        );
        break;
      case "reactivate":
        persistMember(
          (prev) => prev.map((m) => (m.id === member.id ? { ...m, status: "active" } : m)),
          () => setMemberStatus(member.id, "active"),
          `${firstName(member.name)} reactivated`
        );
        break;
      case "remove":
        setRemoving(member);
        break;
    }
  };

  const confirmChangeRole = (newRole: CircleRole) => {
    const target = changeRole;
    setChangeRole(null);
    if (!target) return;
    persistMember(
      (prev) => prev.map((m) => (m.id === target.id ? { ...m, role: newRole } : m)),
      () => changeMemberRole(target.id, newRole),
      `${firstName(target.name)} is now ${roleMeta[newRole].label}`
    );
  };

  const confirmPhone = (phone: string) => {
    const target = editingPhone;
    setEditingPhone(null);
    if (!target) return;
    persistMember(
      (prev) => prev.map((m) => (m.id === target.id ? { ...m, phone } : m)),
      () => updateMemberPhone(target.id, phone),
      phone ? `Phone saved for ${firstName(target.name)}` : `Phone removed for ${firstName(target.name)}`
    );
  };

  const confirmRemove = () => {
    const target = removing;
    setRemoving(null);
    if (!target) return;
    persistMember(
      (prev) => prev.filter((m) => m.id !== target.id),
      () => removeMember(target.id),
      `${firstName(target.name)} removed from the circle`
    );
  };

  const handleInviteSubmit = async (
    rows: { email: string; role: CircleRole }[],
    note: string
  ): Promise<Invite[]> => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ invites: rows, note }));
    const res = await invitePeople(fd);
    if (!res.ok) {
      toast.error(res.error ?? "Couldn't send the invitations");
      return [];
    }
    return res.data;
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
            {activeCount} active {activeCount === 1 ? "member" : "members"}
            {recipientName ? ` caring for ${recipientName}.` : "."}
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
      {members.length === 0 ? (
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
      <PendingInvites
        invites={invites}
        canManage={canManage}
        onResend={(inv) =>
          void resendInvite(inv.id).then((res) =>
            res.ok ? toast.success(`Invite resent to ${inv.email}`) : toast.error(res.error ?? "Couldn't resend")
          )
        }
        onRevoke={(inv) => {
          const prev = invites;
          setInvites((p) => p.filter((i) => i.id !== inv.id));
          toast(`Invitation to ${inv.email} revoked`);
          void revokeInvite(inv.id).then((res) => {
            if (!res.ok) {
              setInvites(prev);
              toast.error(res.error ?? "Couldn't revoke");
            }
          });
        }}
      />

      {/* Roles reference */}
      <RolesMatrix />

      {/* Dialogs */}
      {inviteOpen && (
        <InviteModal
          open
          onOpenChange={setInviteOpen}
          onSubmit={handleInviteSubmit}
          onInvited={handleInvited}
        />
      )}
      {changeRole && (
        <ChangeRoleDialog
          member={changeRole}
          open
          onOpenChange={(o) => !o && setChangeRole(null)}
          onConfirm={confirmChangeRole}
        />
      )}
      {editingPhone && (
        <PhoneDialog
          member={editingPhone}
          open
          onOpenChange={(o) => !o && setEditingPhone(null)}
          onConfirm={confirmPhone}
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
