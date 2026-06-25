"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageMenu } from "@/components/i18n/language-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/pricing", key: "pricing" },
  { href: "/about", key: "about" },
] as const;

export function MarketingHeader() {
  const t = useTranslations();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-lg border-b shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Users className="h-5 w-5" />
          </div>
          <span className="font-serif text-xl font-semibold">Kintwadi</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(`nav.${link.key}`)}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageMenu />
          <ThemeToggle />
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              {t("common.signIn")}
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">{t("common.getStartedFree")}</Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageMenu />
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("common.openMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  Kintwadi
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`nav.${link.key}`)}
                  </Link>
                ))}
                <div className="mt-6 flex flex-col gap-3">
                  <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t("common.signIn")}
                    </Button>
                  </Link>
                  <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">{t("common.getStartedFree")}</Button>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
