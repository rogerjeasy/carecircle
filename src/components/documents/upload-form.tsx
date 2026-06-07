"use client";

import * as React from "react";
import { Check, FileText, ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import type { DocCategory, DocumentItem, FileKind, Sensitivity } from "./types";

interface PendingFile {
  id: string;
  name: string;
  size: number;
  kind: FileKind;
  previewUrl?: string;
  progress: number;
}

export interface UploadFormProps {
  now: Date;
  uploaderId: string;
  onUploaded: (docs: DocumentItem[]) => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = Object.keys(categoryMeta) as DocCategory[];
const SENSITIVITY_OPTIONS: Sensitivity[] = ["standard", "sensitive", "restricted"];

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

/** The upload form: drag-and-drop dropzone → metadata → per-file progress → success. */
export function UploadForm({ now, uploaderId, onUploaded, onCancel }: UploadFormProps) {
  const [files, setFiles] = React.useState<PendingFile[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<DocCategory>("medical");
  const [sensitivity, setSensitivity] = React.useState<Sensitivity>("standard");
  const [expiry, setExpiry] = React.useState("");
  const [onEmergencyCard, setOnEmergencyCard] = React.useState(false);
  const [phase, setPhase] = React.useState<"select" | "uploading" | "done">("select");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timers = React.useRef<ReturnType<typeof setInterval>[]>([]);

  React.useEffect(() => () => timers.current.forEach(clearInterval), []);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = Array.from(fileList).map((f) => {
      const kind = kindOf(f);
      return {
        id: `pf-${counter++}`,
        name: f.name,
        size: f.size,
        kind,
        previewUrl: kind === "image" ? URL.createObjectURL(f) : undefined,
        progress: 0,
      };
    });
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

  const buildDocs = (): DocumentItem[] =>
    files.map((f, i) => ({
      id: `doc-up-${Date.now()}-${i}`,
      title: single ? title.trim() : stripExt(f.name),
      category,
      sensitivity,
      kind: f.kind,
      size: sizeLabel(f.size),
      uploadedById: uploaderId,
      uploadedAt: now,
      expiresAt: expiry ? new Date(`${expiry}T00:00:00`) : undefined,
      onEmergencyCard,
      previewUrl: f.previewUrl,
    }));

  const startUpload = () => {
    if (!canSubmit) return;
    setPhase("uploading");
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setFiles((prev) => prev.map((f) => ({ ...f, progress: 100 })));
      finish();
      return;
    }

    let done = 0;
    files.forEach((file, idx) => {
      const timer = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, progress: Math.min(100, f.progress + 8 + idx) } : f))
        );
      }, 90);
      timers.current.push(timer);
      // Stop this file's timer once it reaches 100.
      const stopper = setInterval(() => {
        setFiles((prev) => {
          const f = prev.find((x) => x.id === file.id);
          if (f && f.progress >= 100) {
            clearInterval(timer);
            clearInterval(stopper);
            done += 1;
            if (done === files.length) finish();
          }
          return prev;
        });
      }, 100);
      timers.current.push(stopper);
    });
  };

  const finish = () => {
    timers.current.forEach(clearInterval);
    timers.current = [];
    setPhase("done");
    setTimeout(() => onUploaded(buildDocs()), 600);
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
            accept="image/*,application/pdf,.doc,.docx"
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
            <p className="text-xs text-muted-foreground">PDF, JPG or PNG · up to 10 MB each</p>
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
                    {phase === "uploading" ? (
                      <Progress value={f.progress} className="mt-1.5 h-1.5" aria-label={`Uploading ${f.name}`} />
                    ) : (
                      <p className="text-xs text-muted-foreground">{sizeLabel(f.size)}</p>
                    )}
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
                  ) : f.progress >= 100 ? (
                    <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
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
