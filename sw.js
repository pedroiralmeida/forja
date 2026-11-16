// Service worker da Forja: guarda a app em cache para funcionar sem internet.
// Quando mudares algum ficheiro, sobe a VERSION para os dispositivos receberem a versão nova.
const VERSION = 'forja-v1.6.1';
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./fonts/barlow-condensed-latin-500-normal.woff2",
  "./fonts/barlow-condensed-latin-600-normal.woff2",
  "./fonts/barlow-condensed-latin-700-normal.woff2",
  "./fonts/barlow-latin-400-normal.woff2",
  "./fonts/barlow-latin-500-normal.woff2",
  "./fonts/barlow-latin-600-normal.woff2",
  "./fonts/barlow-latin-700-normal.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./js/charts.js",
  "./js/data.js",
  "./js/engine.js",
  "./js/main.js",
  "./js/plates.js",
  "./js/protein.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/util.js",
  "./js/view-body.js",
  "./js/view-more.js",
  "./js/view-stock.js",
  "./js/view-progress.js",
  "./js/view-today.js",
  "./js/view-workout.js"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // GitHub API e afins: sempre rede
  if (url.pathname.includes('/claude/')) return; // dados enviados pelo Claude: sempre da rede
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
