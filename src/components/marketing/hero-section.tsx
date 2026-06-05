"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Play, Check, Pill, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Animation hook for scroll-triggered animations
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

export function HeroSection() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen pt-24 pb-16 overflow-hidden">
      {/* Soft organic background shape */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div
            className={cn(
              "text-center lg:text-left",
              "motion-safe:transition-all motion-safe:duration-700",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Badge variant="secondary" className="mb-6 inline-flex">
              One shared record for everyone caring for someone
            </Badge>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.1]">
              Care for your parents,{" "}
              <span className="text-primary">together</span> — wherever you are.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 text-pretty">
              Coordinate medications, appointments, and daily updates across siblings, cities, and countries. Everyone stays informed, no one falls through the cracks.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="gap-2">
                  <Play className="h-4 w-4" />
                  See how it works
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Product mockup */}
          <div
            className={cn(
              "relative",
              "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-200",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Card className="p-6 sm:p-8 max-w-md mx-auto lg:max-w-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">MA</span>
                </div>
                <div>
                  <p className="font-semibold">Maria&apos;s Care Circle</p>
                  <p className="text-sm text-muted-foreground">4 members active</p>
                </div>
              </div>

              {/* Status banner */}
              <div className="rounded-xl bg-success/10 px-4 py-3 mb-6">
                <div className="flex items-center gap-2 text-success">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Today: all meds given</span>
                </div>
              </div>

              {/* Mini timeline */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent activity</p>
                <div className="space-y-2">
                  <TimelineItem
                    icon={<Pill className="h-3.5 w-3.5" />}
                    iconBg="bg-primary"
                    text="Morning medications given"
                    time="8:30 AM"
                    person="Sarah"
                  />
                  <TimelineItem
                    icon={<Clock className="h-3.5 w-3.5" />}
                    iconBg="bg-accent"
                    text="Dr. appointment confirmed for Thursday"
                    time="Yesterday"
                    person="Michael"
                  />
                </div>
              </div>
            </Card>

            {/* Floating notification card */}
            <div
              className={cn(
                "absolute -bottom-4 -left-4 sm:-left-8",
                "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-500",
                mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}
            >
              <Card className="p-3 sm:p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <span className="text-xs font-semibold">TC</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tom in Canada</p>
                    <p className="text-xs text-muted-foreground">Just checked in</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineItem({
  icon,
  iconBg,
  text,
  time,
  person,
}: {
  icon: React.ReactNode;
  iconBg: string;
  text: string;
  time: string;
  person: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-white", iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{text}</p>
        <p className="text-xs text-muted-foreground">
          {person} · {time}
        </p>
      </div>
    </div>
  );
}

// Social proof strip
export function SocialProofSection() {
  const { ref, isVisible } = useScrollAnimation();

  const stats = [
    { value: "40+", label: "Countries" },
    { value: "10K+", label: "Families" },
    { value: "2.1B", label: "People 60+ by 2050" },
  ];

  return (
    <section
      ref={ref}
      className={cn(
        "py-12 border-y bg-muted/30",
        "motion-safe:transition-all motion-safe:duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Trusted by families in 40+ countries
        </p>
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-serif font-bold text-primary">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { useScrollAnimation };
