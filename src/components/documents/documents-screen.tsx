"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Lock, Plus, Search, ShieldCheck } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentCard, type DocAction } from "./document-card";
import { LockedCard } from "./locked-card";
import { DocumentViewer } from "./document-viewer";
import { UploadModal, type UploadMeta } from "./upload-modal";
import { RenameDialog } from "./rename-dialog";
import { GatedControl } from "./gated-control";
import { categoryMeta, CATEGORY_FILTERS } from "./data";
import { canUpload, canSeeRestricted, isLockedFor } from "./utils";
import {
  uploadDocument,
  renameDocument,
  deleteDocument,
  toggleEmergencyCard,
} from "@/lib/documents/actions";
import type { DocCategory, DocumentItem, DocumentsData } from "./types";

export interface DocumentsScreenProps {
  /** Real vault data loaded server-side for the active circle, or null when there's no circle/data. */
  initial: DocumentsData | null;
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** The Documents vault: searchable, filterable grid backed by the server with sensitivity-aware RLS. */
export function DocumentsScreen({ initial }: DocumentsScreenProps) {
  const router = useRouter();
  const { role } = useAppShell();
  const allowUpload = canUpload(role);

  const [now] = React.useState(() => new Date());
  const [docs, setDocs] = React.useState<DocumentItem[]>(initial?.documents ?? []);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<DocCategory | "all">("all");

  const [viewer, setViewer] = React.useState<DocumentItem | null>(null);
  const [renaming, setRenaming] = React.useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = React.useState<DocumentItem | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const q = query.trim().toLowerCase();
  const visible = React.useMemo(
    () =>
      docs.filter((d) => {
        if (category !== "all" && d.category !== category) return false;
        const locked = isLockedFor(d, role);
        if (!q) return true;
        if (locked) return false;
        return d.title.toLowerCase().includes(q) || categoryMeta[d.category].label.toLowerCase().includes(q);
      }),
    [docs, category, q, role]
  );

  const openFile = (doc: DocumentItem) => {
    if (doc.downloadUrl) window.open(doc.downloadUrl, "_blank", "noopener,noreferrer");
    else toast.error("This file isn't available right now");
  };

  const handleAction = (doc: DocumentItem, action: DocAction) => {
    switch (action) {
      case "preview":
        setViewer(doc);
        break;
      case "download":
        openFile(doc);
        break;
      case "emergency": {
        const prev = docs;
        setDocs((p) => p.map((d) => (d.id === doc.id ? { ...d, onEmergencyCard: !d.onEmergencyCard } : d)));
        toast(doc.onEmergencyCard ? "Removed from emergency card" : "Added to emergency card");
        void toggleEmergencyCard(doc.id).then((res) => {
          if (!res.ok) {
            setDocs(prev);
            toast.error(res.error ?? "Couldn't update the emergency card");
          }
        });
        break;
      }
      case "rename":
        setRenaming(doc);
        break;
      case "delete":
        setDeleting(doc);
        break;
    }
  };

  const confirmRename = async (title: string) => {
    const target = renaming;
    setRenaming(null);
    if (!target) return;
    const prev = docs;
    setDocs((p) => p.map((d) => (d.id === target.id ? { ...d, title } : d)));
    const res = await renameDocument(target.id, title);
    if (res.ok) toast.success("Renamed");
    else {
      setDocs(prev);
      toast.error(res.error ?? "Couldn't rename");
    }
  };

  const confirmDelete = async () => {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    const prev = docs;
    setDocs((p) => p.filter((d) => d.id !== target.id));
    const res = await deleteDocument(target.id);
    if (res.ok) {
      toast(`“${target.title}” deleted`);
      router.refresh();
    } else {
      setDocs(prev);
      toast.error(res.error ?? "Couldn't delete");
    }
  };

  /** Real upload: one document per file (the action stores it in S3 + DB and returns the DTO). */
  const handleUpload = async (files: File[], meta: UploadMeta): Promise<DocumentItem[]> => {
    const created: DocumentItem[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", files.length === 1 ? meta.title : stripExt(file.name));
      fd.set("category", meta.category);
      fd.set("sensitivity", meta.sensitivity);
      fd.set("expiry", meta.expiry ?? "");
      fd.set("onEmergencyCard", String(meta.onEmergencyCard));
      const res = await uploadDocument(fd);
      if (res.ok) created.push(res.data);
      else toast.error(res.error ?? `Couldn't upload ${file.name}`);
    }
    return created;
  };

  const handleUploaded = (newDocs: DocumentItem[]) => {
    if (newDocs.length > 0) {
      setDocs((prev) => [...newDocs, ...prev]);
      toast.success(newDocs.length === 1 ? "Document uploaded" : `${newDocs.length} documents uploaded`);
    }
    setUploadOpen(false);
  };

  // Role-based explainer: tell roles that can't see restricted docs that some may be coordinator-only.
  // (The rows themselves are hidden by RLS — never sent to the client.)
  const restrictedHidden = !canSeeRestricted(role);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Documents</h1>
          <p className="mt-1 text-muted-foreground">The family&apos;s shared vault for important paperwork.</p>
        </div>
        <GatedControl canManage={allowUpload}>
          <Button onClick={() => setUploadOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="ml-1">Upload</span>
          </Button>
        </GatedControl>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="h-11 pl-9"
            aria-label="Search documents"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as DocCategory | "all")}>
          <SelectTrigger className="h-11 w-full sm:w-52" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RBAC explainer */}
      {restrictedHidden && (
        <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Some documents may be <span className="font-medium text-foreground">restricted to coordinators</span>. Access
            is enforced by the database itself (row-level security) — restricted files are never sent to your device,
            and every document view is recorded in the circle&apos;s tamper-proof audit ledger.
          </span>
        </div>
      )}

      {/* Grid */}
      {docs.length === 0 ? (
        <EmptyState allowUpload={allowUpload} onUpload={() => setUploadOpen(true)} variant="empty" />
      ) : visible.length === 0 ? (
        <EmptyState allowUpload={allowUpload} onUpload={() => setUploadOpen(true)} variant="no-results" />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((doc) =>
            isLockedFor(doc, role) ? (
              <LockedCard key={doc.id} doc={doc} />
            ) : (
              <DocumentCard
                key={doc.id}
                doc={doc}
                canManage={allowUpload}
                now={now}
                onAction={(action) => handleAction(doc, action)}
              />
            )
          )}
        </div>
      )}

      {/* Viewer */}
      <DocumentViewer
        doc={viewer}
        open={viewer !== null}
        onOpenChange={(o) => !o && setViewer(null)}
        onDownload={() => viewer && openFile(viewer)}
      />

      {/* Upload */}
      {uploadOpen && (
        <UploadModal open onOpenChange={setUploadOpen} onUpload={handleUpload} onUploaded={handleUploaded} />
      )}

      {/* Rename */}
      {renaming && (
        <RenameDialog
          open
          initialTitle={renaming.title}
          onOpenChange={(o) => !o && setRenaming(null)}
          onSave={confirmRename}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be removed from the vault. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  allowUpload,
  onUpload,
  variant,
}: {
  allowUpload: boolean;
  onUpload: () => void;
  variant: "empty" | "no-results";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        {variant === "empty" ? <FileText className="h-7 w-7" aria-hidden="true" /> : <Search className="h-7 w-7" aria-hidden="true" />}
      </div>
      <div>
        <p className="text-base font-semibold">
          {variant === "empty" ? "No documents yet" : "No documents match"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {variant === "empty"
            ? "Upload the first document to start the vault."
            : "Try a different search or category."}
        </p>
      </div>
      {variant === "empty" && allowUpload && (
        <Button onClick={onUpload}>
          <Plus className="h-4 w-4" />
          <span className="ml-1">Upload</span>
        </Button>
      )}
      {variant === "empty" && !allowUpload && (
        <Badge variant="secondary" className="gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Ask a coordinator to add documents
        </Badge>
      )}
    </div>
  );
}
