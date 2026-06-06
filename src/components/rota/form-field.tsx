"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FormFieldProps {
  htmlFor: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  full?: boolean;
  children: React.ReactNode;
}

/** A small shadcn-style form-field shell: label + control + inline error/hint with aria wiring. */
export function FormField({ htmlFor, label, error, hint, required, className, full, children }: FormFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", full && "sm:col-span-2", className)}>
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldAria(id: string, error?: string, hint?: React.ReactNode) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;
}
