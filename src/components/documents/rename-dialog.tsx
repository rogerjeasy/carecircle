"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "./responsive-modal";
import { FormField } from "./form-field";

export interface RenameDialogProps {
  open: boolean;
  initialTitle: string;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => void;
}

/** A tiny rename flow — Dialog on tablet+, Sheet on phone. */
export function RenameDialog({ open, initialTitle, onOpenChange, onSave }: RenameDialogProps) {
  const [title, setTitle] = React.useState(initialTitle);
  const valid = title.trim().length > 0;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Rename document">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(title.trim());
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <FormField htmlFor="rename-title" label="Title" required error={valid ? undefined : "Enter a title"}>
            <Input id="rename-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
        </div>
        <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveModal>
  );
}
