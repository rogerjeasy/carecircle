"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "./responsive-modal";
import type { DocumentItem } from "./types";

export interface DocumentViewerProps {
  doc: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
}

/** An accessible preview viewer that fits any viewport and scrolls internally. */
export function DocumentViewer({ doc, open, onOpenChange, onDownload }: DocumentViewerProps) {
  const t = useTranslations("documents");
  if (!doc) return null;
  const catLabel = t(`categories.${doc.category}` as "categories.medical");

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={<span className="block truncate pr-2">{doc.title}</span>}
      description={`${catLabel} · ${doc.size}`}
      dialogClassName="sm:max-w-3xl"
    >
      {/* Scrollable preview area */}
      <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-4">
        {doc.kind === "image" && doc.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.previewUrl}
            alt={doc.title}
            className="mx-auto h-auto max-w-full rounded-lg shadow-sm"
          />
        ) : doc.kind === "pdf" && doc.downloadUrl ? (
          <iframe
            src={doc.downloadUrl}
            title={doc.title}
            className="h-[60vh] w-full rounded-lg border bg-card shadow-sm"
          />
        ) : (
          <FauxPage doc={doc} />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          {doc.onEmergencyCard ? (
            <Badge variant="outline" className="gap-1 border-transparent bg-destructive/10 text-destructive">
              {t("viewer.onEmergencyCard")}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("viewer.close")}
            </Button>
            <Button onClick={onDownload}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{t("card.download")}</span>
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}

/**
 * Shown only when the browser can't render the file inline: Word/Excel-type documents (no native
 * viewer) or a row whose stored file is unavailable. PDFs and images render for real above.
 */
function FauxPage({ doc }: { doc: DocumentItem }) {
  const t = useTranslations("documents");
  const isOfficeDoc = doc.kind === "doc";
  const catLabel = t(`categories.${doc.category}` as "categories.medical");
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-base font-semibold">{doc.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{catLabel}</p>
        <div className="mt-5 space-y-2.5" aria-hidden="true">
          {[
            "w-2/3",
            "w-full",
            "w-11/12",
            "w-full",
            "w-5/6",
            "w-3/4",
            "w-full",
            "w-2/3",
          ].map((w, i) => (
            <div key={i} className={`h-2.5 rounded bg-muted ${w}`} />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {isOfficeDoc && doc.downloadUrl ? t("viewer.fauxOffice") : t("viewer.fauxUnavailable")}
      </p>
    </div>
  );
}
