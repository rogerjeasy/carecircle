"use client";

import { useTranslations } from "next-intl";
import { ResponsiveModal } from "./responsive-modal";
import { UploadForm } from "./upload-form";
import type { DocCategory, DocumentItem, Sensitivity } from "./types";

/** Metadata applied to an upload (title is only used when a single file is uploaded). */
export interface UploadMeta {
  title: string;
  category: DocCategory;
  sensitivity: Sensitivity;
  expiry?: string;
  onEmergencyCard: boolean;
}

export interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Performs the real upload (one document per file) and returns the created items. */
  onUpload: (files: File[], meta: UploadMeta) => Promise<DocumentItem[]>;
  /** Called once uploads succeed, with the created documents (to add to the grid + close). */
  onUploaded: (docs: DocumentItem[]) => void;
}

/** Upload documents, in a centered Dialog on tablet+ and a full-height Sheet on phone. */
export function UploadModal({ open, onOpenChange, onUpload, onUploaded }: UploadModalProps) {
  const t = useTranslations("documents");
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("uploadModal.title")}
      description={t("uploadModal.description")}
    >
      <UploadForm onUpload={onUpload} onUploaded={onUploaded} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
