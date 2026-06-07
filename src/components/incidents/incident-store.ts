"use client";

import * as React from "react";
import { buildDemoIncidents } from "./data";
import type { Incident } from "./types";

/**
 * A tiny in-memory store so the report flow, the global trigger, the list and the detail route all
 * share one source of truth within a session (it resets on full reload). Backed by
 * useSyncExternalStore, which cleanly handles the server (empty) vs client (seeded) snapshots
 * without hydration warnings.
 */
let incidents: Incident[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: Incident[] = [];

function ensure(): Incident[] {
  if (incidents === null) incidents = buildDemoIncidents(new Date());
  return incidents;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addIncident(incident: Incident) {
  incidents = [incident, ...ensure()];
  emit();
}

export function updateIncident(id: string, patch: Partial<Incident>) {
  incidents = ensure().map((i) => (i.id === id ? { ...i, ...patch } : i));
  emit();
}

export function getIncident(id: string): Incident | undefined {
  return ensure().find((i) => i.id === id);
}

/** Reactive list of incidents (client). Server render sees an empty list until hydration. */
export function useIncidents(): Incident[] {
  return React.useSyncExternalStore(
    subscribe,
    () => ensure(),
    () => EMPTY
  );
}

const noop = () => () => {};

/** True only after client hydration — lets screens show a skeleton on the server pass, no effect. */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}
