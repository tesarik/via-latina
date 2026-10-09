// __SW_VERSION__ is replaced at build time (see vite.config.ts). In dev mode the
// SW is not registered, so the literal placeholder never reaches a browser.
const CACHE = "vialatina-__SW_VERSION__";

// No skipWaiting() on install: a new build waits until the learner accepts the
// in-app "new version" prompt, which posts SKIP_WAITING. (On a first-ever
// install there is no active worker, so activation happens immediately anyway.)
self.addEventListener("install", () => {});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  // The page lists what it loaded before this worker took control (the very
  // first visit), so the app works offline from then on.
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((c) =>
        Promise.all(
          data.urls
            .filter((u) => new URL(u).origin === self.location.origin)
            .map((u) => c.match(u, { ignoreVary: true }).then((hit) => hit || c.add(u).catch(() => {}))),
        ),
      ),
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Pages: network first so a new deploy shows up, cached copy when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => {
          const base = new URL(self.registration.scope).pathname;
          const opts = { ignoreVary: true };
          return caches.match(req, opts).then((r) => r || caches.match(base + "index.html", opts) || caches.match(base, opts));
        }),
    );
    return;
  }

  // Assets (hashed JS/CSS, fonts, icon): cache first.
  // ignoreVary: module scripts are requested with an Origin header and servers
  // often answer "Vary: Origin", which would otherwise make every lookup miss.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
