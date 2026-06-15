"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** The "generating…" state shown while the digest is being written. */
export function DigestGenerating() {
  const t = useTranslations("digest");
  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary motion-safe:animate-pulse" aria-hidden="true" />
          <span aria-live="polite">{t("writing")}</span>
        </div>
        <Skeleton className="h-7 w-2/3" />
        <div className="space-y-2.5">
          {["w-full", "w-full", "w-11/12", "w-5/6"].map((w, i) => (
            <Skeleton key={`a-${i}`} className={`h-3.5 ${w}`} />
          ))}
        </div>
        <div className="space-y-2.5 pt-1">
          {["w-full", "w-10/12", "w-3/4"].map((w, i) => (
            <Skeleton key={`b-${i}`} className={`h-3.5 ${w}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
