const CACHE_NAME = "family-chat-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first para navegação, com fallback simples ao shell offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/").then((res) => res || Response.error()))
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Family Chat", body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    vibrate: [120, 60, 120],
    data: { conversationId: data.conversationId, dateOfArrival: Date.now() },
    tag: data.conversationId || "family-chat",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || "Family Chat", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const conversationId = event.notification.data?.conversationId;
  const targetUrl = conversationId ? `/chat/${conversationId}` : "/chat";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(targetUrl));
      if (existing) return existing.focus();
      const anyClient = clientsArr[0];
      if (anyClient) {
        anyClient.navigate(targetUrl);
        return anyClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
