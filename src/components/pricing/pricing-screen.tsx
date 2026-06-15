"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingHero } from "./pricing-hero";
import { PricingTiers } from "./pricing-tiers";
import { ComparisonTable } from "./comparison-table";
import { PricingFaq } from "./pricing-faq";
import { PricingCta } from "./pricing-cta";

export function PricingScreen() {
  const [isAnnual, setIsAnnual] = React.useState(true);
  const t = useTranslations("pricing");

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main className="pt-24 pb-16">
        {/* Hero + pricing cards */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <PricingHero isAnnual={isAnnual} onIsAnnualChange={setIsAnnual} />
          <PricingTiers isAnnual={isAnnual} />
        </section>

        {/* Feature comparison */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">{t("comparison.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("comparison.subtitle")}</p>
          </div>
          <ComparisonTable />
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">{t("faq.title")}</h2>
            <p className="text-muted-foreground">{t("faq.subtitle")}</p>
          </div>
          <PricingFaq />
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
          <PricingCta />
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
