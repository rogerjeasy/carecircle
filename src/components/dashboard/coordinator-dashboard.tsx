"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Check, CheckSquare, HeartPulse, Pill } from "lucide-react";
import { LineChart, Line } from "recharts";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCareRecipient, type CareRecipient } from "@/lib/circle/care-recipient";
import { InsightBanner, ProgressRing, StatCard } from "./widgets";
import { StatusBanner } from "./status-banner";
import { QuickActions } from "./quick-actions";
import { AIDigestCard, FairShareCard, RotaCard } from "./side-cards";
import { useAnimatedCount, useTimeOfDay } from "./hooks";
import { medications, sparklineData, timelineUpdates } from "./data";

/** The coordinator / family home dashboard. */
export function CoordinatorDashboard() {
  const { role, user, activeCircleId } = useAppShell();
  const timeOfDay = useTimeOfDay();
  const [insightVisible, setInsightVisible] = React.useState(true);
  const [recipient, setRecipient] = React.useState<CareRecipient | null>(null);

  // First name of the real signed-in user, for the greeting.
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

  // Real care recipient (name + photo) for the ACTIVE circle, shown in the status banner.
  // Re-runs when the user switches circles so the banner follows the selected circle. We wait
  // for the active circle to resolve before fetching (avoids a redundant initial query).
  React.useEffect(() => {
    if (!activeCircleId) return;
    let active = true;
    getCareRecipient()
      .then((r) => {
        if (active) setRecipient(r);
      })
      .catch(() => {
        /* keep the placeholder avatar — the page still renders */
      });
    return () => {
      active = false;
    };
  }, [activeCircleId]);

  const medsGiven = useAnimatedCount(3, 800);
  const openTasks = useAnimatedCount(2, 800);

  const greeting = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
  }[timeOfDay];

  const today = new Date().toLocaleDateString("en-US", {
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
      <StatusBanner role={role} recipient={recipient} />

      {/* Insight Banner - Dismissible */}
      {role !== "readonly" && (
        <InsightBanner visible={insightVisible} onDismiss={() => setInsightVisible(false)} />
      )}

      {/* Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Medications today" value={`${medsGiven} of 4`} subtext="Next: 6:00 PM" icon={Pill} delay={0}>
          <ProgressRing value={medsGiven} max={4} />
        </StatCard>

        <StatCard label="Next appointment" value="Thu 10:00" subtext="Cardiologist · Dr. Chen" icon={Calendar} delay={50} />

        <StatCard label="Open tasks" value={`${openTasks} open`} subtext="1 due today" icon={CheckSquare} delay={100} />

        <StatCard label="Latest vitals" value="128/82" subtext="Blood pressure · Normal" icon={HeartPulse} delay={150}>
          <div className="h-10 w-16">
            <LineChart width={64} height={40} data={sparklineData}>
              <Line type="monotone" dataKey="v" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
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
              <div className="space-y-2">
                {medications.map((med, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        med.status === "given" ? "bg-success/10" : "bg-muted"
                      }`}
                    >
                      <Pill className={`h-5 w-5 ${med.status === "given" ? "text-success" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{med.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {med.time}
                        {med.givenBy && ` · by ${med.givenBy}`}
                      </p>
                    </div>
                    {med.status === "given" ? (
                      <Badge variant="success" className="shrink-0">
                        <Check className="mr-1 h-3 w-3" />
                        Given
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="shrink-0">
                        Mark given
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
              <div className="space-y-4">
                {timelineUpdates.map((update) => (
                  <div key={update.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`text-xs font-semibold ${update.color}`}>
                        {update.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{update.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {update.name} · {update.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Narrower */}
        <div className="space-y-6">
          <AIDigestCard />
          <RotaCard />
          <FairShareCard />
        </div>
      </div>
    </div>
  );
}
