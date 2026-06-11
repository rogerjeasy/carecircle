"use client";

import * as React from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingHero } from "./pricing-hero";
import { PricingTiers } from "./pricing-tiers";
import { ComparisonTable } from "./comparison-table";
import { PricingFaq } from "./pricing-faq";
import { PricingCta } from "./pricing-cta";

export function PricingScreen() {
  const [isAnnual, setIsAnnual] = React.useState(true);

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
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Compare all features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A detailed breakdown of what is included in each plan.
            </p>
          </div>
          <ComparisonTable />
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know about Kintwadi pricing.</p>
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
