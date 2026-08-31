const CACHE_NAME = "infograf-plus-v2";

const BASE_PATH = "/infograf-plus";

const CORE_FILES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/categories.html`,
  `${BASE_PATH}/manifest.json`
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_FILES);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {

        if (response && response.status === 200) {

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

        }

        return response;

      })
      .catch(() => {
        return caches.match(event.request);
      })
  );

});
