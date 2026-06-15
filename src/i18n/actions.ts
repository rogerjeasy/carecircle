"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/**
 * Persist the visitor's chosen language. Called from the language switcher.
 *
 * This sets a plain preference cookie (no PII, not security-sensitive) for 1 year. The caller is
 * responsible for refreshing the route afterwards so server components re-render in the new locale.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return; // ignore anything not in our supported set

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}
