"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInWithCredentials } from "@/lib/auth/actions";

/**
 * One-click demo sign-in for judges/reviewers — rendered ONLY when the deployment opts in via
 * NEXT_PUBLIC_DEMO_MODE=1 (the flag is inlined at build time, so production-for-real builds simply
 * don't contain this UI). Each button signs in as one seeded persona so a reviewer can experience
 * every role lens — coordinator, remote family, aide, the care recipient, read-only, clinician —
 * in seconds.
 *
 * Security note: this is a convenience wrapper around the SAME credentials flow as the form above
 * it (server action → Auth.js → scrypt hash check). It grants nothing the form wouldn't.
 */
const DEMO_PASSWORD = "Kintwadi123";

// Persona lens text comes from `auth.demo.lenses.<lensKey>`; names are proper nouns, kept as-is.
const PERSONAS = [
  { email: "maria@kintwadi.demo", name: "Maria", lensKey: "coordinator" },
  { email: "paolo@kintwadi.demo", name: "Paolo", lensKey: "remote" },
  { email: "grace@kintwadi.demo", name: "Grace", lensKey: "aide" },
  { email: "antonio@kintwadi.demo", name: "Antonio", lensKey: "recipient" },
  { email: "rosa@kintwadi.demo", name: "Rosa", lensKey: "readonly" },
  { email: "chen@kintwadi.demo", name: "Dr. Chen", lensKey: "clinician" },
] as const;

export function DemoAccountsPanel() {
  const router = useRouter();
  const t = useTranslations("auth.demo");
  const [busy, setBusy] = React.useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return null;

  const enter = async (email: string, name: string) => {
    if (busy) return;
    setBusy(email);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", DEMO_PASSWORD);
    const res = await signInWithCredentials(fd);
    if (!res.ok) {
      setBusy(null);
      toast.error(t("failed"), { description: res.error });
      return;
    }
    toast.success(t("welcome", { name }), { description: t("entering") });
    // Soft (client-side) navigation so the document never blanks out (a full-document
    // window.location navigation flashed a "couldn't load" page on Vercel and discarded this
    // toast). router.replace keeps the persistent <Toaster> mounted and the destination fetches
    // fresh authenticated RSC with the session cookie that was just set.
    router.replace(res.redirectTo ?? "/dashboard");
  };

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold">{t("title")}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PERSONAS.map((p) => (
          <button
            key={p.email}
            type="button"
            onClick={() => enter(p.email, p.name)}
            disabled={busy !== null}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors",
              "hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-60",
            )}
          >
            <span className="min-w-0">
              <span className="block font-medium">{p.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{t(`lenses.${p.lensKey}`)}</span>
            </span>
            {busy === p.email && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
