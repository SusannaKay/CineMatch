const CACHE_NAME = 'cinematch-shell-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/css/styles.css',
  '/js/main.js',
  '/js/state.js',
  '/js/socket.js',
  '/js/watchlist.js',
  '/js/utils/dom.js',
  '/js/utils/banlist.js',
  '/js/data/questionnaire.js',
  '/js/screens/details.js',
  '/js/screens/filters.js',
  '/js/screens/lobby.js',
  '/js/screens/results.js',
  '/js/screens/solo.js',
  '/js/screens/suggestion.js',
  '/js/screens/swipe.js',
  '/js/screens/watchlist.js',
  '/js/screens/welcome.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Only the static app shell is cached: API calls and Socket.IO always hit the network,
// so discovery, search, and multiplayer state are never served stale.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
