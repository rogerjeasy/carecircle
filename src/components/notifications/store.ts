"use client";

import * as React from "react";
import { buildNotifications } from "./data";
import type { NotificationItem } from "./types";

/** A small shared store so the bell popover and the full page stay in sync within a session. */
let items: NotificationItem[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: NotificationItem[] = [];

function ensure(): NotificationItem[] {
  if (items === null) items = buildNotifications(new Date());
  return items;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markRead(id: string) {
  items = ensure().map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

export function markAllRead() {
  items = ensure().map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}

export function dismiss(id: string) {
  items = ensure().filter((n) => n.id !== id);
  emit();
}

export function useNotifications(): NotificationItem[] {
  return React.useSyncExternalStore(subscribe, () => ensure(), () => EMPTY);
}

const noop = () => () => {};
/** True only after client hydration (SSR-safe skeleton, no effect). */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(noop, () => true, () => false);
}
