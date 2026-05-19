// sw.js — Service Worker para Tortas Tortuga PWA
const CACHE_NAME = 'tortuga-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-apple.png',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap'
];

// Instalar: guardar todos los assets en caché
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: responder con caché primero, luego red
self.addEventListener('fetch', (e) => {
    // Solo manejar GET
    if (e.request.method !== 'GET') return;

    // Nominatim/OpenStreetMap: siempre desde red (mapas en vivo)
    if (e.request.url.includes('openstreetmap') || e.request.url.includes('nominatim')) {
        e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            return cached || fetch(e.request).then((response) => {
                // Guardar en caché respuestas exitosas
                if (response && response.status === 200 && response.type !== 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback para páginas HTML
            if (e.request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
            }
        })
    );
});
