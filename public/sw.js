// FortunesHQ Service Worker for Push Notifications and Caching
// Version is auto-incremented on each build

const CACHE_VERSION = 'v2';
const CACHE_NAME = `fortuneshq-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.ico'
];
// Note: Removed '/' and '/index.html' to always fetch fresh HTML

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - NetworkFirst for navigation, CacheFirst for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/functions/')) {
    return;
  }

  // Navigation requests - ALWAYS try network first for fresh HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigation responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache only if offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static assets - CacheFirst with network fallback
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses or opaque responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        // Cache successful responses for static assets
        if (event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Listen for cache clear messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches...');
    caches.keys().then((names) => {
      Promise.all(names.map((name) => caches.delete(name))).then(() => {
        console.log('[SW] All caches cleared');
      });
    });
  }
  
  // Skip waiting and take control immediately
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  let data = {
    title: 'FortunesHQ',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'default',
    data: { url: '/home', type: 'general' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  // Customize vibration pattern based on notification type
  let vibrate = [200, 100, 200];
  if (data.data?.type === 'prize_win') {
    vibrate = [100, 50, 100, 50, 200, 100, 300]; // Celebratory pattern
  } else if (data.data?.type === 'game_start') {
    vibrate = [50, 100, 50, 100, 150]; // Alert pattern
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag,
    vibrate: vibrate,
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  // Notify any open clients to play sound
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      // Send message to client to play sound
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'NOTIFICATION_RECEIVED',
            notificationType: data.data?.type || 'general'
          });
        });
      })
    ])
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/home';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

console.log('[SW] Service worker loaded');
