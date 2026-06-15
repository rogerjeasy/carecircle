"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  AlertTriangle,
  Heart,
  ArrowRight,
  Clock,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useScrollAnimation } from "./hero-section";

const problems = [
  { key: "chat", icon: MessageSquare },
  { key: "meds", icon: AlertTriangle },
  { key: "guilt", icon: Heart },
] as const;

export function ProblemSolutionSection() {
  const { ref, isVisible } = useScrollAnimation();
  const t = useTranslations("marketing.problems");

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "text-center mb-12 sm:mb-16",
            "motion-safe:transition-all motion-safe:duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem, index) => (
            <ProblemCard
              key={problem.key}
              icon={problem.icon}
              title={t(`items.${problem.key}.title`)}
              description={t(`items.${problem.key}.description`)}
              solution={t(`items.${problem.key}.solution`)}
              delay={index * 100}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  icon: Icon,
  title,
  description,
  solution,
  delay,
  isVisible,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  solution: string;
  delay: number;
  isVisible: boolean;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden",
        "motion-safe:transition-all motion-safe:duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <CardHeader>
        <div className="mb-4 h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon className="h-6 w-6 text-destructive group-hover:text-primary transition-colors" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2 text-primary">
          <ArrowRight className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{solution}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Feature highlights section with alternating layout
const features = [
  { key: "timeline", icon: Clock, image: "timeline" },
  { key: "medications", icon: Shield, image: "medications" },
  { key: "roles", icon: Users, image: "roles" },
] as const;

export function FeaturesSection() {
  const t = useTranslations("marketing.features");
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureRow
              key={feature.key}
              icon={feature.icon}
              image={feature.image}
              title={t(`items.${feature.key}.title`)}
              description={t(`items.${feature.key}.description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  image: string;
}) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <Card
      ref={ref}
      className={cn(
        "p-8 sm:p-10 flex flex-col",
        "motion-safe:transition-all motion-safe:duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="font-serif text-2xl sm:text-3xl font-bold">{title}</h3>
      <p className="mt-4 text-lg text-muted-foreground text-pretty">{description}</p>
    </Card>
  );
}
