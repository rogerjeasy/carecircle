"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodayTab } from "./today-tab";
import { AllMedsTab } from "./all-meds-tab";
import { MedicationFormModal } from "./medication-form-modal";
import { valuesToMedication } from "./medication-mapping";
import { createMedication, updateMedication } from "@/lib/medications/actions";
import { canManageMeds, canRecordDoses, firstName } from "./utils";
import type { MedFormValues } from "./schema";
import type { Medication, MedicationsData } from "./types";

export interface MedicationsScreenProps {
  /** Real data loaded server-side for the active circle, or null when there's no circle/data. */
  initial: MedicationsData | null;
}

type ModalState = { mode: "add" } | { mode: "edit"; med: Medication } | null;

/** Convert the rich form values into the JSON payload the create/update server actions expect. */
function valuesToPayload(values: MedFormValues) {
  return {
    name: values.name.trim(),
    strength: values.strength.trim(),
    form: values.form,
    route: values.route,
    purpose: values.purpose.trim(),
    prescriber: values.prescriber.trim(),
    instructions: values.instructions.trim(),
    photoUrl: values.photoUrl,
    isPrn: values.isPrn,
    schedules: values.schedules.map((s) => ({ time: s.time, days: s.days })),
    supplyCount: values.supplyCount,
    refillThreshold: values.refillThreshold,
  };
}

/**
 * The Medications screen: a two-tab layout ("Today" / "All medications") over a shared list of
 * medications loaded from the server (RLS-scoped to the active circle). The Add/Edit modal lives
 * HERE so it can be opened from either tab, and a successful save triggers `router.refresh()` so
 * the Today tab re-pulls its server-computed doses (a new scheduled med shows up immediately).
 * Role drives what's editable; the server actions re-enforce that on every write.
 */
export function MedicationsScreen({ initial }: MedicationsScreenProps) {
  const router = useRouter();
  const { role, user } = useAppShell();
  const canManage = canManageMeds(role);
  const canRecord = canRecordDoses(role);
  const userName = firstName(user?.name);

  const [meds, setMeds] = React.useState<Medication[]>(initial?.meds ?? []);
  const [tab, setTab] = React.useState("today");
  const [modal, setModal] = React.useState<ModalState>(null);

  // Names of currently-taken meds, used by the safety check (optionally excluding one med by id).
  const currentMedNames = (excludeId?: string) =>
    meds.filter((m) => m.active && !m.discontinued && m.id !== excludeId).map((m) => m.name);

  const handleSubmit = async (values: MedFormValues) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(valuesToPayload(values)));

    if (modal?.mode === "edit") {
      const original = modal.med;
      const optimistic = valuesToMedication(values, original.id, original);
      setMeds((prev) => prev.map((m) => (m.id === original.id ? optimistic : m)));
      setModal(null);
      fd.set("id", original.id);
      const res = await updateMedication(fd);
      if (res.ok) {
        setMeds((prev) => prev.map((m) => (m.id === original.id ? res.data : m)));
        toast.success(`${res.data.name} updated`);
        router.refresh(); // re-pull Today's doses (schedule may have changed)
      } else {
        setMeds((prev) => prev.map((m) => (m.id === original.id ? original : m)));
        toast.error(res.error ?? "Couldn't save the medication");
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic = valuesToMedication(values, tempId);
      setMeds((prev) => [optimistic, ...prev]);
      setModal(null);
      const res = await createMedication(fd);
      if (res.ok) {
        setMeds((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
        toast.success(`${res.data.name} added`);
        router.refresh(); // so the new med's doses appear in the Today tab without a manual refresh
      } else {
        setMeds((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(res.error ?? "Couldn't add the medication");
      }
    }
  };

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
          <TodayTab
            meds={meds}
            canRecord={canRecord}
            canManage={canManage}
            userName={userName}
            initialDoses={initial?.doses ?? []}
            initialPrn={initial?.prn ?? []}
            adherence={initial?.adherence ?? null}
            onAddMedication={() => setModal({ mode: "add" })}
          />
        </TabsContent>

        <TabsContent value="all">
          <AllMedsTab
            meds={meds}
            setMeds={setMeds}
            canManage={canManage}
            onAdd={() => setModal({ mode: "add" })}
            onEdit={(med) => setModal({ mode: "edit", med })}
            onMutated={() => router.refresh()}
          />
        </TabsContent>
      </Tabs>

      {modal && (
        <MedicationFormModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.med : undefined}
          currentMedNames={currentMedNames(modal.mode === "edit" ? modal.med.id : undefined)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
