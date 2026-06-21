"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Users,
  UserPlus,
  HeartHandshake,
  Globe,
  Shield,
  Lock,
  FileCheck,
  Eye,
  ArrowRight,
  Stethoscope,
  Home,
  Briefcase,
  Heart,
  UserCog,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { RemoteImage } from "@/components/marketing/remote-image";
import { SectionBackdrop } from "@/components/marketing/section-backdrop";
import { HOWITWORKS_IMG } from "@/components/marketing/images";

// Scroll animation hook
function useScrollAnimation() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Timeline step structure — text resolved from messages via the `key`.
const timelineSteps = [
  { number: 1, key: "create", icon: Users, color: "primary", image: HOWITWORKS_IMG.timeline.create },
  { number: 2, key: "invite", icon: UserPlus, color: "accent", image: HOWITWORKS_IMG.timeline.invite },
  { number: 3, key: "coordinate", icon: HeartHandshake, color: "success", image: HOWITWORKS_IMG.timeline.coordinate },
  { number: 4, key: "connect", icon: Globe, color: "info", image: HOWITWORKS_IMG.timeline.connect },
] as const;

// Role structure — text resolved from messages via the `key`.
const roles = [
  { key: "coordinator", icon: UserCog, color: "primary" },
  { key: "family", icon: Home, color: "accent" },
  { key: "professional", icon: Briefcase, color: "success" },
  { key: "clinician", icon: Stethoscope, color: "info" },
  { key: "recipient", icon: Heart, color: "warning" },
  { key: "readonly", icon: Eye, color: "muted" },
] as const;

