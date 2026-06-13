/*
 * Kintwadi service worker — Web Push only.
 *
 * Receives push messages from the server (src/lib/push/send.ts) and shows a notification; clicking it
 * focuses an existing tab (navigating it to the deep link) or opens a new one. Kept deliberately tiny:
 * no offline caching, so it can never serve stale app code.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "Kintwadi", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Kintwadi";
  const url = payload.url || "/dashboard";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.urgent),
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        // Reuse an open app tab if we have one.
        if ("focus" in client) {
          try {
            if ("navigate" in client) await client.navigate(targetUrl);
          } catch (_) {
            /* navigation can be blocked cross-origin — just focus instead */
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })(),
  );
});
