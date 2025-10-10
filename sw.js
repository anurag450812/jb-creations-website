/*
 * SERVICE WORKER FOR JB CREATIONS WEBSITE
 * Handles caching, offline functionality, and performance optimization
 */

const CACHE_VERSION = 'v1.2.0';
const STATIC_CACHE = `jb-creations-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `jb-creations-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `jb-creations-images-${CACHE_VERSION}`;

// Static resources to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/customize.html',
    '/cart.html',
    '/style.css',
    '/script.js',
    '/performance-optimizations.css',
    '/mobile-responsiveness-fixes.css',
    '/performance-optimizations.js',
    '/third-party-optimizations.js',
    '/caching-optimization.js',
    '/cloudinary-config.js',
    '/jb-utils.js',
    '/manifest.json'
];

// Network-first resources (always fetch fresh if possible)
const NETWORK_FIRST = [
    '/api/',
    '/auth/',
    '/checkout.html',
    '/order-success.html'
];

// Cache-first resources (serve from cache if available)
const CACHE_FIRST = [
    '.css',
    '.js',
    '.woff',
    '.woff2',
    '.ttf',
    '.ico'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== IMAGE_CACHE) {
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

// Fetch event - handle all requests
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (isImageRequest(request)) {
        event.respondWith(handleImageRequest(request));
    } else if (isNetworkFirst(request)) {
        event.respondWith(handleNetworkFirst(request));
    } else if (isCacheFirst(request)) {
        event.respondWith(handleCacheFirst(request));
    } else {
        event.respondWith(handleStaleWhileRevalidate(request));
    }
});

// Check if request is for an image
function isImageRequest(request) {
    const url = new URL(request.url);
    return request.destination === 'image' ||
           /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

// Check if request should use network-first strategy
function isNetworkFirst(request) {
    return NETWORK_FIRST.some(pattern => request.url.includes(pattern));
}

// Check if request should use cache-first strategy
function isCacheFirst(request) {
    return CACHE_FIRST.some(extension => request.url.includes(extension));
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
    try {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const response = await fetch(request);
        
        if (response.ok) {
            // Only cache successful responses
            cache.put(request, response.clone());
            
            // Limit image cache size
            limitCacheSize(IMAGE_CACHE, 100);
        }
        
        return response;
    } catch (error) {
        console.error('Image request failed:', error);
        // Return offline fallback image if available
        return caches.match('/offline-image.svg');
    }
}

// Network-first strategy (for API calls, dynamic content)
async function handleNetworkFirst(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        if (response.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
            limitCacheSize(DYNAMIC_CACHE, 50);
        }
        
        return response;
    } catch (error) {
        // Fall back to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Cache-first strategy (for static assets)
async function handleCacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('Cache-first request failed:', error);
        return new Response('Resource not available', { 
            status: 404, 
            statusText: 'Not Found' 
        });
    }
}

// Stale-while-revalidate strategy (for HTML pages)
async function handleStaleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
            limitCacheSize(DYNAMIC_CACHE, 50);
        }
        return response;
    }).catch(error => {
        console.error('Fetch failed in stale-while-revalidate:', error);
        return cachedResponse;
    });
    
    // Return cached version immediately, update in background
    return cachedResponse || fetchPromise;
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxSize) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > maxSize) {
            // Remove oldest entries
            const keysToDelete = keys.slice(0, keys.length - maxSize);
            await Promise.all(
                keysToDelete.map(key => cache.delete(key))
            );
        }
    } catch (error) {
        console.error('Failed to limit cache size:', error);
    }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Handle offline actions when connection is restored
    console.log('Background sync triggered');
    
    // You can implement offline form submissions, etc. here
}

// Push notifications (if needed)
self.addEventListener('push', event => {
    if (event.data) {
        const options = {
            body: event.data.text(),
            icon: '/icon-192.png',
            badge: '/icon-72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };
        
        event.waitUntil(
            self.registration.showNotification('JB Creations', options)
        );
    }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('Service Worker loaded successfully');