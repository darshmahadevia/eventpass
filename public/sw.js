// Offline shell for the door scanner. Only two things are handled:
// content-hashed build assets (cache first) and scanner page loads
// (network first, cached copy when offline). Everything else, including
// the scan API, goes straight to the network.
const CACHE = "eventpass-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const store = (request, response) => {
  if (response.ok && !response.redirected) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => store(request, res))),
    );
  } else if (request.mode === "navigate" && url.pathname.startsWith("/scan/")) {
    event.respondWith(
      fetch(request)
        .then((res) => store(request, res))
        .catch(() =>
          caches
            .match(url.pathname, { ignoreSearch: true, ignoreVary: true })
            .then((hit) => hit || Response.error()),
        ),
    );
  }
});
