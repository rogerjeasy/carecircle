"use client";

import { useTranslations } from "next-intl";
import { Plus, Smile } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WeekAtGlance } from "./widgets";
import type { DashboardRecipient, WeekDay } from "./types";

interface StatusBannerProps {
  role: string;
  recipient: DashboardRecipient | null;
  /** Secondary line, e.g. "Mood: cheerful · Last update 20 minutes ago by Grace". */
  subtext: string;
  weekAtGlance: WeekDay[];
  /**
   * True when the signed-in user has no care circle yet (e.g. they skipped onboarding). Surfaces a
   * "Create new circle" CTA in the banner that opens the same in-place wizard as the sidebar. The
   * flag is server-authoritative (the dashboard passes `data === null`), so it disappears the moment
   * a circle exists — no flash for users who already have one.
   */
  noCircle?: boolean;
}

export function StatusBanner({ role, recipient, subtext, weekAtGlance, noCircle = false }: StatusBannerProps) {
  const t = useTranslations("dashboard.banner");
  const { setCreateCircleOpen, circles } = useAppShell();
  const isCaregiver = role === "caregiver";
  const isReadonly = role === "readonly";
  const fallbackInitials = recipient?.initials || "AS";
  // Recipient's first name for the banner copy (neutral fallback until the profile loads).
  const recipientName = recipient?.firstName || t("fallbackName");

  // Show the CTA only when the user genuinely has no circle. We require BOTH signals so neither
  // failure mode shows a wrong button: `noCircle` (server: no active circle — but it's also null on
  // a transient dashboard error) AND the context's separately-loaded circle list being empty (the
  // real membership truth, but [] briefly during its initial load). Together: no false positive on
  // error, and no flash for users who already have a circle.
  const showCreateCircle = noCircle && circles.length === 0;
  const secondary = showCreateCircle ? t("noCircleSubtext") : subtext || t("followingAlong");

  // Opens the in-place "Create a new care circle" wizard (same flow as the sidebar). Full-width on
  // phones so it never crowds the copy, inline on the right from sm up. Only rendered with no circle.
  const createCircleCta = showCreateCircle ? (
    <Button
      onClick={() => setCreateCircleOpen(true)}
      size="sm"
      className="w-full shrink-0 sm:ms-auto sm:w-auto"
    >
      <Plus className="me-1.5 h-4 w-4" aria-hidden />
      <span className="truncate">{t("createCircle")}</span>
    </Button>
  ) : null;

  if (isCaregiver) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        {/* sm:p-4 needed: CardContent's base class sets sm:pt-0 (assumes a CardHeader), which would
            otherwise collapse the top padding and push the content to the top. */}
        <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-4">
          <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
            {recipient?.avatarUrl && <AvatarImage src={recipient.avatarUrl} alt={recipient.fullName} />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{t("yourShift")}</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{secondary}</p>
          </div>
          {showCreateCircle ? (
            createCircleCta
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button size="sm" variant="outline">{t("viewTasks")}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isReadonly) {
    return (
      <Card className="border-success/30 bg-success/5">
        {/* sm:p-4 needed: CardContent's base class sets sm:pt-0 (assumes a CardHeader), which would
            otherwise collapse the top padding and push the content to the top. */}
        <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-4">
          <Avatar className="h-12 w-12 shrink-0 border-2 border-success/20">
            {recipient?.avatarUrl && <AvatarImage src={recipient.avatarUrl} alt={recipient.fullName} />}
            <AvatarFallback className="bg-success/10 text-success font-semibold">{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{t("doingWell", { name: recipientName })}</h3>
              <Smile className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{secondary}</p>
          </div>
          {createCircleCta}
        </CardContent>
      </Card>
    );
  }

  // Default: Coordinator/Family view
  return (
    <Card className="border-success/30 bg-success/5">
      {/* sm:p-4 needed: CardContent's base class sets sm:pt-0 (assumes a CardHeader), which would
          otherwise collapse the top padding and push the content to the top. */}
      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-4">
        <Avatar className="h-12 w-12 shrink-0 border-2 border-success/20">
          {recipient?.avatarUrl && <AvatarImage src={recipient.avatarUrl} alt={recipient.fullName} />}
          <AvatarFallback className="bg-success/10 text-success font-semibold">{fallbackInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{t("goodDay", { name: recipientName })}</h3>
            <Smile className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{secondary}</p>
        </div>
        {weekAtGlance.length > 0 && <WeekAtGlance days={weekAtGlance} />}
        {createCircleCta}
      </CardContent>
    </Card>
  );
}
