"use client";

import * as React from "react";
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
  {
    icon: MessageSquare,
    title: "Chaotic group chats",
    description: "Important updates get buried in 47 unread messages about what to bring for Sunday dinner.",
    solution: "A clear, organized timeline everyone can follow — no noise, just what matters.",
  },
  {
    icon: AlertTriangle,
    title: "Missed medications",
    description: "\"Did anyone give Mom her evening pills?\" The question no one can answer with certainty.",
    solution: "Real-time medication tracking with confirmations, so everyone knows what's been given.",
  },
  {
    icon: Heart,
    title: "The distant sibling's guilt",
    description: "Living far away means feeling disconnected, worried, and helpless about a parent's daily care.",
    solution: "Stay connected with AI-powered daily digests that keep you informed, no matter the distance.",
  },
];

export function ProblemSolutionSection() {
  const { ref, isVisible } = useScrollAnimation();

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
            Caring shouldn&apos;t feel this hard
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            We built Kintwadi because we&apos;ve been there. The stress, the miscommunication, the guilt — there&apos;s a better way.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem, index) => (
            <ProblemCard
              key={problem.title}
              {...problem}
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
  {
    title: "Shared Care Timeline",
    description: "Every medication, appointment, and update in one place. See who did what and when — no more guessing or duplicate efforts.",
    icon: Clock,
    image: "timeline",
  },
  {
    title: "Medication Safety",
    description: "Track doses, set reminders, and get confirmations. The whole circle knows when meds have been given, reducing dangerous double-doses.",
    icon: Shield,
    image: "medications",
  },
  {
    title: "Roles & Permissions",
    description: "Family members, professional caregivers, and clinicians all see what they need — nothing more, nothing less. Full privacy control.",
    icon: Users,
    image: "roles",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            Everything you need to coordinate care
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built tools for the unique challenges of family caregiving.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureRow key={feature.title} {...feature} />
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
