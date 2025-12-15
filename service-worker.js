const CACHE_NAME = 'accounts-diary-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

// Files to cache on install
const STATIC_FILES = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './db.js',
    './csv.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Segoe+UI:wght@300;400;500;600&display=swap'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker installing');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker installed');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    // For API calls, use network-first strategy
    if (event.request.url.includes('/api/') || event.request.url.includes('neon.tech')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // For static files, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log('Serving from cache:', event.request.url);
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Add to dynamic cache
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.log('Fetch failed:', error);
                        
                        // For HTML pages, return offline page
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        
                        // For CSS/JS, return from static cache
                        if (event.request.url.includes('.css') || event.request.url.includes('.js')) {
                            return caches.match(event.request.url);
                        }
                        
                        return new Response('Offline - No connection available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Sync event for background sync (if supported)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-entries') {
        console.log('Background sync triggered');
        event.waitUntil(syncEntries());
    }
});

// Background sync function
async function syncEntries() {
    try {
        // Get unsynced entries from IndexedDB
        const unsyncedEntries = await getUnsyncedEntriesFromDB();
        
        if (unsyncedEntries.length === 0) {
            console.log('No entries to sync');
            return;
        }
        
        console.log('Syncing', unsyncedEntries.length, 'entries');
        
        // Here you would implement actual sync logic
        // For now, just mark as synced
        await markEntriesAsSynced(unsyncedEntries);
        
        // Send notification
        self.registration.showNotification('Accounts Diary', {
            body: `Successfully synced ${unsyncedEntries.length} entries`,
            icon: './icon-192.png',
            badge: './icon-72.png'
        });
        
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// Helper function to get unsynced entries (simplified)
async function getUnsyncedEntriesFromDB() {
    // This would need access to IndexedDB
    // For now, return empty array
    return [];
}

// Helper function to mark entries as synced (simplified)
async function markEntriesAsSynced(entries) {
    // This would update IndexedDB
    console.log('Marking entries as synced:', entries.length);
}

// Push notification event
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'New notification from Accounts Diary',
        icon: './icon-192.png',
        badge: './icon-72.png',
        data: {
            url: data.url || './'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Accounts Diary', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url === event.notification.data.url && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Otherwise, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url);
                }
            })
    );
});
