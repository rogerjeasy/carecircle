"use client";

import { ResponsiveModal } from "./responsive-modal";
import { UploadForm } from "./upload-form";
import type { DocumentItem } from "./types";

export interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: Date;
  uploaderId: string;
  onUploaded: (docs: DocumentItem[]) => void;
}

/** Upload documents, in a centered Dialog on tablet+ and a full-height Sheet on phone. */
export function UploadModal({ open, onOpenChange, now, uploaderId, onUploaded }: UploadModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload document"
      description="Add a file and tell us who should be able to see it."
    >
      <UploadForm
        now={now}
        uploaderId={uploaderId}
        onUploaded={onUploaded}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveModal>
  );
}
