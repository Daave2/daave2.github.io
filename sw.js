// sw.js

const CACHE_NAME = 'cleveleys-dash-cache-v2'; // <<< Cache name incremented

// List of files that make up the core app shell
const APP_SHELL_URLS = [
    '/', // Cache the root path if it serves index.html
    '/index.html',
    '/online.html',
    '/street.html',
    '/services.html',
    '/operations.html',
    '/contacts.html',
    '/shrink.html',
    '/safe-and-legal.html',
    '/dash.html', // Include dash.html if still used
    // '/css/style.css', // If you had separate CSS files
    // '/js/main.js',   // If you had separate JS files
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    // Add external resources you want to cache for offline use (be careful with versioning)
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css',
    'https://upload.wikimedia.org/wikipedia/en/thumb/8/82/MorrisonsLogo.svg/220px-MorrisonsLogo.svg.png'
    // REMOVED: 'https://cdn.jsdelivr.net/npm/otplib-browser@12.0.1/dist/otplib-browser.umd.min.js' // Cache OTP library
    // REMOVED or COMMENTED OUT: '/js/vendor/otplib-browser.umd.min.js' // Also remove if you added the local version
    // Add any other critical JS/CSS CDNs or Fonts used across pages
];

// Install Event: Cache the app shell
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell...');
                // Use addAll for atomic caching. If one fails, none are cached.
                // Using cache.add() individually might be safer if some URLs might fail
                // but you still want others cached.
                const promises = APP_SHELL_URLS.map(url => {
                    return cache.add(url).catch(err => {
                        console.warn(`[Service Worker] Failed to cache: ${url}`, err);
                        // We are now ignoring failures here, as OTP was the main issue
                    });
                });
                // Wait for all adds, even if some failed (like font awesome etc if offline)
                return Promise.all(promises);
            })
            .then(() => {
                console.log('[Service Worker] App Shell Caching initiated (some files might have failed).');
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Activated, claiming clients.');
            // Tell the active service worker to take control of the page immediately.
            return self.clients.claim();
        })
    );
});

// Fetch Event: Serve cached content when offline (Cache-First strategy for app shell)
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For navigation requests (HTML pages), try network first, then cache, then offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Network failed, try the cache
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Optional: return an offline fallback page if even cache fails
                            // return caches.match('/offline.html');
                            console.warn('[Service Worker] Navigation failed, not in cache:', event.request.url);
                            // Return a generic error response maybe?
                            return new Response('Network error and not in cache', { status: 503, statusText: 'Service Unavailable'});
                        });
                })
        );
        return;
    }

    // For other requests (CSS, JS, images, fonts), use Cache-First strategy
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // If resource is in cache, return it
                if (cachedResponse) {
                    // console.log('[Service Worker] Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // If resource is not in cache, fetch from network
                // console.log('[Service Worker] Fetching from network:', event.request.url);
                return fetch(event.request).then(networkResponse => {
                    // Optional: Cache the newly fetched resource dynamically (useful for assets not in the initial shell)
                    // Be careful with this, might cache unnecessary things or large files.
                    /*
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') { // Only cache basic, same-origin responses
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    */
                    return networkResponse;
                }).catch(error => {
                    console.error('[Service Worker] Fetch failed:', error);
                    // Optional: Provide a fallback image/resource if fetch fails
                    // if (event.request.url.match(/\.(jpe?g|png|gif|svg)$/)) {
                    //     return caches.match('/images/fallback.png');
                    // }
                    // Return a simple error response
                     return new Response('Network error', { status: 503, statusText: 'Service Unavailable'});
                });
            })
    );
});
