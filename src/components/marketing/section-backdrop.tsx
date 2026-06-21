"use client";

import { cn } from "@/lib/utils";
import { RemoteImage } from "./remote-image";

/**
 * A decorative section background photo that stays legible in BOTH light and dark mode.
 *
 * The photo sits under a theme-aware scrim built from the `background` token, so it adapts to the
 * active theme automatically. The scrim is strongest at the top and bottom — protecting the
 * section heading and the seam between sections — and lightest through the middle, where the
 * image reads clearly behind the cards. It slides in once from the chosen side.
 *
 * Decorative only: empty alt + aria-hidden. Text always carries the meaning.
 */
export function SectionBackdrop({
  src,
  from = "left",
  // Tuned so the image is clearly visible without washing out text. Dark mode runs a touch
  // lighter because a photo reads more strongly against the near-black background.
  opacityClass = "opacity-[0.45] dark:opacity-30",
}: {
  src: string;
  from?: "left" | "right";
  opacityClass?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <RemoteImage
        src={src}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          opacityClass,
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000",
          from === "right"
            ? "motion-safe:slide-in-from-right-16"
            : "motion-safe:slide-in-from-left-16"
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/25 to-background" />
    </div>
  );
}
