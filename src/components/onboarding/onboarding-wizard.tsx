"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Heart, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { completeOnboarding } from "@/lib/onboarding/actions";
import {
  Step1Welcome,
  Step2CareRecipient,
  Step3HealthBasics,
  Step4InviteCircle,
  Step5Done,
} from "./steps";
import { defaultData, STORAGE_KEY, stepVariants } from "./data";
import type { OnboardingData } from "./types";

const TOTAL_STEPS = 5;

export function OnboardingWizard() {
  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState(0);
  const [data, setData] = React.useState<OnboardingData>(defaultData);
  const [isLoading, setIsLoading] = React.useState(false);

  const totalSteps = TOTAL_STEPS;

  // Load persisted data on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({ ...defaultData, ...parsed.data });
        if (parsed.step && parsed.step <= totalSteps) {
          setStep(parsed.step);
        }
      } catch {
        // Invalid data, use defaults
      }
    }
  }, []);

  // Persist data on change
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  }, [step, data]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canContinue = () => {
    switch (step) {
      case 2:
        return data.recipientName.trim().length > 0;
      default:
        return true;
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleContinue = async () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep(step + 1);
      return;
    }

    // Final step: persist the circle through the real server action.
    setIsLoading(true);
    try {
      const result = await completeOnboarding({
        recipientName: data.recipientName.trim(),
        recipientDateOfBirth: data.recipientDateOfBirth,
        recipientPhoto: data.recipientPhoto,
        relationship: data.relationship,
        conditions: data.conditions,
        allergies: data.allergies,
        primaryLanguage: data.primaryLanguage,
        timezone: data.timezone,
        invites: data.invites
          .filter((i) => i.email.trim())
          .map((i) => ({
            email: i.email.trim(),
            role: i.role as
              | "family_admin"
              | "family"
              | "caregiver"
              | "clinician"
              | "care_recipient"
              | "read_only",
          })),
      });

      if (!result.ok) {
        setIsLoading(false);
        toast.error("Couldn't create your care circle", { description: result.error });
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      toast.success("Welcome to CareCircle!", {
        description:
          result.invitesSent > 0
            ? `Your care circle is ready · ${result.invitesSent} invite${result.invitesSent !== 1 ? "s" : ""} sent.`
            : "Your care circle has been created.",
      });
      // Hard navigation (not router.push) on purpose: the brand-new circle/membership
      // must be reflected on the dashboard, and a full load guarantees fresh server
      // state. A soft push followed by router.refresh() races — refresh re-renders the
      // current route and cancels the in-flight navigation, leaving the wizard stuck on
      // "Setting up…". We intentionally leave isLoading=true so the spinner persists
      // until the page unloads.
      window.location.assign("/dashboard");
    } catch {
      setIsLoading(false);
      toast.error("Something went wrong", { description: "Please try again in a moment." });
    }
  };

  const handleSkip = () => {
    setDirection(1);
    setStep(step + 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Welcome />;
      case 2:
        return <Step2CareRecipient data={data} updateData={updateData} />;
      case 3:
        return <Step3HealthBasics data={data} updateData={updateData} />;
      case 4:
        return <Step4InviteCircle data={data} updateData={updateData} />;
      case 5:
        return <Step5Done data={data} />;
      default:
        return null;
    }
  };

  const showSkip = step === 3 || step === 4;
  const isFinalStep = step === totalSteps;

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
        <Card className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {step} of {totalSteps}
              </span>
              {step > 1 && step < totalSteps && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setData(defaultData);
                    setStep(1);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Start over
                </button>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content with animation */}
          <CardContent className="p-4 sm:p-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="motion-reduce:transition-none motion-reduce:transform-none"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          {/* Navigation buttons */}
          <div className="p-4 border-t flex items-center gap-3">
            {step > 1 && !isFinalStep && (
              <Button type="button" variant="ghost" onClick={handleBack} disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <div className="flex-1" />

            {showSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-muted-foreground"
              >
                Skip for now
              </Button>
            )}

            <Button type="button" onClick={handleContinue} disabled={!canContinue() || isLoading}>
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                  Setting up...
                </>
              ) : isFinalStep ? (
                <>
                  Go to dashboard
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
