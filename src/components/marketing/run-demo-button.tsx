"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDemoSession } from "@/lib/auth/demo";

/**
 * The hero's secondary CTA. In demo mode (NEXT_PUBLIC_DEMO_MODE=1) it's "Run demo": one tap
 * creates an anonymous guest in the seeded demo circle (see src/lib/auth/demo.ts for the security
 * model) and lands the visitor on a fully living dashboard — no sign-up, no onboarding. When the
 * flag is off (a real production build), it falls back to the original "See how it works" anchor.
 */
export function RunDemoButton() {
  const [busy, setBusy] = React.useState(false);

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") {
    return (
      <Link href="#how-it-works">
        <Button size="lg" variant="outline" className="gap-2">
          <Play className="h-4 w-4" />
          See how it works
        </Button>
      </Link>
    );
  }

  const run = async () => {
    if (busy) return;
    setBusy(true);
    const res = await startDemoSession();
    if (!res.ok) {
      setBusy(false);
      toast.error(res.error);
      return;
    }
    toast.success("Welcome to the demo circle!", { description: "Taking you to Antonio's dashboard…" });
    // Full navigation (not router.push) so the fresh session cookie is sent with the request —
    // same pattern as the sign-in form. busy stays true until the page unloads.
    window.location.assign("/dashboard");
  };

  return (
    <Button size="lg" variant="outline" className="gap-2" onClick={run} disabled={busy} aria-busy={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {busy ? "Setting up your demo…" : "Run demo"}
    </Button>
  );
}
