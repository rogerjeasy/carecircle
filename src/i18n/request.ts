import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, locales, type Locale } from "./locales";

/**
 * Per-request locale resolution for next-intl, WITHOUT URL routing.
 *
 * We deliberately do not use `/<locale>/...` path prefixes: almost the entire translatable
 * surface lives behind auth in `src/app/(app)/` (no SEO value in localized URLs), and prefixing
 * would force every page under `[locale]/` and rewrite the fail-closed allowlist in `proxy.ts`.
 * Instead the active language is a cookie, resolved here in this priority order:
 *   1. the KINTWADI_LOCALE cookie (the user's explicit choice via the switcher)
 *   2. the browser's Accept-Language header (best first-visit guess)
 *   3. the default locale (English)
 */
function pickFromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  // e.g. "fr-CH,fr;q=0.9,en;q=0.8" -> try each base language ("fr", "en") in order
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    const base = tag?.split("-")[0];
    if (isLocale(base)) return base;
  }
  return undefined;
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("KINTWADI_LOCALE")?.value;

  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : pickFromAcceptLanguage((await headers()).get("accept-language")) ?? defaultLocale;

  // Loaded server-side only; the JSON never ships to the client except via the provider below.
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return { locale, messages };
});

export { locales };
