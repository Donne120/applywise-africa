/* ApplyWise Africa — minimal offline shell service worker.
   Strategy:
   - Static assets (same-origin GET): stale-while-revalidate.
   - Navigation requests: network-first, fall back to cached "/" if offline.
   - Cross-origin (Supabase, Google APIs): always go to network. */

const VERSION = 'aw-v1';
const SHELL = ['/', '/today', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(r => {
        if (r && r.status === 200) {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
