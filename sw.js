// =================================================================================
// SERVICE WORKER - Access.Run N3 PWA
// Estratégia: Network-First com fallback de cache para CDN assets
// =================================================================================

const CACHE_NAME = 'accessrun-n3-v1';

// Recursos essenciais para cache (CDNs usados pela aplicação)
const PRECACHE_URLS = [
    './',
    './Index',
    './manifest.json'
];

// CDN resources to cache on first use (cache-first strategy)
const CDN_HOSTS = [
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net'
];

// Install: Pre-cache core resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: Intelligent caching strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Firebase/Firestore API calls (always network)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('emailjs.com')) {
        return;
    }

    // CDN resources: Cache-first (they have version hashes)
    if (CDN_HOSTS.some(host => url.hostname === host)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached);
            })
        );
        return;
    }

    // App resources: Network-first with cache fallback
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
