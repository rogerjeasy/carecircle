"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Check, CheckSquare, HeartPulse, Pill } from "lucide-react";
import { LineChart, Line } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InsightBanner, ProgressRing, StatCard } from "./widgets";
import { StatusBanner } from "./status-banner";
import { QuickActions } from "./quick-actions";
import { AIDigestCard, FairShareCard, RotaCard } from "./side-cards";
import { useAnimatedCount, useTimeOfDay } from "./hooks";
import type { DashboardData } from "./types";

const VITAL_STATUS_LABEL = { normal: "Normal", elevated: "Elevated", low: "Low" } as const;

/** The coordinator / family home dashboard. */
export function CoordinatorDashboard({ data }: { data: DashboardData | null }) {
  const { role, user } = useAppShell();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const timeOfDay = useTimeOfDay();
  const [insightVisible, setInsightVisible] = React.useState(true);

  // First name of the real signed-in user, for the greeting.
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

  const stats = data?.stats;
  const medsTotal = stats?.medsTotalToday ?? 0;
  const medsGiven = useAnimatedCount(stats?.medsGivenToday ?? 0, 800);
  const openTasks = useAnimatedCount(stats?.openTasks ?? 0, 800);
  const doses = data?.todayDoses ?? [];
  const updates = data?.recentUpdates ?? [];

  const greeting = t(`greeting.${timeOfDay}`);

  // Locale-aware date: weekday/month names follow the active language (and digit shaping for ar/he).
  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl truncate">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-1 text-muted-foreground">{today}</p>
        </div>
        <QuickActions />
      </div>

      {/* Status Banner - Role Aware */}
      <StatusBanner
        role={role}
        recipient={data?.recipient ?? null}
        subtext={data?.bannerSubtext ?? ""}
        weekAtGlance={data?.weekAtGlance ?? []}
      />

      {/* Insight Banner - Dismissible, shown only when there's a real vitals insight */}
      {role !== "readonly" && data?.insight && (
        <InsightBanner text={data.insight} visible={insightVisible} onDismiss={() => setInsightVisible(false)} />
      )}

      {/* Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("stats.medications")}
          value={medsTotal > 0 ? `${medsGiven} of ${medsTotal}` : "—"}
          subtext={stats?.nextDoseLabel ? `Next: ${stats.nextDoseLabel}` : medsTotal > 0 ? "All done today" : "None scheduled"}
          icon={Pill}
          delay={0}
        >
          {medsTotal > 0 && <ProgressRing value={medsGiven} max={medsTotal} />}
        </StatCard>

        <StatCard
          label={t("stats.nextAppointment")}
          value={stats?.nextAppointment?.whenLabel ?? "None"}
          subtext={stats?.nextAppointment?.subtitle ?? "No upcoming visits"}
          icon={Calendar}
          delay={50}
        />

        <StatCard
          label={t("stats.openTasks")}
          value={`${openTasks} open`}
          subtext={stats ? `${stats.tasksDueToday} due today` : "—"}
          icon={CheckSquare}
          delay={100}
        />

        <StatCard
          label={t("stats.latestVitals")}
          value={stats?.latestVital?.value ?? "—"}
          subtext={
            stats?.latestVital
              ? `${stats.latestVital.label} · ${VITAL_STATUS_LABEL[stats.latestVital.status]}`
              : "No readings yet"
          }
          icon={HeartPulse}
          delay={150}
        >
          {stats && stats.vitalSparkline.length > 1 && (
            <div className="h-10 w-16">
              <LineChart width={64} height={40} data={stats.vitalSparkline}>
                <Line type="monotone" dataKey="v" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </div>
          )}
        </StatCard>
      </div>

      {/* Main Two-Column Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Wider */}
        <div className="space-y-6 lg:col-span-2">
          {/* Medications Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Today&apos;s care</CardTitle>
                <CardDescription>Medication schedule</CardDescription>
              </div>
              <Link href="/medications">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {doses.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No medications scheduled today.</p>
              ) : (
                <div className="space-y-2">
                  {doses.map((med) => (
                    <div key={med.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          med.status === "given" ? "bg-success/10" : "bg-muted"
                        }`}
                      >
                        <Pill className={`h-5 w-5 ${med.status === "given" ? "text-success" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {med.name}
                          {med.strength ? ` ${med.strength}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {med.time}
                          {med.givenByName && ` · by ${med.givenByName}`}
                        </p>
                      </div>
                      {med.status === "given" ? (
                        <Badge variant="success" className="shrink-0">
                          <Check className="mr-1 h-3 w-3" />
                          Given
                        </Badge>
                      ) : (
                        <Link href="/medications" className="shrink-0">
                          <Button size="sm" variant="outline">
                            Mark given
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent updates</CardTitle>
                <CardDescription>From the care circle</CardDescription>
              </div>
              <Link href="/timeline">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No recent updates yet.</p>
              ) : (
                <div className="space-y-4">
                  {updates.slice(0, 4).map((update) => (
                    <div key={update.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={`text-xs font-semibold ${update.authorColor}`}>
                          {update.authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{update.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {update.authorName} · {update.timeLabel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Narrower */}
        <div className="space-y-6">
          <AIDigestCard digest={data?.digest ?? null} />
          <RotaCard onCall={data?.onCall ?? null} />
          <FairShareCard members={data?.fairShare ?? []} />
        </div>
      </div>
    </div>
  );
}
