const CACHE_NAME = 'nightingale-v3';
const OFFLINE_URLS = [
  '/',
  '/favicon.ico',
  '/nightingale-icon.png',
  '/manifest.json',
  // Welcome-screen assets (optimised versions)
  '/olia-welcome.mp4',
  '/olia-welcome.jpg',
  '/olia-welcome-poster.webp',
  // Wordmark images used in every header render
  '/nightingale-wordmark.png',
  '/nightingale-wordmark-light.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});