// Security feature structure — text resolved from messages via the `key`.
const securityFeatures = [
  { key: "encryption", icon: Lock },
  { key: "rbac", icon: Shield },
  { key: "audit", icon: FileCheck },
  { key: "privacy", icon: Eye },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <MarketingHeader />
      <main>
        <EmotionalIntro />
        <TimelineSection />
        <RolesSection />
        <SecuritySection />
        <ClosingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

// Emotional intro section
function EmotionalIntro() {
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations("howItWorksPage.intro");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative isolate pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Background: a photo backdrop (legible in light & dark) under soft color shapes */}
      <SectionBackdrop src={HOWITWORKS_IMG.hero} from="left" opacityClass="opacity-30 dark:opacity-20" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <Badge
          variant="secondary"
          className={cn(
            "mb-6 inline-flex",
            "motion-safe:transition-all motion-safe:duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {t("badge")}
        </Badge>
        <h1
          className={cn(
            "font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1]",
            "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {t.rich("title", { hl: (chunks) => <span className="text-primary">{chunks}</span> })}
        </h1>
        <p
          className={cn(
            "mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty",
            "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {t("subtitle")}
          <span className="block mt-4 font-medium text-foreground">{t("subtitleEmphasis")}</span>
        </p>
      </div>
    </section>
  );
}

// Vertical timeline section
function TimelineSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />

          {/* Steps */}
          <div className="space-y-12 sm:space-y-16">
            {timelineSteps.map((step, index) => (
              <TimelineStep key={step.number} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineStep({ step, index }: { step: typeof timelineSteps[number]; index: number }) {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("howItWorksPage.timeline");
  const details = t.raw(`steps.${step.key}.details`) as string[];

  const colorClasses = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    success: "bg-success text-white",
    info: "bg-info text-white",
  };

  const ringColors = {
    primary: "ring-primary/20",
    accent: "ring-accent/20",
    success: "ring-success/20",
    info: "ring-info/20",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative pl-16 sm:pl-20",
        "motion-safe:transition-all motion-safe:duration-700",
        // Steps alternate their entrance: odd from the left, even from the right.
        isVisible
          ? "opacity-100 translate-x-0"
          : index % 2 === 0
            ? "opacity-0 -translate-x-16"
            : "opacity-0 translate-x-16"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Step number circle */}
      <div
        className={cn(
          "absolute left-0 top-0 z-10 h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center ring-4",
          colorClasses[step.color as keyof typeof colorClasses],
          ringColors[step.color as keyof typeof ringColors]
        )}
      >
        <step.icon className="h-5 w-5 sm:h-7 sm:w-7" />
      </div>

      {/* Content */}
      <Card className="overflow-hidden">
        <div className="relative overflow-hidden">
          <RemoteImage
            src={step.image}
            alt=""
            className="h-40 w-full object-cover sm:h-44"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        </div>
        <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            {t("stepLabel", { number: step.number })}
          </span>
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold mb-3">
          {t(`steps.${step.key}.title`)}
        </h3>
        <p className="text-muted-foreground text-pretty mb-6">
          {t(`steps.${step.key}.description`)}
        </p>

        {/* Details list */}
        <ul className="space-y-2">
          {details.map((detail) => (
            <li key={detail} className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
        </div>
      </Card>
    </div>
  );
}

// Roles section
function RolesSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("howItWorksPage.roles");

  return (
    <section ref={ref} className="relative isolate overflow-hidden py-20 sm:py-28">
      {/* Background photo that slides in from the left (legible in light & dark) */}
      <SectionBackdrop src={HOWITWORKS_IMG.rolesBg} from="left" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "text-center mb-12 sm:mb-16",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1.5 h-3 w-3" />
            {t("badge")}
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
        </div>

        {/* Roles grid - 3 col on lg, 2 col on md, 1 col on mobile */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role, index) => (
            <RoleCard key={role.key} role={role} index={index} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoleCard({
  role,
  index,
  isVisible,
}: {
  role: typeof roles[number];
  index: number;
  isVisible: boolean;
}) {
  const t = useTranslations("howItWorksPage.roles");
  const sees = t.raw(`items.${role.key}.sees`) as string[];

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card
      className={cn(
        "p-6 h-full flex flex-col",
        "motion-safe:transition-all motion-safe:duration-700",
        isVisible
          ? "opacity-100 translate-x-0"
          : index % 2 === 0
            ? "opacity-0 -translate-x-12"
            : "opacity-0 translate-x-12"
      )}
      style={{ transitionDelay: `${index * 75}ms` }}
    >
      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center mb-4",
          colorClasses[role.color as keyof typeof colorClasses]
        )}
      >
        <role.icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{t(`items.${role.key}.title`)}</h3>
      <p className="text-sm text-muted-foreground mb-4 flex-1">
        {t(`items.${role.key}.description`)}
      </p>
      <div className="pt-4 border-t">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {t("whatTheySee")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sees.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Security section
function SecuritySection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("howItWorksPage.security");

  return (
    <section ref={ref} className="relative isolate overflow-hidden py-20 sm:py-28 bg-muted/30">
      {/* Background photo that slides in from the right (legible in light & dark) */}
      <SectionBackdrop src={HOWITWORKS_IMG.securityBg} from="right" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "text-center mb-12 sm:mb-16",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <Badge variant="secondary" className="mb-4">
            <Shield className="mr-1.5 h-3 w-3" />
            {t("badge")}
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
        </div>

        {/* Security features grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {securityFeatures.map((feature, index) => (
            <Card
              key={feature.key}
              className={cn(
                "p-6 text-center",
                "motion-safe:transition-all motion-safe:duration-700",
                isVisible
                  ? "opacity-100 translate-x-0"
                  : index % 2 === 0
                    ? "opacity-0 translate-x-12"
                    : "opacity-0 -translate-x-12"
              )}
              style={{ transitionDelay: `${index * 75}ms` }}
            >
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t(`items.${feature.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`items.${feature.key}.description`)}</p>
            </Card>
          ))}
        </div>

        {/* Trust badges */}
        <div
          className={cn(
            "mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10",
            "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">{t("badges.hipaa")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <span className="text-sm font-medium">{t("badges.soc2")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="h-5 w-5" />
            <span className="text-sm font-medium">{t("badges.gdpr")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Closing CTA
function ClosingCta() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("howItWorksPage.cta");

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "relative isolate overflow-hidden rounded-3xl border border-primary/20 p-8 sm:p-12 lg:p-16 text-center",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <RemoteImage
            src={HOWITWORKS_IMG.cta}
            alt=""
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/95 via-primary/90 to-primary/75" />
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-primary-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/90 max-w-xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" variant="accent" className="gap-2">
                {t("getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {t("viewPricing")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
