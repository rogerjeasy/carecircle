"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames, type Locale } from "@/i18n/locales";

/**
 * Icon-only language picker — a single globe/Languages button that opens a menu of autonyms.
 * Same behaviour as {@link LanguageSwitcher} (writes the KINTWADI_LOCALE cookie via a server
 * action, then refreshes so server components re-render and `<html lang/dir>` flips, incl. RTL),
 * but collapses to one 44px touch target so it sits cleanly beside the theme toggle in the header.
 */
export function LanguageMenu({ className }: { className?: string }) {
  const t = useTranslations("language");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function onSelect(next: Locale) {
    if (next === active) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("label")}
          disabled={isPending}
          className={className}
        >
          <Languages className="h-5 w-5 motion-reduce:transition-none" aria-hidden />
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => onSelect(locale)}
            className="gap-2"
            aria-current={locale === active ? "true" : undefined}
          >
            <Check
              className={cn(
                "size-4 shrink-0",
                locale === active ? "opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate">{localeNames[locale]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
