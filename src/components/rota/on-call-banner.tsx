"use client";

import { useLocale, useTranslations } from "next-intl";
import { Phone, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRotaMembers } from "./members-context";
import { firstName, inPersonNow, onCallNow, timeRange } from "./utils";
import type { Shift } from "./types";

/** The "On call now: Grace" highlight, plus who's physically present right now. */
export function OnCallBanner({ shifts, now }: { shifts: Shift[]; now: Date }) {
  const t = useTranslations("rota");
  const locale = useLocale();
  const { members } = useRotaMembers();
  const onCall = onCallNow(shifts, now, members);
  const inPerson = inPersonNow(shifts, now, members);

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4",
        onCall ? "border-l-primary" : "border-l-muted-foreground/30"
      )}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          {onCall ? (
            <>
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarFallback className={cn("text-sm font-semibold", onCall.member.color)}>
                  {onCall.member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("banner.onCallNow")}
                </p>
                <p className="truncate text-lg font-semibold leading-tight">{onCall.member.name}</p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">{timeRange(locale, onCall.shift, t("overnightSuffix"))}</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("banner.onCallNow")}</p>
                <p className="truncate text-base font-semibold leading-tight">{t("banner.noOneOnCall")}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm sm:shrink-0">
          <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {inPerson ? (
            <span className="min-w-0 text-muted-foreground">
              {t.rich("banner.isHereInPerson", {
                name: firstName(inPerson.name),
                strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("banner.noOneInPerson")}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
