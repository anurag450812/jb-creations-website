/**
 * Service Worker for JB Creations
 * Provides offline caching and performance optimization
 * Version: 1.0.0
 */

const CACHE_NAME = 'jb-creations-v1.1';
const RUNTIME_CACHE = 'jb-creations-runtime-v1.1';

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/mobile-performance-optimizer.js',
    '/mobile-responsiveness-enhanced.css',
    '/jb-utils.js'
];

// Cache images on demand
const IMAGE_CACHE_PATTERNS = [
    /room-preview-images/,
    /frame-texture/,
    /\.jpg$/,
    /\.png$/,
    /\.webp$/
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching critical assets');
                return cache.addAll(CRITICAL_ASSETS.map(url => {
                    return new Request(url, { cache: 'reload' });
                })).catch(err => {
                    console.warn('Service Worker: Some assets failed to cache:', err);
                    // Don't fail installation if some assets don't cache
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        // But cache external images if they match our patterns
        if (request.destination === 'image') {
            event.respondWith(
                caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request).then((response) => {
                        if (response.ok && response.status === 200 && !isPartialOrRange(request, response)) {
                            return caches.open(RUNTIME_CACHE).then((cache) => {
                                cache.put(request, response.clone());
                                return response;
                            });
                        }
                        return response;
                    });
                })
            );
        }
        return;
    }

    // Handle different request types
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
    } else if (request.destination === 'style' || request.destination === 'script') {
        event.respondWith(handleAssetRequest(request));
    } else if (request.destination === 'document') {
        event.respondWith(handleDocumentRequest(request));
    } else {
        event.respondWith(handleOtherRequest(request));
    }
});

// Handle image requests - cache first, then network
async function handleImageRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Return cached image and update in background
        fetchAndCache(request, cache);
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.status === 200 && !isPartialOrRange(request, networkResponse)) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Image fetch failed:', error);
        // Return placeholder or cached fallback
        return new Response('', { status: 404, statusText: 'Not Found' });
    }
}

// Handle CSS/JS requests - cache first
async function handleAssetRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Update cache in background
        fetchAndCache(request, cache);
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.status === 200 && !isPartialOrRange(request, networkResponse)) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Asset fetch failed:', error);
        return cachedResponse || new Response('', { status: 404 });
    }
}

// Handle document requests - network first, fallback to cache
async function handleDocumentRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Handle other requests - network first
async function handleOtherRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.status === 200 && !isPartialOrRange(request, networkResponse)) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        return cachedResponse || new Response('', { status: 404 });
    }
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok && response.status === 200 && !isPartialOrRange(request, response)) {
            cache.put(request, response.clone());
        }
    } catch (error) {
        // Silently fail - we already have cached version
    }
}

// Utilities to detect partial/range requests and responses
function isPartialOrRange(request, response) {
    const reqRange = request.headers && request.headers.get('range');
    const isReqRange = !!reqRange;
    const is206 = response && response.status === 206;
    return isReqRange || is206;
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            getCacheSize().then((size) => {
                event.ports[0].postMessage({ size });
            })
        );
    }
});

// Get total cache size
async function getCacheSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
            usage: (estimate.usage / 1024 / 1024).toFixed(2) + ' MB',
            quota: (estimate.quota / 1024 / 1024).toFixed(2) + ' MB',
            percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%'
        };
    }
    return null;
}

console.log('Service Worker: Script loaded');
