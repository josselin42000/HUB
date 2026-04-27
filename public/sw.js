// Service Worker for Web Push
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Notification", body: "", url: "/", type: "info" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  const isAlert = data.type === "alerte";
  const options = {
    body: data.body,
    icon: "/placeholder.svg",
    badge: "/placeholder.svg",
    vibrate: isAlert ? [300, 100, 300, 100, 300] : [150, 75, 150],
    requireInteraction: isAlert,
    tag: data.type + "-" + Date.now(),
    data: { url: data.url },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
