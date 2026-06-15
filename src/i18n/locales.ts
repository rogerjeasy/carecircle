/**
 * Single source of truth for the languages Kintwadi supports.
 *
 * Adding a new language is two steps:
 *   1. add its code here (and its autonym in `localeNames`)
 *   2. drop a `messages/<code>.json` file
 * No other code changes are required — the request config, provider, switcher and `<html dir>`
 * all read from this list.
 */
export const locales = ["en", "fr", "de", "es", "it", "ar", "he"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Right-to-left languages — used to set `<html dir="rtl">` and mirror the layout. */
export const rtlLocales = new Set<Locale>(["ar", "he"]);

/** Display names shown in their OWN language (autonyms), for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  ar: "العربية",
  he: "עברית",
};

/** Cookie that persists the visitor's chosen language across requests (1 year). */
export const LOCALE_COOKIE = "KINTWADI_LOCALE";

/** Runtime + TypeScript guard: narrows an arbitrary string to a supported Locale. */
export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}
