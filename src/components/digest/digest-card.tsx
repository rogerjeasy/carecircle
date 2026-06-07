"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { Digest } from "./types";

/**
 * The digest prose: a warm headline + 2–3 paragraphs. On mount each block fades/slides in with a
 * gentle stagger (a tasteful stand-in for "typing"), unless reduced motion is preferred.
 */
export function DigestCard({ digest, reduced }: { digest: Digest; reduced: boolean }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-7">
        <h2
          className={cn(
            "font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl",
            !reduced && "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
          )}
        >
          {digest.headline} <span aria-hidden="true">{digest.emoji}</span>
        </h2>
        <div className="mt-4 space-y-4">
          {digest.paragraphs.map((p, i) => (
            <p
              key={i}
              className={cn(
                "text-pretty leading-relaxed text-foreground/90",
                !reduced && "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
              )}
              style={reduced ? undefined : { animationDelay: `${150 + i * 220}ms`, animationFillMode: "backwards" }}
            >
              {p}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
