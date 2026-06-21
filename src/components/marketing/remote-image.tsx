"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A remote (Unsplash) image with a self-hosted fallback chain, so a photo never disappears:
 *
 *   1. the remote CDN URL — fast and format-optimized; used whenever Unsplash is reachable.
 *   2. a locally-saved copy at `/img/unsplash/<id>.jpg` — used automatically if the remote
 *      fails to load (offline, network-blocked, or Unsplash down). The originals are committed
 *      under `public/img/unsplash/`.
 *   3. a tinted gradient — only if even the local copy is missing, so a broken-image icon
 *      never appears.
 *
 * Convention: every Unsplash url here is `…/photo-<id>?…`, and its committed copy is named
 * `<id>.jpg`. When you add a NEW remote image, also save it with:
 *   curl -fsS "https://images.unsplash.com/photo-<id>?w=1600&q=80&fm=jpg&fit=crop" \
 *     -o public/img/unsplash/<id>.jpg
 *
 * Decorative by default (empty alt).
 */

/** Map a remote Unsplash url to its committed local copy, by photo id. */
function localCopy(src: string): string | null {
  const m = /\/photo-([^/?]+)/.exec(src);
  return m ? `/img/unsplash/${m[1]}.jpg` : null;
}

export function RemoteImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const local = React.useMemo(() => localCopy(src), [src]);
  // Walk remote -> local -> failed. Reset whenever the src prop changes.
  const [stage, setStage] = React.useState<"remote" | "local" | "failed">("remote");
  const ref = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => setStage("remote"), [src]);

  const advance = React.useCallback(
    () => setStage((s) => (s === "remote" && local ? "local" : "failed")),
    [local]
  );

  // The remote image can error BEFORE React hydrates and attaches `onError` (SSR race), so the
  // error event is missed. After each stage renders, check whether the current image already
  // failed (`complete` with no intrinsic size) and advance the fallback if so.
  React.useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) advance();
  }, [stage, src, advance]);

  const current = stage === "remote" ? src : stage === "local" ? local : null;

  if (!current) {
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
    <img
      ref={ref}
      src={current}
      alt={alt}
      loading="lazy"
      onError={advance}
      className={className}
    />
  );
}
