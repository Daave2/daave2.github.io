// Firebase Messaging Service Worker
// This handles background push notifications from FCM

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - these values are safe to expose in client-side code
// They just identify your project, the security comes from FCM tokens
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
            { action: 'view', title: '👁️ View Task' },
            { action: 'complete', title: '✅ Confirm Done' }
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
        // Open page with action to mark task complete
        targetUrl = `https://218.team/?action=complete&taskId=${taskId}`;
    } else if (event.action === 'view' || !event.action) {
        // Open page and highlight the task
        targetUrl = `https://218.team/?highlight=${taskId}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, navigate it and focus
            for (const client of clientList) {
                if (client.url.includes('218.team') && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

console.log('[FCM SW] Firebase Messaging Service Worker loaded');
