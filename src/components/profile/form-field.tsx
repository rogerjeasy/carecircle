"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FormFieldProps {
  htmlFor: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  full?: boolean;
  children: React.ReactNode;
}

/** A small shadcn-style form-field shell. */
export function FormField({ htmlFor, label, hint, className, full, children }: FormFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", full && "sm:col-span-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
