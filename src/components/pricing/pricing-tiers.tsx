"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ANNUAL_PRICES, MONTHLY_PRICES, tiers } from "./data";
import type { TierId } from "./types";

function getPrice(tierId: TierId, isAnnual: boolean) {
  return (isAnnual ? ANNUAL_PRICES : MONTHLY_PRICES)[tierId];
}

function getSavings(tierId: TierId) {
  const monthly = MONTHLY_PRICES[tierId];
  const annual = ANNUAL_PRICES[tierId];
  if (monthly === null || annual === null || monthly === 0) return null;
  return Math.round(((monthly - annual) / monthly) * 100);
}

/** The three pricing cards, reacting to the monthly/annual toggle. */
export function PricingTiers({ isAnnual }: { isAnnual: boolean }) {
  return (
    <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
      {tiers.map((tier, index) => {
        const price = getPrice(tier.id, isAnnual);
        const savings = getSavings(tier.id);

        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="motion-reduce:animate-none h-full"
          >
            <Card className={cn("relative h-full flex flex-col", tier.popular && "ring-2 ring-primary shadow-lg")}>
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">Most popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription className="min-h-[40px]">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                {/* Price */}
                <div className="text-center mb-6">
                  {price !== null ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">Custom pricing</div>
                  )}
                  {isAnnual && savings && <p className="text-sm text-success mt-1">Save {savings}% with annual billing</p>}
                  {tier.id === "teams" && <p className="text-sm text-muted-foreground mt-1">Billed annually</p>}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                      )}
                      <span className={cn("text-sm", !feature.included && "text-muted-foreground")}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                <Button variant={tier.ctaVariant} className="w-full" size="lg" asChild>
                  {tier.ctaHref.startsWith("mailto:") ? (
                    <a href={tier.ctaHref}>{tier.cta}</a>
                  ) : (
                    <Link href={tier.ctaHref}>{tier.cta}</Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
