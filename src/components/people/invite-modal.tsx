"use client";

import { ResponsiveModal } from "./responsive-modal";
import { InviteForm } from "./invite-form";
import type { Invite } from "./types";

export interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: Date;
  onInvited: (invites: Invite[]) => void;
}

/** Invite people, in a comfortable centered Dialog on tablet+ and a full-height Sheet on phone. */
export function InviteModal({ open, onOpenChange, now, onInvited }: InviteModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite people"
      description="Send invitations and choose what each person can see."
      dialogClassName="sm:max-w-3xl"
    >
      <InviteForm now={now} onInvited={onInvited} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
