"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Droplet, FileCheck2, Phone, Stethoscope, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { EmergencyCardData } from "./data";

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

export interface EmergencyCardViewProps {
  data: EmergencyCardData;
  /** Resolved label strings for the chosen card language (EC_STRINGS[lang]). */
  t: Record<string, string>;
  /** Custom advance-directive block content (the app screen injects its inline editor). */
  advanceDirectiveNode?: React.ReactNode;
  /** Custom footer (the app screen puts the share QR here; the public view a validity note). */
  footer?: React.ReactNode;
}

/**
 * The printable Emergency Card body — shared verbatim between the signed-in /emergency-card screen
 * and the public /e/<token> share view, so EMS sees exactly the card the family curated.
 */
export function EmergencyCardView({ data, t, advanceDirectiveNode, footer }: EmergencyCardViewProps) {
  // `t` (prop) holds the card-language labels (EC_STRINGS), runtime-toggled by EMS. `tp` is the
  // app-locale translator for the few chrome/fallback strings that aren't part of EC_STRINGS.
  const tp = useTranslations("profile");
  const doctor = data.doctor;

  return (
    <article className="space-y-4 rounded-2xl border-2 bg-card p-4 text-foreground print:border-0 print:p-0 sm:p-6 [print-color-adjust:exact]">
      {/* Header */}
      <header className="flex items-center gap-4 border-b pb-4">
        <Avatar className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
          {data.avatarUrl && <AvatarImage src={data.avatarUrl} alt={data.fullName} className="object-cover" />}
          <AvatarFallback className="bg-secondary text-2xl font-bold text-primary">{data.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{t.emergencyCard}</p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{data.fullName}</h1>
          {(data.age != null || data.dob) && (
            <p className="text-lg text-muted-foreground">
              {data.age != null ? `${data.age} ${t.years}` : ""}
              {data.age != null && data.dob ? " · " : ""}
              {data.dob ? `DOB ${data.dob}` : ""}
            </p>
          )}
        </div>
        {data.bloodType && (
          <div className="flex shrink-0 flex-col items-center rounded-xl border-2 border-foreground/15 px-4 py-2 text-center">
            <Droplet className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-2xl font-bold tabular-nums sm:text-3xl">{data.bloodType}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t.bloodType}</span>
          </div>
        )}
      </header>

      {/* ALLERGIES — full width, top priority */}
      <section
        aria-label={t.allergies}
        className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4 [print-color-adjust:exact]"
      >
        <p className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-destructive">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          {t.allergies}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.allergies.length > 0 ? (
            data.allergies.map((a) => (
              <li key={a}>
                <span className="inline-flex rounded-lg bg-destructive px-3 py-1 text-base font-bold text-destructive-foreground [print-color-adjust:exact]">
                  {a}
                </span>
              </li>
            ))
          ) : (
            <li className="text-base font-medium text-muted-foreground">{t.noAllergies}</li>
          )}
        </ul>
      </section>

      {/* Two columns: medications | conditions + advance directive + doctor */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Block icon={FileCheck2} title={t.medications}>
          {data.meds.length > 0 ? (
            <ul className="space-y-1.5">
              {data.meds.map((m) => (
                <li key={`${m.name}-${m.strength}`} className="flex items-baseline justify-between gap-3 text-base">
                  <span className="min-w-0 truncate font-semibold">{m.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{m.strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">{tp("card.noneRecorded")}</p>
          )}
        </Block>

        <div className="space-y-4">
          <Block title={t.conditions}>
            {data.conditions.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {data.conditions.map((c) => (
                  <li key={c}>
                    <span className="inline-flex rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium">{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">{tp("card.noneRecorded")}</p>
            )}
          </Block>
          <Block title={t.advanceDirective}>
            {advanceDirectiveNode ?? (
              <p className="text-base font-semibold">{data.advanceDirective ?? tp("card.notRecorded")}</p>
            )}
          </Block>
          <Block icon={Stethoscope} title={t.primaryDoctor}>
            {doctor ? (
              <>
                <p className="text-base font-semibold">{doctor.name}</p>
                <p className="text-sm text-muted-foreground">{doctor.role}</p>
                {doctor.phone && (
                  <a href={telHref(doctor.phone)} className="text-sm font-medium text-primary hover:underline">
                    {doctor.phone}
                  </a>
                )}
              </>
            ) : (
              <p className="text-base text-muted-foreground">{tp("card.notRecorded")}</p>
            )}
          </Block>
        </div>
      </div>

      {/* Emergency contacts */}
      <section aria-label={t.emergencyContacts}>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.emergencyContacts}</p>
        {data.contacts.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.contacts.map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex items-center gap-3 rounded-xl border-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.role}</p>
                  {c.phone && <p className="truncate text-sm tabular-nums text-muted-foreground">{c.phone}</p>}
                </div>
                {c.phone && (
                  <Button asChild size="lg" className="h-12 shrink-0 px-4 print:hidden">
                    <a href={telHref(c.phone)} aria-label={`${t.call} ${c.name}`}>
                      <Phone className="h-5 w-5" />
                      <span className="ml-1">{t.call}</span>
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            {tp("card.noContacts")}
          </p>
        )}
      </section>

      {footer}
    </article>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon?: typeof Phone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {title}
      </p>
      {children}
    </section>
  );
}
