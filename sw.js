// sw.js
// Combined Service Worker: Caching + Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// --- Firebase Messaging Setup ---

// Firebase config
firebase.initializeApp({
    apiKey: "AIzaSyCPiQ91EOGaK6woOPYefg4TMylGP1esGec",
    authDomain: "morrisons-checklist.firebaseapp.com",
    projectId: "morrisons-checklist",
    storageBucket: "morrisons-checklist.firebasestorage.app",
    messagingSenderId: "394294868202",
    appId: "1:394294868202:web:31e9554768582b781bff93"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Task Reminder';
    const taskId = payload.data?.taskId || '';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a task due!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/favicon-32x32.png',
        tag: taskId || 'task-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
            taskId: taskId,
            url: payload.data?.click_action || 'https://218.team/'
        },
        actions: [
            { action: 'view', title: 'View' },
            { action: 'complete', title: 'Mark Complete' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[FCM SW] Notification clicked:', event.action, event.notification.data);
    event.notification.close();

    const taskId = event.notification.data?.taskId || '';
    let targetUrl = 'https://218.team/';

    if (event.action === 'complete') {
        targetUrl = `https://218.team/?action=complete&taskId=${taskId}`;
    } else if (event.action === 'view' || !event.action) {
        targetUrl = `https://218.team/?highlight=${taskId}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('218.team') && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// --- PWA Caching Setup ---

const CACHE_NAME = 'cleveleys-dash-cache-v8';

// List of files that make up the core app shell
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/online.html',
    '/street.html',
    '/services.html',
    '/operations.html',
    '/contacts.html',
    '/shrink.html',
    '/safe-and-legal.html',
    '/dash.html',
    '/offline.html',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css',
    'https://upload.wikimedia.org/wikipedia/en/thumb/8/82/MorrisonsLogo.svg/220px-MorrisonsLogo.svg.png'
];

// Install Event
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell...');
                const promises = APP_SHELL_URLS.map(url => {
                    return cache.add(url).catch(err => {
                        console.warn(`[Service Worker] Failed to cache: ${url}`, err);
                    });
                });
                return Promise.all(promises);
            })
            .then(() => {
                console.log('[Service Worker] App Shell Caching initiated.');
                return self.skipWaiting();
            })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Activated, claiming clients.');
            return self.clients.claim();
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignore Cloud Functions calls
    if (event.request.url.includes('cloudfunctions.net')) {
        return;
    }

    // Navigate requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            return cachedResponse || caches.match('/offline.html');
                        });
                })
        );
        return;
    }

    // Other requests (Cache First)
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    return networkResponse;
                }).catch(() => {
                    return caches.match('/offline.html');
                });
            })
    );
});
