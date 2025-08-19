// sw.js（簡易版）
// 更新を確実に反映したい時はバージョン番号を上げてください（v1 → v2 …）
const CACHE_NAME = 'points-simple-v1';

// まずは同一フォルダのローカル資産だけを確実にプリキャッシュ
// ※ CDN（React/Babel/Chart.js）は初回アクセス時に動的キャッシュします
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  // 新しいSWを即時有効化
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // index.html を "cache: 'reload'" で取得して古いネットワークレスポンスを避ける
      await cache.addAll(
        PRECACHE_URLS.map((u) => new Request(u, { cache: 'reload' }))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // 旧キャッシュを掃除して、コントロールを即時取得
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// 基本方針：ネットワーク優先（成功したらキャッシュ更新）→ 失敗時はキャッシュfallback
self.addEventListener('fetch', (event) => {
  const req = event.request;

  event.respondWith(
    (async () => {
      try {
        // 通常の取得を試みる
        const netRes = await fetch(req);
        // 同じオリジンのリクエストやCDNなど、取れたものは極力キャッシュへ保存
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, netRes.clone());
        return netRes;
      } catch (err) {
        // オフライン等で失敗したらキャッシュを探す
        const cached = await caches.match(req);
        if (cached) return cached;

        // 画面遷移（HTMLナビゲーション）の場合は index.html を返す
        if (req.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }

        // それでも無理ならエラーを投げる（ブラウザの標準エラーページ）
        throw err;
      }
    })()
  );
});
