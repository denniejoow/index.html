// System-Override Service Worker
// Cached-first Strategie – App läuft auch ohne WLAN

const CACHE = 'system-override-v1';

const PRECACHE = [
  '/system-override/',
  '/system-override/index.html',
  '/system-override/manifest.json',
  '/system-override/icon.svg',
];

// ── Install: Dateien vorläden ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: alte Caches löschen ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache-first, Netz als Fallback ─────────────
self.addEventListener('fetch', event => {
  // Nur GET-Anfragen cachen
  if (event.request.method !== 'GET') return;

  // CDN-Ressourcen (Icons-Font) netzwerkbevorzugt
  const url = new URL(event.request.url);
  const isCDN = url.hostname !== self.location.hostname;

  if (isCDN) {
    // Netz zuerst, Cache als Fallback
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache zuerst (eigene Dateien = app shell)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
