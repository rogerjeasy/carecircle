"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditProfileModal } from "./edit-profile-modal";
import type { ProfileContact, RecipientProfileData } from "@/lib/profile/queries";

export function ProfileScreen({ initial }: { initial: RecipientProfileData | null }) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);

  if (!initial) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Users className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("empty.description")}</p>
        </div>
      </div>
    );
  }

  const p = initial;
  const ageDob = [p.age != null ? t("ageYears", { age: p.age }) : null, p.dob ? t("dob", { dob: p.dob }) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar className="h-20 w-20 shrink-0">
            {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.fullName} />}
            <AvatarFallback className="bg-secondary text-2xl font-semibold text-primary">{p.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{p.fullName}</h1>
            {ageDob && <p className="mt-1 text-muted-foreground">{ageDob}</p>}
            {p.language && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>🗣 {p.language}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Button asChild>
              <Link href="/emergency-card">
                <ShieldCheck className="h-4 w-4" />
                <span className="ml-1">{t("emergencyCard")}</span>
              </Link>
            </Button>
            {p.canEdit && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                <span className="ml-1">{t("edit")}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {/* Health summary */}
        <Section icon={HeartPulse} title={t("sections.health")}>
          <div className="space-y-3 text-sm">
            <ChipRow label={t("labels.conditions")} chips={p.conditions} empty={t("noneRecorded")} />
            <ChipRow label={t("labels.allergies")} chips={p.allergies} danger empty={t("noneRecorded")} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoLine icon={Droplet} label={t("labels.bloodType")} value={p.bloodType ?? t("dash")} />
              {p.mobility && <InfoLine icon={Accessibility} label={t("labels.mobility")} value={p.mobility} />}
            </div>
            {p.dietary.length > 0 && (
              <div className="flex flex-wrap items-start gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Utensils className="h-3.5 w-3.5" aria-hidden="true" /> {t("labels.dietary")}
                </span>
                <ul className="flex flex-wrap gap-1.5">
                  {p.dietary.map((d) => (
                    <li key={d}><Badge variant="secondary">{d}</Badge></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {/* Current medications */}
        <Section icon={Pill} title={t("sections.medications")} action={<SectionLink href="/medications" label={t("manage")} />}>
          {p.meds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noMeds")}</p>
          ) : (
            <ul className="divide-y">
              {p.meds.map((m) => (
                <li key={`${m.name}-${m.strength}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name} <span className="font-normal text-muted-foreground">{m.strength}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.schedule}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Care preferences */}
        <Section icon={Sparkles} title={t("sections.preferences")}>
          {p.comfort ? (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("labels.comfortNotes")}</p>
              <p className="whitespace-pre-wrap text-foreground/90">{p.comfort}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {p.canEdit ? t("noComfortAdd") : t("noComfort")}
            </p>
          )}
        </Section>

        {/* Key contacts */}
        <Section icon={Users} title={t("sections.contacts")}>
          {p.doctors.length === 0 && p.nextOfKin.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noContacts")}</p>
          ) : (
            <div className="space-y-4">
              {p.doctors.length > 0 && <ContactGroup label={t("labels.doctors")} icon={Stethoscope} contacts={p.doctors} />}
              {p.nextOfKin.length > 0 && <ContactGroup label={t("labels.nextOfKin")} icon={Users} contacts={p.nextOfKin} />}
            </div>
          )}
        </Section>

        {/* Insurance */}
        {p.insurance && (
          <Section icon={ShieldCheck} title={t("sections.insurance")} className="lg:col-span-2">
            <div className="space-y-1.5 text-sm">
              <InfoLine icon={ShieldCheck} label={t("labels.provider")} value={p.insurance.provider || t("dash")} />
              {p.insurance.plan && <p className="text-muted-foreground">{t("labels.plan")}: <span className="text-foreground">{p.insurance.plan}</span></p>}
              {p.insurance.memberId && <p className="text-muted-foreground">{t("labels.memberId")}: <span className="font-medium tabular-nums text-foreground">{p.insurance.memberId}</span></p>}
              {p.insurance.group && <p className="text-muted-foreground">{t("labels.group")}: <span className="tabular-nums text-foreground">{p.insurance.group}</span></p>}
            </div>
          </Section>
        )}
      </div>

      {editing && (
        <EditProfileModal
          open
          onOpenChange={setEditing}
          profile={p}
          onSaved={() => router.refresh()}
        />
      )}
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

function ChipRow({ label, chips, danger, empty }: { label: string; chips: string[]; danger?: boolean; empty?: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {chips.length === 0 ? (
        <span className="text-xs text-muted-foreground">{empty ?? "—"}</span>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li key={c}>
              <Badge variant="outline" className={cn(danger ? "border-destructive/40 text-destructive" : "border-transparent bg-secondary")}>
                {c}
              </Badge>
            </li>
          ))}
        </ul>
      )}
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

function ContactGroup({ label, icon: Icon, contacts }: { label: string; icon: typeof Users; contacts: ProfileContact[] }) {
  const t = useTranslations("profile");
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={`${c.name}-${c.phone}`} className="flex items-center gap-2 rounded-xl border p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.role}</p>
            </div>
            {c.phone && (
              <>
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} aria-label={t("call", { name: c.name })}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <a href={`sms:${c.phone.replace(/[^+\d]/g, "")}`} aria-label={t("message", { name: c.name })}>
                    <MessageSquare className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
