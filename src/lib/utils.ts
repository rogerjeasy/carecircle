import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 🔒 Sanitize a post-auth redirect target (e.g. `?callbackUrl=` on /sign-in) against open
 * redirects: only a same-origin RELATIVE path is honored. `https://evil.example`,
 * protocol-relative `//evil.example`, backslash tricks (`/\evil.example`, which browsers
 * normalize to `//`), and schemes like `javascript:` all return null — callers fall back to
 * their own default landing page.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  // Must be a relative path: exactly one leading "/", not followed by "/" or "\".
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;
  return value;
}
