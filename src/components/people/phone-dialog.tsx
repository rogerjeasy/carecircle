"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "./responsive-modal";
import { FormField } from "./form-field";
import { firstName } from "./utils";
import type { Member } from "./types";

export interface PhoneDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (phone: string) => void;
}

/** Set/edit a member's contact phone — used so emergency contacts are callable on the card. */
export function PhoneDialog({ member, open, onOpenChange, onConfirm }: PhoneDialogProps) {
  const t = useTranslations("people");
  const [phone, setPhone] = React.useState(member.phone);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={member.phone ? t("phone.editTitle") : t("phone.addTitle")}
      description={t("phone.description", { name: firstName(member.name) })}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <FormField htmlFor="member-phone" label={t("phone.phoneLabel")}>
          <input
            id="member-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phone.phonePlaceholder")}
            autoFocus
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </FormField>
        <p className="text-xs text-muted-foreground">{t("phone.blankToRemove")}</p>
      </div>

      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("phone.cancel")}
          </Button>
          <Button type="button" onClick={() => onConfirm(phone.trim())}>
            {t("phone.save")}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
