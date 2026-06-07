"use client";

import { FileImage, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryMeta } from "./data";
import type { DocumentItem } from "./types";

const KIND_LABEL: Record<DocumentItem["kind"], string> = { pdf: "PDF", image: "IMG", doc: "DOC" };

/** The card's thumbnail: an image preview when available, otherwise a tinted file-type icon. */
export function FileThumb({ doc, className }: { doc: DocumentItem; className?: string }) {
  if (doc.kind === "image" && doc.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.previewUrl}
        alt=""
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  const cat = categoryMeta[doc.category];
  const Icon = doc.kind === "image" ? FileImage : FileText;
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-1.5", cat.tint, className)}>
      <Icon className="h-8 w-8" aria-hidden="true" />
      <span className="text-[10px] font-semibold tracking-wide opacity-80">{KIND_LABEL[doc.kind]}</span>
    </div>
  );
}
