const CACHE_NAME = "doctools-cache-v3";
const urlsToPrecache = [
  "./", // Caches index.html implicitly from the root
  "./index.html",
  "./invoice.html",
  // You can still pre-cache specific static assets that you know won't change names,
  // or that are always requested directly, like the root paths.
  // For Vite's bundled JS/CSS, the 'fetch' strategy below handles them.
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Opened cache");
        return cache.addAll(urlsToPrecache);
      })
      .catch((error) => {
        console.error("Service Worker: Pre-caching failed", error);
      })
  );
});

self.addEventListener("fetch", (event) => {
  // We only want to handle GET requests, and not POST requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If a cached response is found, return it
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Check if we received a valid response
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and can only be consumed once. We must clone it so that
          // we can consume the original and pass a clone to the cache.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Fallback for when network is unavailable and no cache is found
          // You might want to serve an offline page here
          console.log(
            "Service Worker: Fetch failed, and no cache found for:",
            event.request.url
          );
          // Optionally, serve an offline page
          // return caches.match('/offline.html');
        });
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("Service Worker: Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
