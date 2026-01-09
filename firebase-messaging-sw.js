// Firebase Messaging Service Worker
// This handles background push notifications from FCM

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - these values are safe to expose in client-side code
// They just identify your project, the security comes from FCM tokens
firebase.initializeApp({
    apiKey: "PLACEHOLDER", // Will be replaced when user configures
    authDomain: "PLACEHOLDER.firebaseapp.com",
    projectId: "PLACEHOLDER",
    storageBucket: "PLACEHOLDER.appspot.com",
    messagingSenderId: "PLACEHOLDER",
    appId: "PLACEHOLDER"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Task Reminder';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a task due!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/favicon-32x32.png',
        tag: payload.data?.taskId || 'task-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: payload.data,
        actions: [
            { action: 'view', title: 'View Tasks' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[FCM SW] Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes('218.team') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

console.log('[FCM SW] Firebase Messaging Service Worker loaded');
