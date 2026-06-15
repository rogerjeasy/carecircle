import * as React from "react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { RemoteImage } from "@/components/marketing/remote-image";

export const legalImg = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

/** Shared chrome + hero for the legal / trust pages (Privacy, Terms, Security, HIPAA). */
export async function LegalLayout({
  eyebrow,
  title,
  subtitle,
  updated,
  heroImage,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  updated?: string;
  heroImage?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("legal");
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main className="overflow-x-hidden pb-20 pt-28 sm:pt-32">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
            <Badge variant="secondary" className="mb-4">
              {eyebrow}
            </Badge>
            <h1 className="text-balance font-serif text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            {subtitle && <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">{subtitle}</p>}
            {updated && <p className="mt-3 text-sm text-muted-foreground">{t("lastUpdated", { date: updated })}</p>}
          </div>

          {heroImage && (
            <RemoteImage
              src={heroImage}
              alt=""
              className="mt-8 h-44 w-full rounded-2xl border object-cover sm:h-56 md:h-64"
            />
          )}
        </section>

        {/* Content */}
        <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">{children}</div>

          <p className="mt-12 rounded-xl border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            {t("disclaimer")}
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

/** A titled legal section. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-pretty leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
