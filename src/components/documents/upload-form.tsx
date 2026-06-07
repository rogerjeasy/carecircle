"use client";

import * as React from "react";
import { Check, FileText, ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "./form-field";
import { categoryMeta, sensitivityMeta } from "./data";
import type { UploadMeta } from "./upload-modal";
import type { DocCategory, DocumentItem, FileKind, Sensitivity } from "./types";

interface PendingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  kind: FileKind;
  previewUrl?: string;
}

export interface UploadFormProps {
  onUpload: (files: File[], meta: UploadMeta) => Promise<DocumentItem[]>;
  onUploaded: (docs: DocumentItem[]) => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = Object.keys(categoryMeta) as DocCategory[];
const SENSITIVITY_OPTIONS: Sensitivity[] = ["standard", "sensitive", "restricted"];
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB (matches the server ceiling)

function kindOf(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "doc";
}

function sizeLabel(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`;
  return `${bytes} B`;
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

let counter = 1;

/** The upload form: dropzone → metadata → real upload (one document per file) → success. */
export function UploadForm({ onUpload, onUploaded, onCancel }: UploadFormProps) {
  const [files, setFiles] = React.useState<PendingFile[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<DocCategory>("medical");
  const [sensitivity, setSensitivity] = React.useState<Sensitivity>("standard");
  const [expiry, setExpiry] = React.useState("");
  const [onEmergencyCard, setOnEmergencyCard] = React.useState(false);
  const [phase, setPhase] = React.useState<"select" | "uploading" | "done">("select");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Revoke any object URLs created for image previews on unmount.
  React.useEffect(
    () => () => files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl)),
    [files]
  );

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = [];
    for (const f of Array.from(fileList)) {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is too large (max 15 MB)`);
        continue;
      }
      const kind = kindOf(f);
      next.push({
        id: `pf-${counter++}`,
        file: f,
        name: f.name,
        size: f.size,
        kind,
        previewUrl: kind === "image" ? URL.createObjectURL(f) : undefined,
      });
    }
    setFiles((prev) => {
      const merged = [...prev, ...next];
      if (merged.length === 1) setTitle(stripExt(merged[0].name));
      return merged;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const left = prev.filter((f) => f.id !== id);
      if (left.length === 1) setTitle(stripExt(left[0].name));
      if (left.length === 0) setTitle("");
      return left;
    });
  };

  const single = files.length === 1;
  const canSubmit = files.length > 0 && (!single || title.trim().length > 0) && phase === "select";

  const startUpload = async () => {
    if (!canSubmit) return;
    setPhase("uploading");
    const meta: UploadMeta = {
      title: title.trim(),
      category,
      sensitivity,
      expiry: expiry || undefined,
      onEmergencyCard,
    };
    try {
      const created = await onUpload(
        files.map((f) => f.file),
        meta
      );
      if (created.length === 0) {
        setPhase("select"); // every file failed — errors already surfaced by the caller
        return;
      }
      setPhase("done");
      setTimeout(() => onUploaded(created), 600);
    } catch {
      setPhase("select");
      toast.error("Upload failed — please try again");
    }
  };

  // ---- Success state ----
  if (phase === "done") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success motion-safe:animate-in motion-safe:zoom-in-50">
          <Check className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold">
            {files.length === 1 ? "Document uploaded" : `${files.length} documents uploaded`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Saved to the vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (phase === "select") setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (phase === "select") addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">Drag &amp; drop files here</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={phase !== "select"}
            >
              Browse files
            </Button>
            <p className="text-xs text-muted-foreground">PDF, Word, or images · up to 15 MB each</p>
          </div>
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <ul className="space-y-2" aria-label="Selected files">
            {files.map((f) => {
              const Icon = f.kind === "image" ? ImageIcon : FileText;
              return (
                <li key={f.id} className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                    {f.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{sizeLabel(f.size)}</p>
                  </div>
                  {phase === "select" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(f.id)}
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Metadata */}
        {files.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {single && (
              <FormField htmlFor="doc-title" label="Title" required full>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Health insurance card"
                  disabled={phase !== "select"}
                />
              </FormField>
            )}

            <FormField htmlFor="doc-category" label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
                <SelectTrigger id="doc-category" disabled={phase !== "select"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryMeta[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField htmlFor="doc-sensitivity" label="Sensitivity" hint={sensitivityMeta[sensitivity].note}>
              <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as Sensitivity)}>
                <SelectTrigger id="doc-sensitivity" disabled={phase !== "select"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SENSITIVITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {sensitivityMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField htmlFor="doc-expiry" label="Expiry date" hint="Optional">
              <Input
                id="doc-expiry"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                disabled={phase !== "select"}
              />
            </FormField>

            <div className="flex items-center justify-between gap-3 rounded-xl border p-3 sm:col-span-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Include on emergency card</p>
                <p className="text-xs text-muted-foreground">Surfaced first for paramedics and on-call carers.</p>
              </div>
              <Switch
                checked={onEmergencyCard}
                onCheckedChange={setOnEmergencyCard}
                disabled={phase !== "select"}
                aria-label="Include on emergency card"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={phase === "uploading"}>
            Cancel
          </Button>
          <Button type="button" onClick={startUpload} disabled={!canSubmit} className="min-w-[8.5rem]">
            {phase === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">Uploading…</span>
              </>
            ) : (
              <span>{files.length > 1 ? `Upload ${files.length} files` : "Upload"}</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
