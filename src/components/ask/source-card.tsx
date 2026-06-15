"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { sourceIcon } from "./data";
import type { SourceRef } from "./types";

/** A small linked card citing a record the answer was grounded in. Reflows 2-up on wide screens. */
export function SourceCards({ sources }: { sources: SourceRef[] }) {
  const t = useTranslations("ask");
  if (sources.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("sources")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sources.map((s) => {
          const Icon = sourceIcon[s.type];
          return (
            <Link
              key={s.id}
              href={s.href}
              className="group flex min-w-0 items-start gap-2.5 rounded-xl border bg-card p-2.5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="min-w-0 truncate text-sm font-medium">{s.label}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                </span>
                <span className="block truncate text-xs text-muted-foreground">{s.detail}</span>
                <span className="block truncate text-xs text-muted-foreground/80">{s.time}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
