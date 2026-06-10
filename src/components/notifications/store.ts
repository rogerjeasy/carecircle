"use client";

import * as React from "react";
import { getNotifications } from "@/lib/notifications/queries";
import type { NotificationItem } from "./types";

/**
 * Notifications store — hydrated once from the real timeline-derived feed (server), with read /
 * dismissed state layered on top and persisted per-browser in localStorage (there's no server-side
 * read-state table). A small shared store so the bell popover and the full page stay in sync.
 */
let items: NotificationItem[] | null = null;
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();
const EMPTY: NotificationItem[] = [];

const READ_KEY = "cc-notif-read";
const DISMISS_KEY = "cc-notif-dismissed";

function loadIdSet(key: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(raw) ? (raw as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* storage unavailable (private mode) — read state just won't persist */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fetch the real feed once and merge in persisted read/dismissed state. Idempotent. */
async function loadOnce() {
  if (loaded || loading) return;
  loading = true;
  try {
    const fresh = await getNotifications();
    const readIds = loadIdSet(READ_KEY);
    const dismissed = loadIdSet(DISMISS_KEY);
    items = fresh
      .filter((n) => !dismissed.has(n.id))
      .map((n) => ({ ...n, read: readIds.has(n.id) }));
  } catch {
    items = [];
  } finally {
    loaded = true;
    loading = false;
    emit();
  }
}

/** Hook that ensures the feed is loaded (call from the bell + page). */
export function useLoadNotifications() {
  React.useEffect(() => {
    void loadOnce();
  }, []);
}

export function markRead(id: string) {
  const readIds = loadIdSet(READ_KEY);
  readIds.add(id);
  saveIdSet(READ_KEY, readIds);
  items = (items ?? []).map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

export function markAllRead() {
  const readIds = loadIdSet(READ_KEY);
  (items ?? []).forEach((n) => readIds.add(n.id));
  saveIdSet(READ_KEY, readIds);
  items = (items ?? []).map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}

export function dismiss(id: string) {
  const dismissed = loadIdSet(DISMISS_KEY);
  dismissed.add(id);
  saveIdSet(DISMISS_KEY, dismissed);
  items = (items ?? []).filter((n) => n.id !== id);
  emit();
}

export function useNotifications(): NotificationItem[] {
  return React.useSyncExternalStore(subscribe, () => items ?? EMPTY, () => EMPTY);
}

/** True once the first real fetch has resolved (drives the loading skeleton). */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, () => loaded, () => false);
}
