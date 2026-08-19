const CACHE_NAME = "rafao-peptideos-pages-v3";
const BASE_URL = new URL(self.registration.scope);
const APP_SHELL = [
  BASE_URL.href,
  new URL("index.html", BASE_URL).href,
  new URL("styles.css", BASE_URL).href,
  new URL("app.mjs", BASE_URL).href,
  new URL("calculator.mjs", BASE_URL).href,
  new URL("syringe-visual.mjs", BASE_URL).href,
  new URL("manifest.webmanifest", BASE_URL).href,
  new URL("icon.svg", BASE_URL).href,
  new URL("logo.svg", BASE_URL).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== BASE_URL.origin || !requestUrl.pathname.startsWith(BASE_URL.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(BASE_URL.href))),
  );
});
