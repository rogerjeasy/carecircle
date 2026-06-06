"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Users,
  Sparkles,
  Shield,
  Building2,
  Clock,
  Pill,
  CheckSquare,
  FileText,
  HeartPulse,
  Mail,
  Lock,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

// Pricing data
const MONTHLY_PRICES = {
  free: 0,
  plus: 12,
  teams: null, // Contact sales
};

const ANNUAL_PRICES = {
  free: 0,
  plus: 9, // $108/year = $9/mo (25% savings)
  teams: null,
};

const tiers = [
  {
    id: "free",
    name: "Free",
    description: "For families just getting started with coordinated care.",
    features: [
      { text: "One care circle", included: true },
      { text: "Shared care timeline", included: true },
      { text: "Medication tracking", included: true },
      { text: "Task management", included: true },
      { text: "Basic roles (3 types)", included: true },
      { text: "Mobile app access", included: true },
      { text: "AI Daily Digest", included: false },
      { text: "Ask CareCircle AI", included: false },
      { text: "Document vault", included: false },
      { text: "Advanced insights", included: false },
    ],
    cta: "Get started",
    ctaVariant: "outline" as const,
    ctaHref: "/sign-up",
    popular: false,
  },
  {
    id: "plus",
    name: "Plus",
    description: "For families who need more power and AI assistance.",
    features: [
      { text: "Multiple care circles", included: true },
      { text: "Shared care timeline", included: true },
      { text: "Medication tracking", included: true },
      { text: "Task management", included: true },
      { text: "All 6 role types", included: true },
      { text: "Mobile app access", included: true },
      { text: "AI Daily Digest", included: true },
      { text: "Ask CareCircle AI", included: true },
      { text: "Document vault (5GB)", included: true },
      { text: "Advanced insights", included: true },
    ],
    cta: "Start free trial",
    ctaVariant: "default" as const,
    ctaHref: "/sign-up",
    popular: true,
  },
  {
    id: "teams",
    name: "Care Teams",
    description: "For agencies, employers, and healthcare organizations.",
    features: [
      { text: "Unlimited care circles", included: true },
      { text: "Multi-family dashboard", included: true },
      { text: "Audit trail & compliance", included: true },
      { text: "SSO / SAML integration", included: true },
      { text: "Custom roles & permissions", included: true },
      { text: "API access", included: true },
      { text: "Priority support", included: true },
      { text: "Dedicated success manager", included: true },
      { text: "HIPAA BAA available", included: true },
      { text: "Custom onboarding", included: true },
    ],
    cta: "Contact sales",
    ctaVariant: "secondary" as const,
    ctaHref: "mailto:sales@carecircle.app",
    popular: false,
  },
];

// Feature comparison table data
const comparisonCategories = [
  {
    name: "Core Features",
    features: [
      { name: "Care circles", free: "1", plus: "Unlimited", teams: "Unlimited" },
      { name: "Team members per circle", free: "10", plus: "25", teams: "Unlimited" },
      { name: "Shared timeline", free: true, plus: true, teams: true },
      { name: "Medication tracking", free: true, plus: true, teams: true },
      { name: "Task management", free: true, plus: true, teams: true },
      { name: "Appointment calendar", free: true, plus: true, teams: true },
    ],
  },
  {
    name: "AI & Intelligence",
    features: [
      { name: "AI Daily Digest", free: false, plus: true, teams: true },
      { name: "Ask CareCircle AI", free: false, plus: true, teams: true },
      { name: "Smart reminders", free: "Basic", plus: "Advanced", teams: "Advanced" },
      { name: "Care insights", free: false, plus: true, teams: true },
    ],
  },
  {
    name: "Storage & Documents",
    features: [
      { name: "Document vault", free: false, plus: "5 GB", teams: "Unlimited" },
      { name: "Photo uploads", free: "100 MB", plus: "2 GB", teams: "Unlimited" },
      { name: "Export data", free: true, plus: true, teams: true },
    ],
  },
  {
    name: "Security & Compliance",
    features: [
      { name: "Role-based access", free: "3 roles", plus: "6 roles", teams: "Custom" },
      { name: "Audit trail", free: false, plus: "30 days", teams: "Unlimited" },
      { name: "SSO / SAML", free: false, plus: false, teams: true },
      { name: "HIPAA BAA", free: false, plus: false, teams: true },
      { name: "Data encryption", free: true, plus: true, teams: true },
    ],
  },
  {
    name: "Support",
    features: [
      { name: "Community support", free: true, plus: true, teams: true },
      { name: "Email support", free: false, plus: true, teams: true },
      { name: "Priority support", free: false, plus: false, teams: true },
      { name: "Dedicated success manager", free: false, plus: false, teams: true },
    ],
  },
];

