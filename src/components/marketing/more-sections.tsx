"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Users,
  UserPlus,
  Eye,
  Sparkles,
  Mail,
  CreditCard,
  Lock,
  FileCheck,
  Shield,
  ArrowRight,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useScrollAnimation } from "./hero-section";

// AI Digest and Emergency Card features
export function MoreFeaturesSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("marketing.moreFeatures");

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* AI Daily Digest */}
          <Card
            className={cn(
              "p-8 lg:p-10 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent",
              "motion-safe:transition-all motion-safe:duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              {t("digest.title")}
            </h3>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              {t("digest.description")}
            </p>
            <div className="mt-6 p-4 rounded-xl bg-card border">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t("digest.sampleGreeting")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("digest.sampleBody")}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Emergency Card */}
          <Card
            className={cn(
              "p-8 lg:p-10 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent",
              "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <CreditCard className="h-7 w-7 text-accent" />
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              {t("emergency.title")}
            </h3>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              {t("emergency.description")}
            </p>
            <div className="mt-6 p-4 rounded-xl bg-card border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t("emergency.samplePerson")}</p>
                  <p className="text-xs text-muted-foreground">{t("emergency.sampleBlood")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-destructive font-medium">{t("emergency.allergies")}</p>
                  <p className="text-xs text-muted-foreground">{t("emergency.sampleAllergies")}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

// How it works section
const steps = [
  { number: "1", key: "create", icon: Users },
  { number: "2", key: "invite", icon: UserPlus },
  { number: "3", key: "view", icon: Eye },
] as const;

export function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("marketing.howItWorks");

  return (
    <section ref={ref} id="how-it-works" className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "text-center mb-12 sm:mb-16",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                "text-center",
                "motion-safe:transition-all motion-safe:duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-serif font-bold mb-6">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-2">{t(`steps.${step.key}.title`)}</h3>
              <p className="text-muted-foreground text-pretty">{t(`steps.${step.key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Trust & Security section
const trustFeatures = [
  { key: "encryption", icon: Lock },
  { key: "access", icon: Shield },
  { key: "audit", icon: FileCheck },
] as const;

export function TrustSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("marketing.trust");

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "text-center mb-12",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {trustFeatures.map((feature, index) => (
            <Card
              key={feature.key}
              className={cn(
                "text-center p-6",
                "motion-safe:transition-all motion-safe:duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t(`items.${feature.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`items.${feature.key}.description`)}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonial section
export function TestimonialSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("marketing.testimonial");

  return (
    <section ref={ref} className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card
          className={cn(
            "p-8 sm:p-12 text-center",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Quote className="h-10 w-10 text-primary/30 mx-auto mb-6" />
          <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl font-medium text-balance leading-relaxed">
            {t("quote")}
          </blockquote>
          <p className="mt-8 text-sm text-muted-foreground">{t("attribution")}</p>
        </Card>
      </div>
    </section>
  );
}

// Final CTA section
export function CtaSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("marketing.cta");
  const tc = useTranslations("common");

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "rounded-3xl bg-primary/5 border border-primary/10 p-8 sm:p-12 lg:p-16 text-center",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                {tc("getStartedFree")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline">
                {tc("learnMore")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
