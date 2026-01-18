importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCccZYjpK8uhRmjzUPrgu3eloASikNpmJc",
    authDomain: "snuggle-73465.firebaseapp.com",
    databaseURL: "https://snuggle-73465-default-rtdb.firebaseio.com",
    projectId: "snuggle-73465",
    storageBucket: "snuggle-73465.firebasestorage.app",
    messagingSenderId: "873162893612",
    appId: "1:873162893612:web:70bdb26473c304a6ca2489",
    measurementId: "G-XPBFXQF0SL"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationData = payload.data || {};
    const isCallNotification = notificationData.type === 'call';

    // Customize notification based on type
    const notificationTitle = payload.notification?.title || 'Snuggle';
    const notificationOptions = {
        body: payload.notification?.body || 'New notification',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: isCallNotification ? 'call-notification' : 'default',
        requireInteraction: isCallNotification, // Keep call notifications visible
        data: notificationData
    };

    // Add action buttons for call notifications
    if (isCallNotification) {
        notificationOptions.actions = [
            { action: 'accept', title: 'Accept', icon: '/vite.svg' },
            { action: 'decline', title: 'Decline', icon: '/vite.svg' }
        ];
        notificationOptions.vibrate = [200, 100, 200, 100, 200]; // Vibration pattern
    }

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click:', event.action);
    event.notification.close();

    const notificationData = event.notification.data || {};
    const isCallNotification = notificationData.type === 'call';

    if (isCallNotification) {
        // Handle call notification actions
        if (event.action === 'accept') {
            console.log('[SW] User accepted call');
            // Open app and signal acceptance
            event.waitUntil(
                clients.openWindow(`/messages?action=accept_call&callerId=${notificationData.callerId}`)
            );
        } else if (event.action === 'decline') {
            console.log('[SW] User declined call');
            // Just close notification, app will handle via signaling
        } else {
            // Clicked notification body - open app
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                    for (var i = 0; i < windowClients.length; i++) {
                        var client = windowClients[i];
                        if ('focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow('/messages');
                    }
                })
            );
        }
    } else {
        // Regular notification - open app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                for (var i = 0; i < windowClients.length; i++) {
                    var client = windowClients[i];
                    if (client.url.indexOf('/') !== -1 && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/messages');
                }
            })
        );
    }
});
