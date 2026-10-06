// CampusQuest service worker.
// Bump CACHE_VERSION on any change here to flush old caches.
const CACHE_VERSION = "v2";
const SHELL_CACHE = `campusquest-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `campusquest-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Don't let one failed file block installation.
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("campusquest-") && k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests. Everything else (game API on another
  // domain, Firebase auth, map tiles, Google Fonts) goes straight to network,
  // so live game data is never served from cache.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: network first, fall back to cached app shell / offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put("/", copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match("/")) || (await cache.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Vite's fingerprinted bundles never change for a given filename: cache first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Other same-origin static files (icons, avatars, images): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
