"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/onboarding/actions";
import {
  Step1Welcome,
  Step2CareRecipient,
  Step3HealthBasics,
  Step4InviteCircle,
  Step5Done,
} from "./steps";
import { defaultData, stepVariants } from "./data";
import type { OnboardingData } from "./types";

const TOTAL_STEPS = 5;

export interface CircleWizardResult {
  circleId: string;
  invitesSent: number;
}

interface CircleWizardProps {
  /**
   * localStorage key used to persist in-progress answers. Omit to disable persistence
   * (e.g. an ephemeral in-app dialog that should start fresh each time it opens).
   */
  persistKey?: string;
  /**
   * Called after the circle is successfully created. The wizard intentionally stays in its
   * loading state until this resolves, so the caller can navigate or close the dialog before
   * the spinner clears. The onboarding flow never resolves it (it hard-navigates away); the
   * dialog flow closes itself.
   */
  onComplete?: (result: CircleWizardResult) => void | Promise<void>;
  /**
   * Tailors the final call-to-action label only. "onboarding" → "Go to dashboard";
   * "dialog" → "Create circle". Defaults to "onboarding".
   */
  variant?: "onboarding" | "dialog";
}

/**
 * The shared multi-step "create a care circle" wizard — progress bar, animated step content,
 * navigation, and the real `completeOnboarding` server action. It is presentation-frame-agnostic:
 * the first-run onboarding page wraps it in full-screen chrome, while the in-app "Create new
 * circle" dialog wraps it in a modal. All step components, copy, and the server action are reused
 * verbatim across both.
 */
export function CircleWizard({ persistKey, onComplete, variant = "onboarding" }: CircleWizardProps) {
  const t = useTranslations("onboarding");
  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState(0);
  const [data, setData] = React.useState<OnboardingData>(defaultData);
  const [isLoading, setIsLoading] = React.useState(false);

  const totalSteps = TOTAL_STEPS;

  // Load persisted data on mount (only when a persistKey is provided).
  React.useEffect(() => {
    if (!persistKey) return;
    const saved = localStorage.getItem(persistKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // SSR-safe localStorage hydration: the server can't read localStorage, so we restore the
        // draft after mount. The set-state-in-effect warning is a false positive for this pattern.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData({ ...defaultData, ...parsed.data });
        if (parsed.step && parsed.step <= TOTAL_STEPS) {
          setStep(parsed.step);
        }
      } catch {
        // Invalid data, use defaults
      }
    }
  }, [persistKey]);

  // Persist data on change (only when a persistKey is provided).
  React.useEffect(() => {
    if (!persistKey) return;
    localStorage.setItem(persistKey, JSON.stringify({ step, data }));
  }, [persistKey, step, data]);

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

    // Final step: persist the circle through the real server action. We hand it FormData (not a
    // plain object) so Next's dev server never logs the raw health PII this wizard carries — the
    // array/nested fields ride along as JSON strings the action parses + validates server-side.
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("recipientName", data.recipientName.trim());
      formData.set("recipientDateOfBirth", data.recipientDateOfBirth);
      if (data.recipientPhoto) formData.set("recipientPhoto", data.recipientPhoto);
      formData.set("relationship", data.relationship);
      formData.set("conditions", JSON.stringify(data.conditions));
      formData.set("allergies", JSON.stringify(data.allergies));
      formData.set("primaryLanguage", data.primaryLanguage);
      formData.set("timezone", data.timezone);
      formData.set(
        "invites",
        JSON.stringify(
          data.invites
            .filter((i) => i.email.trim())
            .map((i) => ({ email: i.email.trim(), role: i.role })),
        ),
      );

      const result = await completeOnboarding(formData);

      if (!result.ok) {
        setIsLoading(false);
        toast.error(t("toast.createError"), { description: result.error });
        return;
      }

      if (persistKey) localStorage.removeItem(persistKey);
      toast.success(variant === "dialog" ? t("toast.successDialog") : t("toast.successOnboarding"), {
        description:
          result.invitesSent > 0
            ? t("toast.successWithInvites", { count: result.invitesSent })
            : t("toast.successNoInvites"),
      });

      // Hand off to the caller (navigate, or refresh + close the dialog). We intentionally keep
      // isLoading=true so the spinner persists until the caller unmounts/navigates us.
      await onComplete?.({ circleId: result.circleId, invitesSent: result.invitesSent });
    } catch {
      setIsLoading(false);
      toast.error(t("toast.genericError"), { description: t("toast.genericErrorHint") });
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
    <>
      {/* Progress indicator. In the dialog, reserve room on the right for the modal's close (X). */}
      <div className={cn("p-4 border-b", variant === "dialog" && "pr-12")}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("nav.stepProgress", { step, total: totalSteps })}
          </span>
          {step > 1 && step < totalSteps && (
            <button
              type="button"
              onClick={() => {
                if (persistKey) localStorage.removeItem(persistKey);
                setData(defaultData);
                setStep(1);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("nav.startOver")}
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

      {/* Step content with animation. In the dialog it scrolls within the capped modal height,
          keeping the progress bar and nav buttons pinned. */}
      <div
        className={cn(
          "p-4 sm:p-6",
          variant === "dialog" ? "min-h-0 flex-1 overflow-y-auto" : "overflow-hidden",
        )}
      >
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
      </div>

      {/* Navigation buttons */}
      <div className="p-4 border-t flex items-center gap-3">
        {step > 1 && !isFinalStep && (
          <Button type="button" variant="ghost" onClick={handleBack} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("nav.back")}
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
            {t("nav.skip")}
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
              {t("nav.settingUp")}
            </>
          ) : isFinalStep ? (
            <>
              {variant === "dialog" ? t("nav.createCircle") : t("nav.goToDashboard")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              {t("nav.continue")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </>
  );
}
