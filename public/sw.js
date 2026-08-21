// Nightingale service worker.
// IMPORTANT: This SW deliberately does NOT cache HTML navigations or Next.js
// build artifacts (/_next/*). Caching hashed JS/CSS chunks or the HTML document
// causes cross-deploy version skew: a stale cached page references old chunk
// hashes that 404 after a new deploy, producing ChunkLoadError / React #423
// crashes. We only precache a small set of static media/icons.
const CACHE_NAME = 'nightingale-v5';
const OFFLINE_URLS = [
  '/favicon.ico',
  '/nightingale-icon.png',
  '/manifest.json',
  // Welcome-screen assets (optimised versions)
  '/olia-welcome.jpg',
  '/olia-welcome-poster.webp',
  // Wordmark images used in every header render
  '/nightingale-wordmark.png',
  '/nightingale-wordmark-light.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableStatic(request, url) {
  // Only same-origin GET requests for our known static assets.
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  // Never touch Next.js build output or API routes.
  if (url.pathname.startsWith('/_next/')) return false;
  if (url.pathname.startsWith('/api/')) return false;
  return OFFLINE_URLS.includes(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let the browser handle navigations and all Next.js assets normally
  // (network + HTTP cache). Do not intercept — this prevents version skew.
  if (request.mode === 'navigate') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) return;

  // Cache-first for our small set of static media/icons.
  if (isCacheableStatic(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache complete, same-origin, OK responses (never 206/partial).
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic' &&
            !response.headers.get('content-range')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        });
      })
    );
  }
  // Everything else: do not intercept.
});
