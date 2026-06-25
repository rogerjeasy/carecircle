"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RemoteImage } from "@/components/marketing/remote-image";
import { ONBOARDING_IMG } from "@/components/marketing/images";

/**
 * The photographic backdrop behind the first-run onboarding card.
 *
 * It slowly crossfades through a small set of warm, on-context photos ([[ONBOARDING_IMG]]) — family
 * coming together, coordinating, staying close across distance — each drifting gently (Ken Burns)
 * so the screen feels alive but never busy. A theme-aware scrim keeps everything calm and legible
 * in both light and dark mode, with the card reading clearly on top.
 *
 * Decorative only (aria-hidden, empty alts): the text always carries the meaning. Motion is
 * disabled for `prefers-reduced-motion` — the crossfade interval stops here and the CSS drift is
 * neutralized by the global reduced-motion rule, so a single still photo is shown.
 */
const ROTATE_MS = 6500;

export function OnboardingBackdrop() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (ONBOARDING_IMG.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % ONBOARDING_IMG.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {ONBOARDING_IMG.map((src, i) => (
        <div
          key={src}
          className={cn(
            "absolute inset-0 transition-opacity duration-[1800ms] ease-in-out",
            i === active ? "opacity-100" : "opacity-0",
          )}
        >
          <RemoteImage
            src={src}
            alt=""
            className="h-full w-full object-cover opacity-60 dark:opacity-40 animate-onboarding-kenburns"
          />
        </div>
      ))}

      {/* Theme-aware scrim — calm at the top/bottom, photo reads through the middle behind the card. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/35 to-background" />
      {/* Faint evergreen wash keeps the photos on-palette in both themes. */}
      <div className="absolute inset-0 bg-primary/5" />
    </div>
  );
}
