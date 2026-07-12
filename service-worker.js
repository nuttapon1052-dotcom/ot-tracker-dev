var CACHE_NAME = "ot-tracker-cache-v8";
var APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/static-holidays.js",
  "./js/holiday-names-th.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Network-first for everything in the app shell (HTML/CSS/JS), so a fresh
// deploy is always picked up on the next load when online. Cache is only a
// fallback for offline use - it is kept up to date on every successful
// fetch instead of being trusted as the source of truth. This matters a lot
// more than raw speed for a small app like this: silently serving a stale
// app.js forever (the old cache-first behavior) is a much worse bug than a
// network round-trip on each load.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined);
      });
    })
  );
});
