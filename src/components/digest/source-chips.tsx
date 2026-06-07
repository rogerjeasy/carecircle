"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { sourceIcon } from "./data";
import type { SourceMoment } from "./types";

/** "Source moments" chips that link back to the timeline events the digest summarized. */
export function SourceChips({ sources }: { sources: SourceMoment[] }) {
  if (sources.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Source moments
      </p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((s) => {
          const Icon = sourceIcon[s.type];
          return (
            <li key={s.id} className="min-w-0">
              <Link
                href="/timeline"
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-muted",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                )}
                title={`${s.label} · ${s.time}`}
              >
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 truncate font-medium">{s.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{s.time}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
