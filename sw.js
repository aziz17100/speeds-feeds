const VERSION = 'ss-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: serve from cache, refresh in the background.
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((hit) => {
          const net = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // App files: cache first, network as fallback.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => caches.match('index.html'))
      )
    );
  }
});
