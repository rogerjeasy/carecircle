"use client";

import * as React from "react";
import { toast } from "sonner";
import { getNotifications } from "@/lib/notifications/queries";
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "@/lib/notifications/state";
import type { NotificationItem } from "./types";

/**
 * Notifications store — hydrated from the real timeline-derived feed, with read/dismissed state now
 * persisted SERVER-SIDE per member (cross-device) via `notification_state`. Mutations apply
 * optimistically for snappy UI, then re-sync from the server on failure. A small shared store so the
 * bell popover and the full page stay in sync.
 */
let items: NotificationItem[] | null = null;
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();
const EMPTY: NotificationItem[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pull the authoritative feed (server applies read state + drops dismissed). */
async function fetchFeed() {
  try {
    items = await getNotifications();
  } catch {
    items = [];
  } finally {
    loaded = true;
    loading = false;
    emit();
  }
}

/** Fetch once on first mount. Idempotent. */
async function loadOnce() {
  if (loaded || loading) return;
  loading = true;
  await fetchFeed();
}

/** Re-sync from the server (used to roll back a failed optimistic mutation). */
async function resync(message: string) {
  toast.error(message);
  await fetchFeed();
}

/** Hook that ensures the feed is loaded (call from the bell + page). */
export function useLoadNotifications() {
  React.useEffect(() => {
    void loadOnce();
  }, []);
}

export function markRead(id: string) {
  if (!items) return;
  const target = items.find((n) => n.id === id);
  if (!target || target.read) return; // already read → no server round-trip
  items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
  void markNotificationRead(id).then((res) => {
    if (!res.ok) void resync(res.error);
  });
}

export function markAllRead() {
  if (!items) return;
  const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length === 0) return;
  items = items.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
  void markAllNotificationsRead(unreadIds).then((res) => {
    if (!res.ok) void resync(res.error);
  });
}

export function dismiss(id: string) {
  if (!items) return;
  items = items.filter((n) => n.id !== id);
  emit();
  void dismissNotification(id).then((res) => {
    if (!res.ok) void resync(res.error);
  });
}

export function useNotifications(): NotificationItem[] {
  return React.useSyncExternalStore(subscribe, () => items ?? EMPTY, () => EMPTY);
}

/** True once the first real fetch has resolved (drives the loading skeleton). */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, () => loaded, () => false);
}
