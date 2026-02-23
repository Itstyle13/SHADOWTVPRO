const CACHE_NAME = 'shadow-tv-images-v2';
const IMAGE_URL_PATTERN = /proxy-icon/;

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Limpiar caches antiguos
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Solo interceptar peticiones de imágenes del proxy
    if (IMAGE_URL_PATTERN.test(url.pathname) || IMAGE_URL_PATTERN.test(url.search)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => null);

                    // Devolver el cache inmediatamente si existe (Stale-While-Revalidate)
                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
});
