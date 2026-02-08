const CACHE_NAME = 'nova-detailing-v3.0';
const OFFLINE_URL = '/index.html';

// Files to cache for offline functionality
const CORE_CACHE_FILES = [
  '/index.html',
  '/servicii.html',
  '/configurator.html',
  '/rezervare.html',
  '/scoala.html',
  '/despre.html',
  '/galerie.html',
  '/blog.html',
  '/contact.html',
  '/faq.html',
  '/politici.html',
  '/manifest.webmanifest',
  // External CDN resources
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js'
];

// Assets to cache (images, icons)
const ASSET_CACHE_FILES = [
  '/assets/logo.svg',
  '/assets/favicon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching core files');
        return cache.addAll([...CORE_CACHE_FILES, ...ASSET_CACHE_FILES]);
      })
      .then(() => {
        console.log('Service Worker: Core files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and non-GET requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://cdn.tailwindcss.com') &&
      !event.request.url.startsWith('https://unpkg.com/alpinejs')) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests - don't cache, always go to network
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a basic error response for failed API calls
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Offline - serviciul nu este disponibil momentan' 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Serve cached page or offline fallback
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Fallback to home page if specific page not cached
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Found in cache, return cached version
          return response;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it's a stream
            const responseToCache = response.clone();

            // Add successful responses to cache for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache certain file types to avoid bloating cache
                const url = event.request.url;
                const shouldCache = url.includes('.css') || 
                                   url.includes('.js') || 
                                   url.includes('.png') || 
                                   url.includes('.jpg') || 
                                   url.includes('.svg') ||
                                   url.includes('.html');

                if (shouldCache || url.includes('.webp') || url.includes('.woff2')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Fetch failed for:', event.request.url);
            
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, just let them fail
            throw error;
          });
      })
  );
});

// Background sync for form submissions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-booking') {
    event.waitUntil(
      // Handle offline form submissions when back online
      syncBookings()
    );
  }
});

// Push notification support (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: 'detailing-notification',
      renotify: true,
      actions: [
        {
          action: 'view',
          title: 'Vezi detalii'
        },
        {
          action: 'dismiss', 
          title: 'Închide'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/rezervare.html')
    );
  }
});

// Helper function for background sync
async function syncBookings() {
  // This would handle offline form submissions
  // For now, just log that we're ready for background sync
  console.log('Service Worker: Ready for background sync');
  
  try {
    // Get offline bookings from IndexedDB
    const offlineBookings = await getOfflineBookings();
    
    for (const booking of offlineBookings) {
      try {
        // Try to submit each booking
        const response = await fetch('/api/create-booking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(booking.data)
        });
        
        if (response.ok) {
          // Remove from offline storage after successful submission
          await removeOfflineBooking(booking.id);
          console.log('Service Worker: Offline booking synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// IndexedDB helpers for offline functionality (future enhancement)
async function getOfflineBookings() {
  // Implementation for retrieving offline bookings
  return [];
}

async function removeOfflineBooking(id) {
  // Implementation for removing synced bookings
  console.log('Removing offline booking:', id);
}

// Utility function to show offline indicator
function showOfflineIndicator() {
  // This could be used to notify the main thread about offline status
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'OFFLINE_STATUS',
        isOffline: true
      });
    });
  });
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('Service Worker: Back online');
  // Trigger background sync when back online
  self.registration.sync.register('background-booking');
});

self.addEventListener('offline', () => {
  console.log('Service Worker: Gone offline');
  showOfflineIndicator();
});