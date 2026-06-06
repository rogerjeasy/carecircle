"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodayTab } from "./today-tab";
import { AllMedsTab } from "./all-meds-tab";
import { TodaySkeleton, AllMedsSkeleton } from "./medication-skeletons";
import { initialMeds } from "./data";
import { canManageMeds, canRecordDoses, firstName } from "./utils";
import type { Medication } from "./types";

/**
 * The Medications screen: a two-tab layout ("Today" / "All medications") over a shared list of
 * medications. Role drives what's editable (managers) vs. view-only. Renders inside the AppShell.
 */
export function MedicationsScreen() {
  const { role, user } = useAppShell();
  const canManage = canManageMeds(role);
  const canRecord = canRecordDoses(role);
  const userName = firstName(user?.name);

  const [meds, setMeds] = React.useState<Medication[]>(initialMeds);
  const [tab, setTab] = React.useState("today");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Medications</h1>
          <p className="mt-1 text-muted-foreground">Track today&apos;s doses and manage the full list.</p>
        </div>
        {!canManage && (
          <Badge variant="secondary" className="w-fit gap-1.5">
            <Lock className="h-3 w-3" aria-hidden="true" />
            View only — ask the coordinator to edit
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full max-w-sm">
          <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">All medications</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {loading ? (
            <TodaySkeleton />
          ) : (
            <TodayTab meds={meds} canRecord={canRecord} canManage={canManage} userName={userName} />
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? <AllMedsSkeleton /> : <AllMedsTab meds={meds} setMeds={setMeds} canManage={canManage} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
