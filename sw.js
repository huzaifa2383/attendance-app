const CACHE_NAME = "madrasa-attendance-v2";
const APP_SHELL = [
  "./index.html",
  "./manifest.json"
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
// Network-first for Firestore/API calls (always live data).
// Network-first for index.html too, so app updates are picked up immediately on next
// load, with a cache fallback for when the network is unavailable.
// Cache-first for the remaining app-shell assets (unchanged behavior).
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  if (url.includes("firestore.googleapis.com") || url.includes("googleapis.com")) {
    return; // always go to network for live data
  }

  if (url.includes("index.html") || event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
