import type { Locale } from "@/i18n/locales";
import type messages from "../messages/en.json";

/**
 * Wires next-intl into TypeScript so `t("dashboard.title")` is autocompleted and a typo or a key
 * missing from en.json is a compile error. `en.json` is the canonical key set; other locales just
 * need to mirror its shape.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
