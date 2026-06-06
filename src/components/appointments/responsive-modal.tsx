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
import { useIsPhone } from "./use-is-phone";

export interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional node shown in the header under the description (e.g. status badges). */
  headerAccessory?: React.ReactNode;
  /**
   * The body. It receives a `flex min-h-0 flex-1 flex-col` parent, so render your own internal
   * scroll area + (optional) sticky footer inside — exactly the pattern the medication form uses.
   */
  children: React.ReactNode;
}

/**
 * Hosts content in a centered Dialog on tablet/laptop/desktop and a full-height bottom Sheet on
 * phone. Both fix their height to the viewport and delegate scrolling to the body, so the surface
 * fits any viewport and never overflows.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  headerAccessory,
  children,
}: ResponsiveModalProps) {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[96dvh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
            {headerAccessory}
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {headerAccessory}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
