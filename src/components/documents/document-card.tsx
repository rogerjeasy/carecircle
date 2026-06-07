"use client";

import {
  Download,
  Eye,
  Lock,
  MoreVertical,
  Pencil,
  ShieldCheck,
  Siren,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileThumb } from "./file-thumb";
import { categoryMeta, sensitivityMeta } from "./data";
import { expiryInfo, firstName, uploadedLabel } from "./utils";
import type { DocumentItem } from "./types";

export type DocAction = "preview" | "download" | "emergency" | "rename" | "delete";

export interface DocumentCardProps {
  doc: DocumentItem;
  canManage: boolean;
  now: Date;
  onAction: (action: DocAction) => void;
}

/** A document card: thumbnail, title, category, sensitivity lock, uploader, expiry, overflow menu. */
export function DocumentCard({ doc, canManage, now, onAction }: DocumentCardProps) {
  const cat = categoryMeta[doc.category];
  const CatIcon = cat.icon;
  const sens = sensitivityMeta[doc.sensitivity];
  const expiry = expiryInfo(doc, now);

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      {/* Thumbnail (click to preview) */}
      <button
        type="button"
        onClick={() => onAction("preview")}
        aria-label={`Preview ${doc.title}`}
        className="relative block h-28 w-full overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:h-32"
      >
        <FileThumb doc={doc} />
        {doc.sensitivity !== "standard" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow-sm",
                  doc.sensitivity === "restricted" ? "bg-background text-primary" : "bg-background/90 text-muted-foreground"
                )}
                aria-label={sens.label}
              >
                {doc.sensitivity === "restricted" ? (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">{sens.note}</TooltipContent>
          </Tooltip>
        )}
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-1.5">
          <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug" title={doc.title}>
            {doc.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7 shrink-0" aria-label={`Options for ${doc.title}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onAction("preview")}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("download")}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => onAction("emergency")}>
                <Siren className="mr-2 h-4 w-4" />
                {doc.onEmergencyCard ? "Remove from emergency card" : "Share to emergency card"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canManage} onClick={() => onAction("rename")}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                onClick={() => onAction("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("gap-1 border-transparent", cat.tint)}>
            <CatIcon className="h-3 w-3" aria-hidden="true" />
            {cat.label}
          </Badge>
          {doc.onEmergencyCard && (
            <Badge variant="outline" className="gap-1 border-transparent bg-destructive/10 text-destructive">
              <Siren className="h-3 w-3" aria-hidden="true" />
              Emergency
            </Badge>
          )}
          {expiry.state !== "none" && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                expiry.state === "expired"
                  ? "bg-destructive/10 text-destructive"
                  : expiry.state === "soon"
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {expiry.label}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarFallback className={cn("text-[9px] font-semibold", doc.uploaderColor)}>
              {doc.uploaderInitials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate">
            {firstName(doc.uploaderName)} · {uploadedLabel(doc.uploadedAt)}
          </span>
          <span className="ml-auto shrink-0 tabular-nums">{doc.size}</span>
        </div>
      </div>
    </Card>
  );
}
