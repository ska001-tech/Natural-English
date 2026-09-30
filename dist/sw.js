const CACHE = 'natural-english-v4';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './app.bundle.js', './data-model.js', './library-db.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './data/index.json', './data/day-001.json', './data/starter.json', './data/Natural-English-Sample.json'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('natural-english-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  if (url.pathname.startsWith(scope + 'data/')) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try { const response = await fetch(event.request, {signal: controller.signal}); if (!response.ok) return cached || response; const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); return response; }
      catch { return cached || new Response('Offline', { status: 503 }); }
      finally { clearTimeout(timer); }
    })()); return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : new Response('Offline', {status:503}))));
});
