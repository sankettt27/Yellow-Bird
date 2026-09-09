// YellowBird Service Worker — handles push notifications in the background
// This file runs independently of the main app, even when the tab is closed

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon } = event.data;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon || '/bus-icon.png',
        badge: '/bus-icon.png',
        tag: tag || 'yellowbird-alert',
        requireInteraction: true, // stays in notification bar until dismissed
        vibrate: [200, 100, 200, 100, 300], // vibration pattern
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
        data: { url: '/' },
      })
    );
  }
});

// When user taps the notification, open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Focus existing tab or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/parent');
    })
  );
});
