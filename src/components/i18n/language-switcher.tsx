"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames, type Locale } from "@/i18n/locales";

/**
 * Drop-in language picker. Writes the chosen locale to the KINTWADI_LOCALE cookie via a server
 * action, then refreshes the route so every server component re-renders in the new language and
 * the root layout flips `<html lang/dir>` (incl. RTL for Arabic/Hebrew).
 *
 * Place it anywhere — top bar, settings, footer. It reads the current locale from context, so it
 * needs no props.
 */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function onChange(next: string) {
    startTransition(async () => {
      await setLocale(next as Locale);
      router.refresh();
    });
  }

  return (
    <Select value={active} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-auto gap-2" aria-label={t("label")}>
        <Languages className="size-4 shrink-0 opacity-70" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
