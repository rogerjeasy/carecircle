"use client";

import { Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { categoryMeta } from "./data";
import type { DocumentItem } from "./types";

/**
 * The RBAC placeholder shown to restricted roles in place of a restricted document's contents.
 * The category is still visible (so the gap is understandable) but nothing sensitive leaks.
 */
export function LockedCard({ doc }: { doc: DocumentItem }) {
  const cat = categoryMeta[doc.category];
  return (
    <Card className="flex h-full flex-col overflow-hidden border-dashed p-0">
      <div className="flex h-28 w-full items-center justify-center bg-muted/40 sm:h-32">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-sm font-semibold leading-snug text-muted-foreground">Restricted document</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("gap-1 border-transparent opacity-70", cat.tint)}>
            {cat.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Visible to coordinators.</p>
        <div className="mt-auto flex items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">Restricted</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Why is this restricted?"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[14rem]">
              Access is enforced in the database — not just hidden here.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
