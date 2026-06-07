"use client";

import { format } from "date-fns";
import { Mail, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoleBadge } from "./badges";
import { GatedControl } from "./gated-control";
import type { Invite } from "./types";

export interface PendingInvitesProps {
  invites: Invite[];
  canManage: boolean;
  onResend: (invite: Invite) => void;
  onRevoke: (invite: Invite) => void;
}

/** The "Pending invitations" section: email, role, sent date, with Resend / Revoke. */
export function PendingInvites({ invites, canManage, onResend, onRevoke }: PendingInvitesProps) {
  if (invites.length === 0) return null;

  return (
    <section aria-label="Pending invitations" className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Pending invitations</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{invites.length}</span>
      </div>

      <Card className="p-0">
        <CardContent className="divide-y p-0">
          {invites.map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invite.email}</p>
                  <p className="truncate text-xs text-muted-foreground">Sent {format(invite.sentAt, "MMM d, yyyy")}</p>
                </div>
              </div>
              <RoleBadge role={invite.role} className="shrink-0" />
              <div className="flex shrink-0 items-center gap-1.5">
                <GatedControl canManage={canManage}>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => onResend(invite)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="ml-1 hidden sm:inline">Resend</span>
                  </Button>
                </GatedControl>
                <GatedControl canManage={canManage}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRevoke(invite)}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="ml-1 hidden sm:inline">Revoke</span>
                  </Button>
                </GatedControl>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
