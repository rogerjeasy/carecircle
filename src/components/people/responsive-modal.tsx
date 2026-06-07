"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsPhone } from "./use-is-phone";

export interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  dialogClassName?: string;
}

/** Centered Dialog on tablet/laptop/desktop, full-height bottom Sheet on phone; body scrolls. */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  dialogClassName,
}: ResponsiveModalProps) {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[94dvh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg",
          dialogClassName
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
