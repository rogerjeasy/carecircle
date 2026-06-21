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
import { RemoteImage } from "./remote-image";
import { MARKETING_IMG } from "./images";

const problems = [
  { key: "chat", icon: MessageSquare, image: MARKETING_IMG.problems.chat },
  { key: "meds", icon: AlertTriangle, image: MARKETING_IMG.problems.meds },
  { key: "guilt", icon: Heart, image: MARKETING_IMG.problems.guilt },
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
              image={problem.image}
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
  image,
  title,
  description,
  solution,
  delay,
  isVisible,
}: {
  icon: React.ElementType;
  image: string;
  title: string;
  description: string;
  solution: string;
  delay: number;
  isVisible: boolean;
}) {
  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden",
        "motion-safe:transition-all motion-safe:duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Photo banner with the topic icon seated on it */}
      <div className="relative overflow-hidden">
        <RemoteImage
          src={image}
          alt=""
          className="h-44 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/15 to-transparent" />
        <div className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-xl bg-background/90 text-primary shadow-sm ring-1 ring-border/60 backdrop-blur">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="flex items-start gap-2 text-primary">
          <ArrowRight className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm font-medium">{solution}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Feature highlights section with alternating layout
const features = [
  { key: "timeline", icon: Clock, image: MARKETING_IMG.features.timeline },
  { key: "medications", icon: Shield, image: MARKETING_IMG.features.medications },
  { key: "roles", icon: Users, image: MARKETING_IMG.features.roles },
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
  image,
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
        "group flex flex-col overflow-hidden",
        "motion-safe:transition-all motion-safe:duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
    >
      <div className="relative overflow-hidden">
        <RemoteImage
          src={image}
          alt=""
          className="h-48 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
        <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/90 text-primary shadow-sm ring-1 ring-border/60 backdrop-blur">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <h3 className="font-serif text-2xl font-bold">{title}</h3>
        <p className="mt-3 text-base text-muted-foreground text-pretty">{description}</p>
      </div>
    </Card>
  );
}
