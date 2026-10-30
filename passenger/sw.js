// کارکردن بێ ئینتەرنێت: سەرەتا لە تۆڕ، ئەگەر نەبوو لە بیرگە
const CACHE = 'taxikam-passenger-v47';
const FILES = ['./', './index.html', './app.js', './manifest.json', './icon-192.png', '../shared/core.css', '../shared/core.js', '../shared/maps.js', '../shared/wallet.js', '../shared/firebase-config.js', '../shared/cloud.js', '../shared/logo.png', '../shared/fonts/NotoNaskhArabic.woff2'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith('taxikam-passenger')).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // نەخشەی Google و شتی دەرەوە ڕاستەوخۆ لە تۆڕ (بێ بیرگە)
  const same = new URL(e.request.url).origin === location.origin;
  if (!same && !/gstatic\.com\/firebasejs\//.test(e.request.url)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (new URL(e.request.url).origin === location.origin || /gstatic\.com\/firebasejs\//.test(e.request.url))) caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
