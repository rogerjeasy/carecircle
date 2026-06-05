"use client";

import * as React from "react";
import Link from "next/link";
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

// Timeline step data
const timelineSteps = [
  {
    number: 1,
    title: "Create a circle",
    description: "In under a minute, create a care circle for your loved one. Add their name, photo, and basic care information. This becomes the central hub where everything care-related lives.",
    icon: Users,
    color: "primary",
    details: [
      "Add care recipient profile and photo",
      "Set up primary conditions and allergies",
      "Configure medication schedules",
      "Choose your primary timezone",
    ],
  },
  {
    number: 2,
    title: "Invite your people",
    description: "Send invites to everyone who helps — siblings across the country, the professional caregiver, even the visiting nurse. Each person gets a role that matches what they need to see and do.",
    icon: UserPlus,
    color: "accent",
    details: [
      "Invite via email or shareable link",
      "Assign appropriate roles",
      "Set notification preferences",
      "Control what each person can access",
    ],
  },
  {
    number: 3,
    title: "Coordinate care",
    description: "Log medications, appointments, daily observations. Create and assign tasks. Everyone sees updates in real-time. No more \"Did anyone give Mom her pills?\" confusion.",
    icon: HeartHandshake,
    color: "success",
    details: [
      "Track medications with confirmations",
      "Schedule and manage appointments",
      "Assign and complete care tasks",
      "Log health observations and vitals",
    ],
  },
  {
    number: 4,
    title: "Stay connected from anywhere",
    description: "Whether you're across town or across the world, stay informed. Get AI-powered daily digests, real-time notifications, and the peace of mind that comes from knowing what's happening.",
    icon: Globe,
    color: "info",
    details: [
      "Daily AI-generated care summaries",
      "Real-time push notifications",
      "Secure messaging within the circle",
      "Access from any device, anywhere",
    ],
  },
];

// Role data
const roles = [
  {
    title: "Coordinator",
    icon: UserCog,
    color: "primary",
    description: "Full access to manage the circle, invite members, and configure all settings.",
    sees: ["Everything", "Admin settings", "Billing", "Audit logs"],
  },
  {
    title: "Family Member",
    icon: Home,
    color: "accent",
    description: "View all updates, log activities, and stay connected with your loved one's care.",
    sees: ["Timeline & updates", "Medications", "Appointments", "Documents"],
  },
  {
    title: "Professional Caregiver",
    icon: Briefcase,
    color: "success",
    description: "Task-focused view with clear assignments, medication schedules, and daily checklists.",
    sees: ["Assigned tasks", "Med schedules", "Care notes", "Emergency info"],
  },
  {
    title: "Clinician",
    icon: Stethoscope,
    color: "info",
    description: "Medical-focused view with health history, vitals, and clinical documentation.",
    sees: ["Health records", "Vitals history", "Medications", "Clinical notes"],
  },
  {
    title: "Care Recipient",
    icon: Heart,
    color: "warning",
    description: "A simplified view for the person receiving care — their schedule, visitors, and updates.",
    sees: ["Today's schedule", "Who's visiting", "Messages", "Reminders"],
  },
  {
    title: "Read-Only",
    icon: Eye,
    color: "muted",
    description: "View-only access for extended family who want to stay informed without editing.",
    sees: ["Timeline view", "Health status", "Photos", "Updates"],
  },
];

// Security features
const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-end encryption",
    description: "All data is encrypted at rest and in transit using AES-256 and TLS 1.3. Your family's information stays private.",
  },
  {
    icon: Shield,
    title: "Role-based access control",
    description: "Fine-grained permissions ensure each person sees only what they need. No accidental oversharing.",
  },
  {
    icon: FileCheck,
    title: "Complete audit trail",
    description: "Every action is logged with who, what, and when. Full accountability and traceability for compliance.",
  },
  {
    icon: Eye,
    title: "Privacy by design",
    description: "We never sell data. We never share with advertisers. Your family's health information is not a product.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Background shapes */}
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
          How CareCircle Works
        </Badge>
        <h1
          className={cn(
            "font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1]",
            "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          Caring for someone you love{" "}
          <span className="text-primary">shouldn&apos;t feel this hard</span>
        </h1>
        <p
          className={cn(
            "mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty",
            "motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          Coordinating care across siblings, cities, and time zones is overwhelming. 
          Information gets lost. People feel left out. Important things slip through the cracks. 
          <span className="block mt-4 font-medium text-foreground">
            CareCircle brings everyone together in one place — so you can focus on what matters most.
          </span>
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

function TimelineStep({ step, index }: { step: typeof timelineSteps[0]; index: number }) {
  const { ref, isVisible } = useScrollAnimation();

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
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Step number circle */}
      <div
        className={cn(
          "absolute left-0 h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center ring-4",
          colorClasses[step.color as keyof typeof colorClasses],
          ringColors[step.color as keyof typeof ringColors]
        )}
      >
        <step.icon className="h-5 w-5 sm:h-7 sm:w-7" />
      </div>

      {/* Content */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Step {step.number}
          </span>
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold mb-3">
          {step.title}
        </h3>
        <p className="text-muted-foreground text-pretty mb-6">
          {step.description}
        </p>

        {/* Details list */}
        <ul className="space-y-2">
          {step.details.map((detail) => (
            <li key={detail} className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// Roles section
function RolesSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="py-20 sm:py-28">
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
            Role-Based Access
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            Built for everyone in the circle
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Each person gets a tailored experience based on their role. The coordinator sees admin settings. 
            The distant sibling sees daily updates. The caregiver sees tasks. Everyone gets exactly what they need.
          </p>
        </div>

        {/* Roles grid - 3 col on lg, 2 col on md, 1 col on mobile */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role, index) => (
            <RoleCard key={role.title} role={role} index={index} isVisible={isVisible} />
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
  role: typeof roles[0];
  index: number;
  isVisible: boolean;
}) {
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
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
      <h3 className="font-semibold text-lg mb-2">{role.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 flex-1">
        {role.description}
      </p>
      <div className="pt-4 border-t">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          What they see
        </p>
        <div className="flex flex-wrap gap-1.5">
          {role.sees.map((item) => (
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

  return (
    <section ref={ref} className="py-20 sm:py-28 bg-muted/30">
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
            Security & Trust
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
            Your family&apos;s data, protected
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Health information is sensitive. We built CareCircle with security and privacy at its foundation — 
            not as an afterthought.
          </p>
        </div>

        {/* Security features grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {securityFeatures.map((feature, index) => (
            <Card
              key={feature.title}
              className={cn(
                "p-6 text-center",
                "motion-safe:transition-all motion-safe:duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 75}ms` }}
            >
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
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
            <span className="text-sm font-medium">HIPAA Ready</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <span className="text-sm font-medium">SOC 2 Type II</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="h-5 w-5" />
            <span className="text-sm font-medium">GDPR Compliant</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Closing CTA
function ClosingCta() {
  const { ref, isVisible } = useScrollAnimation();

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
            Ready to bring your care circle together?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
            Join thousands of families who&apos;ve found a better way to coordinate care. 
            Free to start, set up in under a minute.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
