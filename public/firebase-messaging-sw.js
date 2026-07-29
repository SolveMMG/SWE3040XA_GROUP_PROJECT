importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

let messaging = null;

// Main app sends INIT_FIREBASE with the web config so we don't need to hardcode it here
self.addEventListener('message', (event) => {
  if (event.data?.type === 'INIT_FIREBASE' && !messaging) {
    firebase.initializeApp(event.data.config);
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title = 'RideConnect', body = '' } = payload.notification || {};
      self.registration.showNotification(title, { body, icon: '/favicon.ico' });
    });
  }
});
