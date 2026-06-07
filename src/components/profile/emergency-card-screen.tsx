"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Droplet,
  FileCheck2,
  Phone,
  Printer,
  Share2,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { QrPlaceholder } from "./qr-placeholder";
import {
  CONTACTS,
  CURRENT_MEDS,
  EC_LANGS,
  EC_STRINGS,
  PROFILE,
  type ECLang,
} from "./data";

/** The Emergency Card — high-contrast, scannable, shareable, and printable to one clean page. */
export function EmergencyCardScreen() {
  const [lang, setLang] = React.useState<ECLang>("en");
  const t = EC_STRINGS[lang];
  const doctor = CONTACTS.doctors[0];

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${PROFILE.fullName} — ${t.emergencyCard}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast("Sharing was cancelled");
    }
  };

  const print = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {/* Toolbar (not printed) */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="inline-flex rounded-xl border p-0.5" role="group" aria-label="Card language">
          {EC_LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLang(l.value)}
              aria-pressed={lang === l.value}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                lang === l.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={share}>
            <Share2 className="h-4 w-4" />
            <span className="ml-1">Share</span>
          </Button>
          <Button onClick={print}>
            <Printer className="h-4 w-4" />
            <span className="ml-1">Print</span>
          </Button>
        </div>
      </div>

      {/* Printable card */}
      <article className="space-y-4 rounded-2xl border-2 bg-card p-4 text-foreground print:border-0 print:p-0 sm:p-6 [print-color-adjust:exact]">
        {/* Header */}
        <header className="flex items-center gap-4 border-b pb-4">
          <Avatar className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
            <AvatarFallback className="bg-secondary text-2xl font-bold text-primary">AR</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t.emergencyCard}</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{PROFILE.fullName}</h1>
            <p className="text-lg text-muted-foreground">{PROFILE.age} {t.years} · DOB {PROFILE.dob}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-xl border-2 border-foreground/15 px-4 py-2 text-center">
            <Droplet className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-2xl font-bold tabular-nums sm:text-3xl">{PROFILE.bloodType}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t.bloodType}</span>
          </div>
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
            {PROFILE.allergies.length > 0 ? (
              PROFILE.allergies.map((a) => (
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
            <ul className="space-y-1.5">
              {CURRENT_MEDS.map((m) => (
                <li key={m.name} className="flex items-baseline justify-between gap-3 text-base">
                  <span className="min-w-0 truncate font-semibold">{m.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{m.strength}</span>
                </li>
              ))}
            </ul>
          </Block>

          <div className="space-y-4">
            <Block title={t.conditions}>
              <ul className="flex flex-wrap gap-1.5">
                {PROFILE.conditions.map((c) => (
                  <li key={c}>
                    <span className="inline-flex rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium">{c}</span>
                  </li>
                ))}
              </ul>
            </Block>
            <Block title={t.advanceDirective}>
              <p className="text-base font-semibold">{PROFILE.advanceDirective}</p>
            </Block>
            <Block icon={Stethoscope} title={t.primaryDoctor}>
              <p className="text-base font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">{doctor.role}</p>
              <a href={`tel:${doctor.phone.replace(/[^+\d]/g, "")}`} className="text-sm font-medium text-primary hover:underline">
                {doctor.phone}
              </a>
            </Block>
          </div>
        </div>

        {/* Emergency contacts */}
        <section aria-label={t.emergencyContacts}>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.emergencyContacts}</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CONTACTS.nextOfKin.map((c) => (
              <li key={c.phone} className="flex items-center gap-3 rounded-xl border-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.role}</p>
                  <p className="truncate text-sm tabular-nums text-muted-foreground">{c.phone}</p>
                </div>
                <Button asChild size="lg" className="h-12 shrink-0 px-4 print:hidden">
                  <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} aria-label={`${t.call} ${c.name}`}>
                    <Phone className="h-5 w-5" />
                    <span className="ml-1">{t.call}</span>
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Share QR (decorative) */}
        <footer className="flex items-center gap-4 border-t pt-4">
          <div className="w-24 shrink-0">
            <QrPlaceholder />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t.scanToOpen}</p>
            <p className="truncate text-xs text-muted-foreground">carecircle.app/c/antonio-r/emergency</p>
          </div>
        </footer>
      </article>
    </div>
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
