"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MedicationForm } from "./medication-form";
import { useIsPhone } from "./use-is-phone";
import type { MedFormValues } from "./schema";
import type { MedAttachment, Medication } from "./types";

export interface MedicationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial?: Medication;
  currentMedNames: string[];
  existingAttachments?: MedAttachment[];
  onRemoveAttachment?: (id: string) => void;
  onSubmit: (values: MedFormValues, pendingFiles: File[]) => void;
}

/**
 * Hosts the medication form in a centered Dialog on tablet/laptop/desktop and a full-height bottom
 * Sheet on phone. Both fix their height to the viewport and let the form scroll internally, so the
 * surface never overflows. The form itself (header aside) is identical across both.
 */
export function MedicationFormModal({
  open,
  onOpenChange,
  mode,
  initial,
  currentMedNames,
  existingAttachments,
  onRemoveAttachment,
  onSubmit,
}: MedicationFormModalProps) {
  const isPhone = useIsPhone();
  const title = mode === "edit" ? "Edit medication" : "Add medication";
  const description =
    mode === "edit"
      ? "Update the details, schedule, and supply."
      : "Fill in the details to add it to the medication list.";

  const form = (
    <MedicationForm
      mode={mode}
      initial={initial}
      currentMedNames={currentMedNames}
      existingAttachments={existingAttachments}
      onRemoveAttachment={onRemoveAttachment}
      onSubmit={onSubmit}
      onCancel={() => onOpenChange(false)}
    />
  );

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[96dvh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
