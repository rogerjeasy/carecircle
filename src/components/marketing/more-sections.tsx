"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
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
import { RemoteImage } from "./remote-image";
import { MARKETING_IMG } from "./images";

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
              "group flex flex-col overflow-hidden border-primary/20",
              "motion-safe:transition-all motion-safe:duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="relative overflow-hidden">
              <RemoteImage
                src={MARKETING_IMG.digest}
                alt=""
                className="h-44 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 sm:h-52"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/15 to-transparent" />
              <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/90 text-primary shadow-sm ring-1 ring-border/60 backdrop-blur">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-1 flex-col bg-gradient-to-br from-primary/5 to-transparent p-8 lg:p-10">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                {t("digest.title")}
              </h3>
              <p className="mt-4 text-lg text-muted-foreground text-pretty">
                {t("digest.description")}
              </p>
              <div className="mt-6 p-4 rounded-xl bg-card border">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-sm">{t("digest.sampleGreeting")}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("digest.sampleBody")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Emergency Card */}
          <Card
            className={cn(
              "group flex flex-col overflow-hidden border-accent/20",
              "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="relative overflow-hidden">
              <RemoteImage
                src={MARKETING_IMG.emergency}
                alt=""
                className="h-44 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 sm:h-52"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/15 to-transparent" />
              <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/90 text-accent shadow-sm ring-1 ring-border/60 backdrop-blur">
                <CreditCard className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-1 flex-col bg-gradient-to-br from-accent/5 to-transparent p-8 lg:p-10">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                {t("emergency.title")}
              </h3>
              <p className="mt-4 text-lg text-muted-foreground text-pretty">
                {t("emergency.description")}
              </p>
              <div className="mt-6 p-4 rounded-xl bg-card border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t("emergency.samplePerson")}</p>
                    <p className="text-xs text-muted-foreground">{t("emergency.sampleBlood")}</p>
                  </div>
                  <div className="text-right min-w-0">
                    <p className="text-xs text-destructive font-medium">{t("emergency.allergies")}</p>
                    <p className="text-xs text-muted-foreground truncate">{t("emergency.sampleAllergies")}</p>
                  </div>
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
  { number: "1", key: "create", image: MARKETING_IMG.howItWorks.create },
  { number: "2", key: "invite", image: MARKETING_IMG.howItWorks.invite },
  { number: "3", key: "view", image: MARKETING_IMG.howItWorks.view },
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
              <div className="relative mx-auto mb-6 h-24 w-24">
                <RemoteImage
                  src={step.image}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/10"
                />
                <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary font-serif text-lg font-bold text-primary-foreground ring-4 ring-background">
                  {step.number}
                </span>
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
  { key: "encryption", icon: Lock, image: MARKETING_IMG.trust.encryption },
  { key: "access", icon: Shield, image: MARKETING_IMG.trust.access },
  { key: "audit", icon: FileCheck, image: MARKETING_IMG.trust.audit },
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
                "group flex flex-col overflow-hidden",
                "motion-safe:transition-all motion-safe:duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative overflow-hidden">
                <RemoteImage
                  src={feature.image}
                  alt=""
                  className="h-40 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/15 to-transparent" />
                <div className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-xl bg-background/90 text-primary shadow-sm ring-1 ring-border/60 backdrop-blur">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-semibold">{t(`items.${feature.key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`items.${feature.key}.description`)}</p>
              </div>
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
            "relative overflow-hidden p-8 sm:p-12 text-center",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Faint decorative texture — a desk of family photos */}
          <RemoteImage
            src={MARKETING_IMG.testimonial}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]"
          />
          <div className="relative">
            <Quote className="h-10 w-10 text-primary/30 mx-auto mb-6" aria-hidden="true" />
            <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl font-medium text-balance leading-relaxed">
              {t("quote")}
            </blockquote>
            <p className="mt-8 text-sm text-muted-foreground">{t("attribution")}</p>
          </div>
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
            "relative overflow-hidden rounded-3xl border border-primary/20 p-8 sm:p-12 lg:p-16 text-center",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Warm full-bleed photo under a teal scrim — keeps white text at AA contrast */}
          <RemoteImage
            src={MARKETING_IMG.cta}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-primary/75" />
          <div className="relative">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-primary-foreground">
              {t("heading")}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/90 max-w-xl mx-auto text-pretty">
              {t("subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" variant="accent" className="gap-2">
                  {tc("getStartedFree")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  {tc("learnMore")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
