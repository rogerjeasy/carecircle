"use client";

import * as React from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MedAttachment } from "./types";

export interface MedAttachmentsProps {
  /** Files chosen in this session, not yet uploaded (uploaded after the medication is saved). */
  pending: File[];
  onPendingChange: (files: File[]) => void;
  /** Already-saved attachments (edit mode), with resolved URLs. */
  existing?: MedAttachment[];
  /** Remove a saved attachment (persists + updates the parent list). */
  onRemoveExisting?: (id: string) => void;
}

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

/** Whether a file is an image (→ medications/images) or a document (→ medications/documents). */
export function attachmentKind(file: File): "image" | "document" {
  return file.type.startsWith("image/") ? "image" : "document";
}

/** A small preview tile for a pending image (object URL is created/revoked here). */
function PendingImageThumb({ file }: { file: File }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // Intentional: derive a preview URL from the file on mount; revoked on cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

/** Uploader for medication images + documents. Pending files upload after the medication saves. */
export function MedAttachments({ pending, onPendingChange, existing = [], onRemoveExisting }: MedAttachmentsProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: File[] = [...pending];
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is too large (max 15 MB)`);
        continue;
      }
      next.push(file);
    }
    onPendingChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePending = (idx: number) => onPendingChange(pending.filter((_, i) => i !== idx));

  const hasAny = pending.length > 0 || existing.length > 0;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Paperclip className="h-4 w-4" />
        <span className="ml-1">Add images or documents</span>
      </Button>

      {hasAny && (
        <ul className="space-y-1.5">
          {/* Already-saved attachments */}
          {existing.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border bg-card p-2">
              {a.kind === "image" && a.url ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.fileName} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {a.kind === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{a.fileName}</span>
              {onRemoveExisting && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  onClick={() => onRemoveExisting(a.id)}
                  aria-label={`Remove ${a.fileName}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}

          {/* Newly-chosen files (upload on save) */}
          {pending.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className="flex items-center gap-2 rounded-lg border border-dashed bg-card p-2">
              {attachmentKind(file) === "image" ? (
                <PendingImageThumb file={file} />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => removePending(idx)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