// FAQ data
const faqs = [
  {
    question: "Can I switch plans later?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you will be charged the prorated difference. When you downgrade, your new rate will apply at the next billing cycle.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer: "Your data is never deleted. If you exceed the limits of your new plan (e.g., multiple circles on Free), you will still have read access but cannot add new content until you upgrade or reduce usage.",
  },
  {
    question: "Is there a free trial for Plus?",
    answer: "Yes! Plus comes with a 14-day free trial. No credit card required to start. You will get full access to all Plus features during the trial period.",
  },
  {
    question: "How does billing work for Care Teams?",
    answer: "Care Teams is billed annually based on the number of care circles and users. Contact our sales team for a custom quote tailored to your organization's needs.",
  },
  {
    question: "Is CareCircle HIPAA compliant?",
    answer: "CareCircle implements industry-standard security measures including encryption at rest and in transit. For organizations requiring a signed Business Associate Agreement (BAA), this is available on the Care Teams plan.",
  },
  {
    question: "Can I add family members for free?",
    answer: "Yes! All plans allow you to invite family members and caregivers to your care circles at no additional cost. The plan limits apply to the number of circles and features, not the number of people.",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = React.useState(true);

  const getPrice = (tierId: string) => {
    const prices = isAnnual ? ANNUAL_PRICES : MONTHLY_PRICES;
    return prices[tierId as keyof typeof prices];
  };

  const getSavings = (tierId: string) => {
    if (tierId === "free" || tierId === "teams") return null;
    const monthly = MONTHLY_PRICES[tierId as keyof typeof MONTHLY_PRICES];
    const annual = ANNUAL_PRICES[tierId as keyof typeof ANNUAL_PRICES];
    if (monthly === null || annual === null) return null;
    return Math.round(((monthly - annual) / monthly) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="motion-reduce:animate-none"
          >
            <Badge variant="secondary" className="mb-4">
              Simple, transparent pricing
            </Badge>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-balance">
              Choose the plan that fits{" "}
              <span className="text-primary">your family</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Start free, upgrade when you need more. All plans include core care coordination features.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-12">
              <span className={cn("text-sm font-medium", !isAnnual && "text-foreground", isAnnual && "text-muted-foreground")}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                aria-label="Toggle annual billing"
              />
              <span className={cn("text-sm font-medium", isAnnual && "text-foreground", !isAnnual && "text-muted-foreground")}>
                Annual
              </span>
              {isAnnual && (
                <Badge variant="success" className="ml-2">
                  Save 25%
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {tiers.map((tier, index) => {
              const price = getPrice(tier.id);
              const savings = getSavings(tier.id);

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="motion-reduce:animate-none h-full"
                >
                  <Card
                    className={cn(
                      "relative h-full flex flex-col",
                      tier.popular && "ring-2 ring-primary shadow-lg"
                    )}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-sm">
                          Most popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                      <CardDescription className="min-h-[40px]">
                        {tier.description}
                      </CardDescription>
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
                        {isAnnual && savings && (
                          <p className="text-sm text-success mt-1">
                            Save {savings}% with annual billing
                          </p>
                        )}
                        {tier.id === "teams" && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Billed annually
                          </p>
                        )}
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
                            <span className={cn("text-sm", !feature.included && "text-muted-foreground")}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4">
                      <Button
                        variant={tier.ctaVariant}
                        className="w-full"
                        size="lg"
                        asChild
                      >
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
        </section>

        {/* Feature Comparison Table */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Compare all features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A detailed breakdown of what is included in each plan.
            </p>
          </div>

          {/* Desktop/Tablet Table - hidden on phone */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold w-[40%]">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold w-[20%]">Free</th>
                  <th className="text-center py-4 px-4 font-semibold w-[20%]">
                    <span className="inline-flex items-center gap-2">
                      Plus
                      <Badge variant="default" className="text-xs">Popular</Badge>
                    </span>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold w-[20%]">Care Teams</th>
                </tr>
              </thead>
              <tbody>
                {comparisonCategories.map((category, catIndex) => (
                  <React.Fragment key={category.name}>
                    <tr className="bg-muted/50">
                      <td colSpan={4} className="py-3 px-4 font-semibold text-sm">
                        {category.name}
                      </td>
                    </tr>
                    {category.features.map((feature, featIndex) => (
                      <tr key={feature.name} className="border-b border-border/50">
                        <td className="py-3 px-4 text-sm">{feature.name}</td>
                        <td className="py-3 px-4 text-center">
                          <FeatureValue value={feature.free} />
                        </td>
                        <td className="py-3 px-4 text-center bg-primary/5">
                          <FeatureValue value={feature.plus} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <FeatureValue value={feature.teams} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards - visible only on phone */}
          <div className="sm:hidden space-y-6">
            {comparisonCategories.map((category) => (
              <Card key={category.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.features.map((feature) => (
                    <div key={feature.name} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <p className="font-medium text-sm mb-2">{feature.name}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">Free</p>
                          <FeatureValue value={feature.free} />
                        </div>
                        <div className="text-center bg-primary/5 rounded-md py-1">
                          <p className="text-muted-foreground mb-1">Plus</p>
                          <FeatureValue value={feature.plus} />
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">Teams</p>
                          <FeatureValue value={feature.teams} />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about CareCircle pricing.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="py-12 sm:py-12 text-center">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
                Ready to simplify care coordination?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join thousands of families who trust CareCircle. Start free, no credit card required.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/sign-up">
                  <Button size="lg">
                    Get started free
                  </Button>
                </Link>
                <Button variant="outline" size="lg" asChild>
                  <a href="mailto:sales@carecircle.app">Talk to sales</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

// Helper component for rendering feature values
function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-success mx-auto" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}
