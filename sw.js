// GERADO POR tools/build-sw.js — nao edite a mao.
const VERSION = '867bfa5995';
const CACHE = 'mpa-' + VERSION;
const ASSETS = [
  "./",
  "css/style.css",
  "fonts/asap-latin.woff2",
  "fonts/fraunces-latin.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "index.html",
  "js/audio.js",
  "js/game.js",
  "js/nipplejs.min.js",
  "js/pwa.js",
  "manifest.webmanifest"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegacao: rede primeiro (pega atualizacoes), cai no index cacheado offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Assets: cache primeiro, revalida em segundo plano.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
