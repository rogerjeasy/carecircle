"use client";

import * as React from "react";
import { Printer, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmergencyCardView } from "./emergency-card-view";
import { EC_LANGS, EC_STRINGS, type ECLang, type EmergencyCardData } from "./data";

export interface PublicEmergencyCardProps {
  data: EmergencyCardData;
  /** Formatted "valid until" label computed on the server. */
  validUntil: string;
}

/**
 * The public /e/<token> view — exactly the card a member sees, minus everything that needs an
 * account (no edit, no share management, no app shell). Built for a first responder in a hurry:
 * language toggle, print, tap-to-call.
 */
export function PublicEmergencyCard({ data, validUntil }: PublicEmergencyCardProps) {
  const [lang, setLang] = React.useState<ECLang>("en");
  const t = EC_STRINGS[lang];

  const print = () => {
    if (typeof window !== "undefined") window.print();
  };

  const footer = (
    <footer className="flex items-start gap-2 border-t pt-4 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p>
        Shared by the family via CareCircle. This link is temporary (valid until {validUntil}),
        can be revoked at any time, and every open is recorded for the family.
      </p>
    </footer>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
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
        <Button onClick={print}>
          <Printer className="h-4 w-4" />
          <span className="ml-1">Print</span>
        </Button>
      </div>

      <EmergencyCardView data={data} t={t} footer={footer} />
    </div>
  );
}
