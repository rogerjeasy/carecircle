"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronRight, CircleSlash2, Pill, Plus, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GatedControl } from "./gated-control";
import { MedCard } from "./med-card";
import { MedicationFormModal } from "./medication-form-modal";
import { PrintMedicationList } from "./print-medication-list";
import { valuesToMedication } from "./medication-mapping";
import type { MedFormValues } from "./schema";
import type { Medication } from "./types";

export interface AllMedsTabProps {
  meds: Medication[];
  setMeds: React.Dispatch<React.SetStateAction<Medication[]>>;
  canManage: boolean;
}

type ModalState = { mode: "add" } | { mode: "edit"; med: Medication } | null;

/** The "All medications" tab: search, the active grid, a collapsible Discontinued section, Add/Edit. */
export function AllMedsTab({ meds, setMeds, canManage }: AllMedsTabProps) {
  const [query, setQuery] = React.useState("");
  const [showDiscontinued, setShowDiscontinued] = React.useState(false);
  const [modal, setModal] = React.useState<ModalState>(null);
  const newIdRef = React.useRef(1);

  const q = query.trim().toLowerCase();
  const matches = (m: Medication) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.purpose.toLowerCase().includes(q) ||
    m.prescriber.toLowerCase().includes(q);

  const activeMeds = meds.filter((m) => !m.discontinued && matches(m));
  const discontinuedMeds = meds.filter((m) => m.discontinued && matches(m));

  // Names of currently-taken meds, used by the safety check (optionally excluding one med by id).
  const currentMedNames = (excludeId?: string) =>
    meds.filter((m) => m.active && !m.discontinued && m.id !== excludeId).map((m) => m.name);

  const toggleActive = (id: string, next: boolean) => {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, active: next } : m)));
    const m = meds.find((x) => x.id === id);
    toast(next ? `${m?.name} resumed` : `${m?.name} paused`);
  };

  const createRefill = (name: string) =>
    toast.success("Refill task created", { description: `Reorder ${name} added to Tasks` });

  const reactivate = (med: Medication) => {
    setMeds((prev) => prev.map((m) => (m.id === med.id ? { ...m, discontinued: false, active: true } : m)));
    toast.success(`${med.name} reactivated`);
  };

  const handleSubmit = (values: MedFormValues) => {
    if (modal?.mode === "edit") {
      const updated = valuesToMedication(values, modal.med.id, modal.med);
      setMeds((prev) => prev.map((m) => (m.id === modal.med.id ? updated : m)));
      toast.success(`${updated.name} updated`);
    } else {
      const id = `med-${newIdRef.current++}`;
      const created = valuesToMedication(values, id);
      setMeds((prev) => [created, ...prev]);
      toast.success(`${created.name} added`);
    }
    setModal(null);
  };

  const noMedsAtAll = meds.filter((m) => !m.discontinued).length === 0;

  return (
    <div className="space-y-5">
      {/* Search + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, purpose, or prescriber…"
            className="h-11 pl-9"
            aria-label="Search medications"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <PrintMedicationList meds={meds} />
          <GatedControl canManage={canManage}>
            <Button className="h-11 flex-1 sm:flex-none" onClick={() => setModal({ mode: "add" })}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">Add medication</span>
            </Button>
          </GatedControl>
        </div>
      </div>

      {noMedsAtAll ? (
        <EmptyMeds canManage={canManage} onAdd={() => setModal({ mode: "add" })} />
      ) : activeMeds.length === 0 ? (
        <NoSearchResults query={query} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeMeds.map((med) => (
            <MedCard
              key={med.id}
              med={med}
              canManage={canManage}
              onToggleActive={(next) => toggleActive(med.id, next)}
              onEdit={() => setModal({ mode: "edit", med })}
              onCreateRefill={() => createRefill(med.name)}
            />
          ))}
        </div>
      )}

      {/* Discontinued (collapsible) */}
      {discontinuedMeds.length > 0 && (
        <div className="rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => setShowDiscontinued((s) => !s)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-expanded={showDiscontinued}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CircleSlash2 className="h-4 w-4" aria-hidden="true" />
              Discontinued
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {discontinuedMeds.length}
              </Badge>
            </span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                showDiscontinued && "rotate-90"
              )}
            />
          </button>
          {showDiscontinued && (
            <ul className="space-y-2 px-3 pb-3 motion-safe:animate-in motion-safe:fade-in">
              {discontinuedMeds.map((med) => (
                <li key={med.id} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Pill className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40">
                      {med.name} {med.strength}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {med.discontinuedNote ?? "Discontinued"}
                    </p>
                  </div>
                  <GatedControl canManage={canManage}>
                    <Button variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={() => reactivate(med)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="ml-1">Reactivate</span>
                    </Button>
                  </GatedControl>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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

function NoSearchResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
      <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">No medications match “{query}”</p>
      <p className="text-sm text-muted-foreground">Try a different name, purpose, or prescriber.</p>
    </div>
  );
}

function EmptyMeds({ canManage, onAdd }: { canManage: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Pill className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">No medications yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add the first medication to start tracking doses.</p>
      </div>
      <GatedControl canManage={canManage}>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          <span className="ml-1">Add the first</span>
        </Button>
      </GatedControl>
    </div>
  );
}
