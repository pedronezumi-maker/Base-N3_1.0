const CACHE_NAME = 'accessrun-n3-v1';
const SHELL_ASSETS = [
    '/',
    '/Index',
    '/manifest.json',
    '/images/app-icon-192x192.png',
    '/images/app-icon-512x512.png'
];

const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Instalar — cachear shell e CDNs
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([...SHELL_ASSETS, ...CDN_ASSETS]);
        })
    );
    self.skipWaiting();
});

// Ativar — limpar caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch — estratégia mista
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Firebase e Gemini → sempre rede (nunca cachear)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('generativelanguage.googleapis.com') ||
        url.hostname.includes('emailjs.com')) {
        return; // Deixa o browser tratar normalmente
    }

    // CDNs e shell → Cache First, fallback para rede
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                // Cachear novas respostas de CDN
                if (response.ok && (url.hostname.includes('cdnjs.') ||
                    url.hostname.includes('cdn.jsdelivr.net') ||
                    url.hostname.includes('cdn.tailwindcss.com'))) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
