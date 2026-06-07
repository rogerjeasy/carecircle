"use client";

import { MoreHorizontal, RefreshCw, Shield, Trash2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge, StatusBadge } from "./badges";
import { useIsPhone } from "./use-is-phone";
import { lastActiveLabel } from "./utils";
import type { Member } from "./types";

export type MemberAction = "change-role" | "resend" | "suspend" | "reactivate" | "remove";

export interface MemberTableProps {
  members: Member[];
  canManage: boolean;
  onAction: (member: Member, action: MemberAction) => void;
}

/** Member list — a real table on tablet+/desktop, stacked cards on phone. */
export function MemberTable({ members, canManage, onAction }: MemberTableProps) {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <ul className="space-y-2.5" aria-label="Members">
        {members.map((m) => (
          <li key={m.id} className="rounded-2xl border bg-card p-3.5">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className={cn("text-sm font-semibold", m.color)}>{m.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{m.name}</p>
                <p className="truncate text-sm text-muted-foreground">{m.relationship}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <MemberActionsMenu member={m} canManage={canManage} onAction={onAction} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RoleBadge role={m.role} />
              <StatusBadge status={m.status} />
              <span className="ml-auto text-xs text-muted-foreground">{lastActiveLabel(m.lastActive)}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <caption className="sr-only">People in this care circle</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">Person</th>
            <th scope="col" className="px-4 py-3 font-medium">Relationship</th>
            <th scope="col" className="px-4 py-3 font-medium">Role</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Last active</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id} className={cn("align-middle", i % 2 === 1 && "bg-muted/20")}>
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={cn("text-xs font-semibold", m.color)}>{m.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
              </td>
              <td className="max-w-[12rem] px-4 py-3">
                <span className="block truncate text-muted-foreground">{m.relationship}</span>
              </td>
              <td className="px-4 py-3">
                <RoleBadge role={m.role} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={m.status} />
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">
                {lastActiveLabel(m.lastActive)}
              </td>
              <td className="px-4 py-3 text-right">
                <MemberActionsMenu member={m} canManage={canManage} onAction={onAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberActionsMenu({
  member,
  canManage,
  onAction,
}: {
  member: Member;
  canManage: boolean;
  onAction: (member: Member, action: MemberAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${member.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled={!canManage} onClick={() => onAction(member, "change-role")}>
          <Shield className="mr-2 h-4 w-4" />
          Change role
        </DropdownMenuItem>
        {member.status === "invited" && (
          <DropdownMenuItem disabled={!canManage} onClick={() => onAction(member, "resend")}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Resend invite
          </DropdownMenuItem>
        )}
        {member.status === "suspended" ? (
          <DropdownMenuItem disabled={!canManage} onClick={() => onAction(member, "reactivate")}>
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={!canManage} onClick={() => onAction(member, "suspend")}>
            <UserX className="mr-2 h-4 w-4" />
            Suspend
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canManage}
          onClick={() => onAction(member, "remove")}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
