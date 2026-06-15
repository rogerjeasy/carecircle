"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Calendar, Check, HeartHandshake, Phone, Pill, Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardData } from "@/components/dashboard/types";

interface RecipientDose {
  id: string;
  name: string;
  strength: string;
  time: string;
  purpose: string;
  given: boolean;
}

/** Time-of-day key for greeting copy; resolved via t(`recipient.greeting.${key}`). */
function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/** Care recipient home — dignified, large-type, high-contrast, oversized tap targets. */
export function RecipientHome({ data }: { data: DashboardData | null }) {
  const t = useTranslations("experiences");
  const recipientName = data?.recipient?.firstName ?? t("recipient.fallbackName");
  const appts = data?.todayAppointments ?? [];
  const family = data?.emergencyContact ?? null;

  const [doses, setDoses] = React.useState<RecipientDose[]>(() =>
    (data?.todayDoses ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      strength: d.strength,
      time: d.time,
      purpose: d.purpose,
      given: d.status === "given",
    })),
  );
  const [speaking, setSpeaking] = React.useState(false);

  React.useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const tookIt = (id: string) => {
    setDoses((prev) => prev.map((d) => (d.id === id ? { ...d, given: true } : d)));
    toast.success(t("recipient.toastTaken"));
  };

  const due = doses.filter((d) => !d.given);
  const greeting = t(`recipient.greeting.${greetingKey()}` as "recipient.greeting.morning");

  const readAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast(t("recipient.readAloudUnavailable"));
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text =
      due.length > 0
        ? t("recipient.speakDue", { greeting, name: recipientName, count: due.length }) +
          " " +
          due.map((d) => t("recipient.speakDose", { name: d.name, strength: d.strength, time: d.time })).join(" ")
        : t("recipient.speakAllDone", { greeting, name: recipientName });
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <div className="space-y-8 text-lg">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("recipient.greetingLine", { greeting, name: recipientName })}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {doses.length === 0
              ? t("recipient.noMeds")
              : due.length > 0
                ? t("recipient.dueCount", { count: due.length })
                : t("recipient.allDone")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={readAloud}
          aria-pressed={speaking}
          className="h-14 shrink-0 px-5 text-base"
        >
          {speaking ? <Square className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          <span className="ml-2">{speaking ? t("recipient.stop") : t("recipient.readAloud")}</span>
        </Button>
      </div>

      {/* Medications */}
      <section aria-label={t("recipient.medsAria")} className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Pill className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("recipient.medsTitle")}
        </h2>
        {doses.length === 0 ? (
          <p className="text-base text-muted-foreground">{t("recipient.noMedsToday")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doses.map((d) => (
              <Card key={d.id} className={cn("flex h-full flex-col", d.given && "bg-success/5")}>
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-tight">
                      {d.name} <span className="text-lg font-semibold text-muted-foreground">{d.strength}</span>
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                      {d.time}
                      {d.purpose ? ` · ${d.purpose}` : ""}
                    </p>
                  </div>
                  <div className="mt-auto">
                    {d.given ? (
                      <div className="flex h-14 items-center justify-center gap-2 rounded-xl bg-success/10 text-base font-semibold text-success">
                        <Check className="h-5 w-5" aria-hidden="true" />
                        {t("recipient.taken")}
                      </div>
                    ) : (
                      <Button
                        className="h-16 w-full text-lg"
                        onClick={() => tookIt(d.id)}
                        aria-label={t("recipient.tookAria", { name: d.name, strength: d.strength })}
                      >
                        <Check className="h-6 w-6" />
                        <span className="ml-2">{t("recipient.tookIt")}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Appointments */}
      <section aria-label={t("recipient.apptsAria")} className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("recipient.apptsTitle")}
        </h2>
        {appts.length === 0 ? (
          <p className="text-base text-muted-foreground">{t("recipient.noAppts")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {appts.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-5">
                  <p className="text-xl font-semibold">{a.title}</p>
                  <p className="mt-1 text-base text-muted-foreground">{a.whenLabel}</p>
                  <p className="text-base text-muted-foreground">
                    {[a.provider, a.location].filter(Boolean).join(" · ")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Help actions */}
      <section aria-label={t("recipient.helpAria")} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {family?.phone ? (
          <Button asChild className="h-20 text-xl">
            <a href={`tel:${family.phone.replace(/[^+\d]/g, "")}`} aria-label={t("recipient.callAria", { name: family.name })}>
              <Phone className="h-7 w-7" />
              <span className="ml-2">{t("recipient.callFamily")}</span>
            </a>
          </Button>
        ) : (
          <Button
            className="h-20 text-xl"
            onClick={() => toast(t("recipient.noFamilyPhone"))}
          >
            <Phone className="h-7 w-7" />
            <span className="ml-2">{t("recipient.callFamily")}</span>
          </Button>
        )}
        <Button
          variant="destructive"
          className="h-20 text-xl"
          onClick={() => toast.success(t("recipient.toastHelp"))}
        >
          <HeartHandshake className="h-7 w-7" />
          <span className="ml-2">{t("recipient.needHelp")}</span>
        </Button>
      </section>

      <p className="text-center text-base text-muted-foreground">
        {t("recipient.footer")}
      </p>
    </div>
  );
}
