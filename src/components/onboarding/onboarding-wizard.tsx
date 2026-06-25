"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { CircleWizard } from "./circle-wizard";
import { OnboardingBackdrop } from "./onboarding-backdrop";
import { STORAGE_KEY } from "./data";

/**
 * @param canSkip When true (first-run, straight after sign-up), a "Skip onboarding" shortcut is
 *   shown that sends the user straight to the dashboard without creating a circle. The dashboard
 *   and app shell already handle a circle-less user gracefully (empty states + a "Create circle"
 *   action), so skipping is safe; the user can set up their circle later.
 */
export function OnboardingWizard({ canSkip = false }: { canSkip?: boolean }) {
  const t = useTranslations("onboarding");

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background flex flex-col">
      <OnboardingBackdrop />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link href="/" className="group flex items-center gap-2">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {canSkip && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                // Hard navigation (not router.push) for the same reason onComplete uses it: the
                // dashboard must reflect fresh server state for this brand-new (circle-less) user.
                onClick={() => window.location.assign("/dashboard")}
              >
                {t("skipOnboarding")}
                <ArrowRight className="ms-1.5 h-4 w-4" />
              </Button>
            )}
            <ThemeToggle />
          </div>
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
