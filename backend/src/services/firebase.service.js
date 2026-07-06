/**
 * Firebase Admin SDK — initialised lazily so the server starts without creds.
 * Provides FCM push notifications and Realtime Database access.
 */
let _messaging = null;

const getMessaging = () => {
  if (_messaging) return _messaging;

  const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    // eslint-disable-next-line no-console
    console.warn('[firebase] credentials not set — push notifications disabled.');
    return null;
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   FIREBASE_PROJECT_ID,
        privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  _messaging = admin.messaging();
  return _messaging;
};

/**
 * Send a push notification to a device FCM token.
 * Silently no-ops if Firebase is not configured or token is missing.
 *
 * @param {string} fcmToken  - recipient's FCM device token
 * @param {string} title     - notification title
 * @param {string} body      - notification body
 * @param {object} data      - extra key-value payload (strings only)
 */
const sendPush = async(fcmToken, title, body, data = {}) => {
  const messaging = getMessaging();
  if (!messaging || !fcmToken) return;

  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[firebase] push failed:', err.message);
  }
};

module.exports = { sendPush };
