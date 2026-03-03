const CACHE_NAME = 'shadow-tv-images-v3';
const IMAGE_URL_PATTERN = /proxy-icon/;

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Limpiar caches antiguos de versiones anteriores
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Borrando caché antigua:', cacheName);
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
    if (!IMAGE_URL_PATTERN.test(url.pathname) && !IMAGE_URL_PATTERN.test(url.search)) {
        return; // Dejar pasar todo lo demás sin modificar
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            // 1. Cache-First: Si hay respuesta en caché, devolverla inmediatamente
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
                // Revalidar en segundo plano (Stale-While-Revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                }).catch(() => {/* offline, no hay problema */ });
                return cachedResponse;
            }

            // 2. Cache MISS: Ir a la red
            try {
                const networkResponse = await fetch(event.request);

                // Solo cachear respuestas exitosas con imagen real (no 204 vacíos)
                if (networkResponse && networkResponse.status === 200) {
                    const contentType = networkResponse.headers.get('content-type') || '';
                    if (contentType.startsWith('image/')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                }
                return networkResponse;
            } catch (e) {
                // Offline y sin caché - devolver respuesta vacía
                return new Response(null, { status: 204 });
            }
        })
    );
});
