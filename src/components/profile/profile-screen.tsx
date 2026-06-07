"use client";

import * as React from "react";
import Link from "next/link";
import {
  Accessibility,
  Droplet,
  ExternalLink,
  HeartPulse,
  MessageSquare,
  Pencil,
  Phone,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileModal } from "./edit-profile-modal";
import { CONTACTS, CURRENT_MEDS, INSURANCE, PREFERENCES, PROFILE, type Contact } from "./data";

export function ProfileScreen() {
  const { role } = useAppShell();
  const canEdit = role === "coordinator" || role === "family";
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarFallback className="bg-secondary text-2xl font-semibold text-primary">AR</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{PROFILE.fullName}</h1>
            <p className="mt-1 text-muted-foreground">{PROFILE.age} years · DOB {PROFILE.dob}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>🗣 {PROFILE.language}</span>
              <span>🕑 {PROFILE.timezone}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Button asChild>
              <Link href="/emergency-card">
                <ShieldCheck className="h-4 w-4" />
                <span className="ml-1">Emergency Card</span>
              </Link>
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                <span className="ml-1">Edit</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sections — single comfortable column on phone/iPad-portrait, two columns from lg up */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {/* Health summary */}
        <Section icon={HeartPulse} title="Health summary">
          <div className="space-y-3 text-sm">
            <ChipRow label="Conditions" chips={PROFILE.conditions} />
            <ChipRow label="Allergies" chips={PROFILE.allergies} danger />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoLine icon={Droplet} label="Blood type" value={PROFILE.bloodType} />
              <InfoLine icon={Accessibility} label="Mobility" value={PROFILE.mobility} />
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Utensils className="h-3.5 w-3.5" aria-hidden="true" /> Dietary
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {PROFILE.dietary.map((d) => (
                  <li key={d}><Badge variant="secondary">{d}</Badge></li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Current medications */}
        <Section
          icon={Pill}
          title="Current medications"
          action={<SectionLink href="/medications" label="Manage" />}
        >
          <ul className="divide-y">
            {CURRENT_MEDS.map((m) => (
              <li key={m.name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.name} <span className="font-normal text-muted-foreground">{m.strength}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.schedule}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Care preferences */}
        <Section icon={Sparkles} title="Care preferences">
          <div className="space-y-4 text-sm">
            <ChipRow label="Likes" chips={PREFERENCES.likes} />
            <ChipRow label="Dislikes" chips={PREFERENCES.dislikes} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Routines</p>
              <ul className="space-y-1.5">
                {PREFERENCES.routines.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span className="text-foreground/90">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Comfort notes</p>
              <p className="text-foreground/90">{PREFERENCES.comfort}</p>
            </div>
          </div>
        </Section>

        {/* Key contacts */}
        <Section icon={Users} title="Key contacts">
          <div className="space-y-4">
            <ContactGroup label="Doctors" icon={Stethoscope} contacts={CONTACTS.doctors} />
            <ContactGroup label="Pharmacy" icon={Pill} contacts={[CONTACTS.pharmacy]} />
            <ContactGroup label="Next of kin" icon={Users} contacts={CONTACTS.nextOfKin} />
          </div>
        </Section>

        {/* Insurance */}
        <Section icon={ShieldCheck} title="Insurance" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <InfoLine icon={ShieldCheck} label="Provider" value={INSURANCE.provider} />
              <p className="text-muted-foreground">Plan: <span className="text-foreground">{INSURANCE.plan}</span></p>
              <p className="text-muted-foreground">Member ID: <span className="font-medium tabular-nums text-foreground">{INSURANCE.memberId}</span></p>
              <p className="text-muted-foreground">Group: <span className="tabular-nums text-foreground">{INSURANCE.group}</span></p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Linked documents</p>
              <ul className="space-y-2">
                {INSURANCE.documents.map((d) => (
                  <li key={d.title}>
                    <Link
                      href="/documents"
                      className="flex items-center gap-3 rounded-xl border bg-card p-2.5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{d.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{d.date}</span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </div>

      {editing && <EditProfileModal open onOpenChange={setEditing} />}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: typeof HeartPulse;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {title}
          </h2>
          {action}
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </CardContent>
    </Card>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {label}
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}

function ChipRow({ label, chips, danger }: { label: string; chips: string[]; danger?: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <li key={c}>
            <Badge variant="outline" className={cn(danger ? "border-destructive/40 text-destructive" : "border-transparent bg-secondary")}>
              {c}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof Droplet; label: string; value: string }) {
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-foreground">{value}</span>
      </span>
    </p>
  );
}

function ContactGroup({ label, icon: Icon, contacts }: { label: string; icon: typeof Users; contacts: Contact[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.phone} className="flex items-center gap-2 rounded-xl border p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.role}</p>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} aria-label={`Call ${c.name}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <a href={`sms:${c.phone.replace(/[^+\d]/g, "")}`} aria-label={`Message ${c.name}`}>
                <MessageSquare className="h-4 w-4" />
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
