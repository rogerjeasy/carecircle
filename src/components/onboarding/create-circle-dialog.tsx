"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CircleWizard, type CircleWizardResult } from "./circle-wizard";

interface CreateCircleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called after a new circle is created. Lets the app shell refresh the "Switch Circle" list
   * and pivot the active circle to the brand-new one — all without leaving the dashboard.
   */
  onCreated: (result: CircleWizardResult) => void | Promise<void>;
}

/**
 * The in-app "Create a new care circle" flow. It reuses the exact same multi-step wizard as
 * first-run onboarding ({@link CircleWizard}) — same steps, same server action — but presents it
 * in a modal so the user never leaves the dashboard. Radix unmounts the dialog body on close, so
 * the wizard starts fresh each time it opens (no persisted draft to disable).
 */
export function CreateCircleDialog({ open, onOpenChange, onCreated }: CreateCircleDialogProps) {
  const t = useTranslations("onboarding");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <CircleWizard
          variant="dialog"
          onComplete={async (result) => {
            await onCreated(result);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
