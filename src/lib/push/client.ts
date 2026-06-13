"use client";

/**
 * Browser-side Web Push helpers used by Settings → Notifications. These run only in the browser
 * (they touch `navigator`/`window`) and call the server actions to persist the subscription.
 */
import { getPushPublicKey, savePushSubscription, removePushSubscription } from "./actions";

export type PushSupport = "supported" | "unsupported";

/** Whether this browser can do Web Push at all (Service Worker + Push + Notification APIs). */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    ? "supported"
    : "unsupported";
}

/** Current Notification permission ("default" | "granted" | "denied"), or "default" if unsupported. */
export function notificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "default";
  return Notification.permission;
}

/** VAPID public key (base64url) → the Uint8Array the PushManager wants as applicationServerKey. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  return existing ?? navigator.serviceWorker.register("/sw.js");
}

/** Is THIS browser already subscribed (a PushSubscription exists)? */
export async function isSubscribed(): Promise<boolean> {
  if (pushSupport() !== "supported") return false;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return false;
  return Boolean(await reg.pushManager.getSubscription());
}

export type EnableResult = { ok: true } | { ok: false; error: string };

/** Register the SW, request permission, subscribe, and persist the subscription server-side. */
export async function enablePush(): Promise<EnableResult> {
  if (pushSupport() !== "supported") {
    return { ok: false, error: "This browser doesn't support push notifications." };
  }
  const { enabled, key } = await getPushPublicKey();
  if (!enabled || !key) {
    return { ok: false, error: "Push notifications aren't available right now." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notifications are blocked. Enable them in your browser settings." };
  }

  try {
    const reg = await ensureServiceWorker();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: the DOM lib types applicationServerKey as BufferSource; our Uint8Array satisfies it.
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      }));

    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return { ok: false, error: "Couldn't read the push subscription. Please try again." };
    }

    const res = await savePushSubscription({
      endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent.slice(0, 400),
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  } catch {
    return { ok: false, error: "Couldn't enable push notifications. Please try again." };
  }
}

/** Unsubscribe this browser and remove the stored subscription. */
export async function disablePush(): Promise<EnableResult> {
  if (pushSupport() !== "supported") return { ok: true };
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await removePushSubscription(endpoint);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't disable push notifications. Please try again." };
  }
}
