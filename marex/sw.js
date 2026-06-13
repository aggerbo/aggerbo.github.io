/* Offline support: pre-cache the app shell, serve cache-first.
   Bump VERSION on every deploy so clients pick up changes. */
const VERSION = "v2.1.0";
const CACHE = "marex370-" + VERSION;
const SHELL = [
  "./",
  "index.html",
  "css/app.css",
  "js/i18n.js",
  "js/content-en.js",
  "js/content-da.js",
  "js/illustrations.js",
  "js/db.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    )
  );
});
