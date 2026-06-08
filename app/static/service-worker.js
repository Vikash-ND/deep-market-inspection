const CACHE_NAME = "dmi-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/static/style.css",
  "/static/app.js",
  "/static/auth.js",
  "/static/analysis.js",
  "/static/compare.js",
  "/static/portfolio.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});