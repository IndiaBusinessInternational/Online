// ============================================================
// IBI Marketplace — Service Worker (PWA)
//
// Restored 12 Aug 2026. This file was accidentally truncated to 0 bytes in
// commit 78d6feb (27 Jul 2026), a commit about the duplicate-listing dialog
// that never mentions it. An empty script still REGISTERS successfully — it
// just installs a worker that does nothing — so the shop lost offline support
// and PWA install for two weeks without a single error anywhere.
//
// Strategy is network-first: the network answer always wins while the shopper
// is online, and the cache is only consulted when the request actually fails.
// That is deliberate. Prices, stock and listings come from the Google Sheet and
// must never be served stale from a shopper's device.
// ============================================================

// Bump on EVERY deploy that changes cached files. Activate deletes every cache
// whose name is not this one, so a bump is what purges the old copies.
const CACHE_NAME  = 'ibi-marketplace-v18-0';

// Only the shell. index.html is here so a navigation still resolves offline;
// because fetch is network-first it is never PREFERRED over the live copy.
//
// Deliberately NOT precached:
//   /sw.js      — a service worker must never cache itself. Doing so is how a
//                 worker becomes unreplaceable and a bad build sticks forever.
//   /admin.html — staff-only, changes with every auth change, and has no
//                 business sitting on a customer's device.
const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Hind:wght@300;400;500;600&display=swap'
];

// Hosts that must ALWAYS hit the network and never be stored. The first is the
// backend: caching an API reply would show a shopper a stale price or a
// sold-out item as in stock.
const NEVER_CACHE = [
  'script.google.com',
  'emailjs.com',
  'imgbb.com',
  'api.qrserver.com',
  'google-analytics',
  'googletagmanager'
];

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // allSettled + per-file catch: one unreachable font must not abort the
        // whole install and leave the site with no worker at all.
        return Promise.allSettled(
          CACHE_FILES.map(function (url) {
            // ⚠ `cache.add(url)` fetches through the ordinary HTTP cache, so a
            // browser holding a still-fresh index.html will happily precache
            // YESTERDAY'S file under today's CACHE_NAME — a version bump that
            // ships the previous build. {cache:'reload'} forces the network.
            return cache.add(new Request(url, { cache: 'reload' })).catch(function () {
              console.warn('[SW] could not precache:', url);
            });
          })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// ── Activate: delete every cache that is not the current one ──
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE_NAME; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// ── Fetch: network-first, cache only as an offline fallback ──
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = req.url;
  for (var i = 0; i < NEVER_CACHE.length; i++) {
    if (url.indexOf(NEVER_CACHE[i]) !== -1) return;
  }

  // Store only our own files. Product photos come from Drive and lh3, dozens
  // per page and megabytes each — caching those would grow without limit and
  // get the whole storage bucket evicted, taking the shell down with it.
  var sameOrigin = url.indexOf(self.location.origin) === 0;

  event.respondWith(
    fetch(req)
      .then(function (response) {
        if (sameOrigin && response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
        }
        return response;
      })
      .catch(function () {
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          // Any page we have never seen (an SSR product URL, say) still opens
          // the shop rather than a browser error.
          if (req.mode === 'navigate') return caches.match('/');
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// ── Push notifications ─────────────────────────────────────
self.addEventListener('push', function (event) {
  if (!event.data) return;
  var d;
  try { d = event.data.json(); } catch (e) { return; }
  event.waitUntil(
    self.registration.showNotification(d.title || 'IBI Marketplace', {
      body:  d.body  || 'You have a new notification',
      icon:  d.icon  || '/icon.svg',
      badge: d.badge || '/icon.svg',
      data:  d.url   || '/'
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || '/'));
});
