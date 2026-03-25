// ============================================================
// IBI Marketplace — Service Worker (PWA)
// Version: 1.0
// ============================================================

const CACHE_NAME    = 'ibi-marketplace-v1';
const OFFLINE_URL   = '/Online/';

// Files to cache for offline use
const CACHE_FILES = [
  '/Online/',
  '/Online/index.html',
  '/Online/admin.html',
  '/Online/print.html',
  '/Online/manifest.json',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Hind:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// ── Install: cache core files ──────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching core files');
      // Cache one by one to avoid failing on network errors
      return Promise.allSettled(
        CACHE_FILES.map(url => cache.add(url).catch(e => console.warn('[SW] Could not cache:', url)))
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean old caches ─────────────────────────────
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: network first, fallback to cache ────────────────
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Google Apps Script calls (always need network)
  if (url.includes('script.google.com') ||
      url.includes('emailjs.com') ||
      url.includes('imgbb.com') ||
      url.includes('api.qrserver.com')) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Network failed — try cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // If main page request, return cached homepage
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ── Background Sync (for future use) ──────────────────────
self.addEventListener('sync', function(event) {
  if (event.tag === 'ibi-order-sync') {
    console.log('[SW] Background sync: ibi-order-sync');
  }
});

// ── Push Notifications (for future use) ───────────────────
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'IBI Marketplace', {
      body:    data.body    || 'You have a new notification',
      icon:    data.icon    || '/Online/icon-192.png',
      badge:   data.badge   || '/Online/icon-192.png',
      data:    data.url     || '/Online/',
      actions: data.actions || []
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/Online/')
  );
});

console.log('[SW] IBI Marketplace Service Worker loaded ✅');
