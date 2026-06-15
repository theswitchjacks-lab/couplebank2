const CACHE_NAME = "couplebank2-v3";

const urlsToCache = [
  "/",
  "/static/style.css",
  "/static/app.js",
  "/static/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // API（POST/DELETE）はキャッシュしない
  if (req.method !== "GET" || req.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(req).then((res) => res || fetch(req))
  );
});
