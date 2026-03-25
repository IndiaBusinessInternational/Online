// ============================================================
// IBI Marketplace — Service Worker (PWA)
// Version: 2.0 — Updated for indiabusinessinternational.online
// ============================================================

const CACHE_NAME  = 'ibi-marketplace-v2';   // bumped — forces old cache clear
const OFFLINE_URL = '/';

const CACHE_FILES = [
  '/',
  '/index.html',
  '/admin.html',
  '/print.html',
  '/manifest.json',
  '/sw.js',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Hind:wght@300;400;500;600&display=swap'
];

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Install v2');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.allSettled(
        CACHE_FILES.map(url => cache.add(url).catch(e => console.warn('[SW] Could not cache:', url)))
      );
    }).then(function() {
      return self.skipWaiting();   // activate immediately
    })
  );
});

// ── Activate: delete ALL old caches ───────────────────────
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate v2');
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: network-first, fallback to cache ────────────────
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Skip API / analytics calls — always network
  if (url.includes('script.google.com') ||
      url.includes('emailjs.com')       ||
      url.includes('imgbb.com')         ||
      url.includes('api.qrserver.com')  ||
      url.includes('google-analytics')  ||
      url.includes('wixstatic.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/');
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const d = event.data.json();
  event.waitUntil(
    self.registration.showNotification(d.title || 'IBI Marketplace', {
      body:  d.body  || 'You have a new notification',
      icon:  d.icon  || '/icon.svg',
      badge: d.badge || '/icon.svg',
      data:  d.url   || '/'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});

console.log('[SW] IBI Marketplace v2 loaded ✅');
