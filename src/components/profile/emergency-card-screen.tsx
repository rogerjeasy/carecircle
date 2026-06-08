"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Droplet,
  FileCheck2,
  Pencil,
  Phone,
  Printer,
  Share2,
  ShieldAlert,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrPlaceholder } from "./qr-placeholder";
import { updateAdvanceDirective } from "@/lib/emergency-card/actions";
import { EC_LANGS, EC_STRINGS, type ECLang, type EmergencyCardData } from "./data";

export interface EmergencyCardScreenProps {
  /** Projected emergency-card data, or null when there's no recipient profile / circle yet. */
  data: EmergencyCardData | null;
}

/** The Emergency Card — high-contrast, scannable, shareable, and printable to one clean page. */
export function EmergencyCardScreen({ data }: EmergencyCardScreenProps) {
  const { role } = useAppShell();
  const canManage = role === "coordinator"; // owner / family admin
  const [lang, setLang] = React.useState<ECLang>("en");
  const t = EC_STRINGS[lang];

  // Advance directive is editable in place by managers; seeded from the server projection.
  const [advanceDirective, setAdvanceDirective] = React.useState<string | null>(data?.advanceDirective ?? null);
  const [editingAd, setEditingAd] = React.useState(false);
  const [adDraft, setAdDraft] = React.useState("");
  const [savingAd, setSavingAd] = React.useState(false);

  const saveAdvanceDirective = async () => {
    setSavingAd(true);
    const res = await updateAdvanceDirective(adDraft);
    setSavingAd(false);
    if (res.ok) {
      setAdvanceDirective(res.value);
      setEditingAd(false);
      toast.success("Advance directive updated");
    } else {
      toast.error(res.error);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${data?.fullName ?? "Care recipient"} — ${t.emergencyCard}`, url });
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

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold">No emergency card yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up the care recipient&apos;s profile to generate their emergency card.
          </p>
        </div>
      </div>
    );
  }

  const doctor = data.doctor;
  const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

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
              <p className="text-base text-muted-foreground">None recorded</p>
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
                <p className="text-base text-muted-foreground">None recorded</p>
              )}
            </Block>
            <Block title={t.advanceDirective}>
              {editingAd ? (
                <div className="space-y-2 print:hidden">
                  <Input
                    value={adDraft}
                    onChange={(e) => setAdDraft(e.target.value)}
                    placeholder='e.g. "DNR on file"'
                    aria-label="Advance directive"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveAdvanceDirective} disabled={savingAd}>
                      {savingAd ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingAd(false)} disabled={savingAd}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold">{advanceDirective ?? "Not recorded"}</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdDraft(advanceDirective ?? "");
                        setEditingAd(true);
                      }}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
                      aria-label="Edit advance directive"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
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
                <p className="text-base text-muted-foreground">Not recorded</p>
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
              No emergency contacts recorded yet.
            </p>
          )}
        </section>

        {/* Share QR (decorative) */}
        <footer className="flex items-center gap-4 border-t pt-4">
          <div className="w-24 shrink-0">
            <QrPlaceholder />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t.scanToOpen}</p>
            <p className="truncate text-xs text-muted-foreground">Open this page on a phone to share it.</p>
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
