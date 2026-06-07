"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CircleWizard } from "./circle-wizard";
import { STORAGE_KEY } from "./data";

export function OnboardingWizard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="font-semibold">CareCircle</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-lg overflow-hidden">
          <CircleWizard
            persistKey={STORAGE_KEY}
            variant="onboarding"
            // Hard navigation (not router.push) on purpose: the brand-new circle/membership must
            // be reflected on the dashboard, and a full load guarantees fresh server state. A soft
            // push followed by router.refresh() races — refresh re-renders the current route and
            // cancels the in-flight navigation, leaving the wizard stuck on "Setting up…". The
            // wizard keeps isLoading=true (onComplete never resolves) so the spinner persists until
            // the page unloads.
            onComplete={() => {
              window.location.assign("/dashboard");
            }}
          />
        </Card>
      </main>
    </div>
  );
}
