"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const productLinks = [
  { href: "/how-it-works", key: "features" },
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/pricing", key: "pricing" },
  { href: "/dashboard", key: "dashboard" },
  { href: "/style-guide", key: "designSystem" },
] as const;

const companyLinks = [
  { href: "/about", key: "about" },
  { href: "/careers", key: "careers" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

const legalLinks = [
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/security", key: "security" },
  { href: "/hipaa", key: "hipaa" },
] as const;

export function MarketingFooter() {
  const t = useTranslations("marketing.footer");
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-5 w-5" />
              </div>
              <span className="font-serif text-xl font-semibold">Kintwadi</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              {t("tagline")}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <ThemeToggle />
              {/* Real, working language picker (was a static "English" placeholder). Available to
                  logged-out visitors too — locale persists via the KINTWADI_LOCALE cookie. */}
              <LanguageSwitcher />
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">{t("product")}</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">{t("company")}</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">{t("legal")}</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("rights", { year: String(new Date().getFullYear()) })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}
