"use client";

import { ResponsiveModal } from "./responsive-modal";
import { InviteForm } from "./invite-form";
import type { CircleRole, Invite } from "./types";

export interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Performs the real invite (creates invitations + emails) and returns the created invites. */
  onSubmit: (rows: { email: string; role: CircleRole }[], note: string) => Promise<Invite[]>;
  /** Called once the user finishes (adds the created invites to the list + closes). */
  onInvited: (invites: Invite[]) => void;
}

/** Invite people, in a comfortable centered Dialog on tablet+ and a full-height Sheet on phone. */
export function InviteModal({ open, onOpenChange, onSubmit, onInvited }: InviteModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite people"
      description="Send invitations and choose what each person can see."
      dialogClassName="sm:max-w-3xl"
    >
      <InviteForm onSubmit={onSubmit} onInvited={onInvited} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
