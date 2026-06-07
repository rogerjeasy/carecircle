"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A remote (Unsplash) image that gracefully falls back to a tinted gradient if it fails to load,
 * so a missing photo never shows a broken-image icon. Decorative by default (empty alt).
 */
export function RemoteImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div
        className={cn("bg-gradient-to-br from-primary/15 via-accent/10 to-info/15", className)}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}
