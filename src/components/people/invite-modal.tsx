"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("people");
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("inviteModal.title")}
      description={t("inviteModal.description")}
      dialogClassName="sm:max-w-3xl"
    >
      <InviteForm onSubmit={onSubmit} onInvited={onInvited} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
