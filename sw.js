// 以前の v4 → v5 に変更（強制更新用）
const CACHE_NAME = 'points-cache-v5';
const URLS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});
