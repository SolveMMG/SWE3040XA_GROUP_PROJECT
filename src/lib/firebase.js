import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = Object.values(firebaseConfig).every(Boolean);

const app        = hasConfig ? initializeApp(firebaseConfig) : null;
const messaging  = app ? getMessaging(app) : null;
const vapidKey   = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission() {
  if (!messaging || !vapidKey) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    // Send config to the service worker so it can handle background messages
    const sendConfig = (sw) => sw.postMessage({ type: 'INIT_FIREBASE', config: firebaseConfig });
    if (swReg.active) sendConfig(swReg.active);
    else swReg.installing?.addEventListener('statechange', function handler() {
      if (this.state === 'activated') { sendConfig(this); this.removeEventListener('statechange', handler); }
    });

    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
