import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Kintwadi brand mark — a single source of truth so the logo is identical everywhere it
 * appears (marketing header/footer, auth screens, invite, onboarding, admin, style guide).
 *
 * It renders ONLY the mark + wordmark; callers keep their own wrapper (a `<Link href="/">` for
 * clickable logos, a plain `<div>` for static ones), matching the existing markup. If the wrapper
 * has the `group` class, the mark gets the same gentle hover-lift as the homepage header.
 */
const SIZES = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-lg" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-xl" },
  lg: { box: "h-10 w-10", icon: "h-5 w-5", text: "text-xl" },
} as const;

export function BrandLogo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: keyof typeof SIZES;
  /** Hide the "Kintwadi" wordmark and show the mark alone (e.g. very tight headers). */
  showWordmark?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105 motion-reduce:transition-none",
          s.box
        )}
      >
        <Users className={s.icon} aria-hidden />
      </span>
      {showWordmark && (
        <span className={cn("truncate font-serif font-semibold", s.text)}>
          Kintwadi
        </span>
      )}
    </span>
  );
}
