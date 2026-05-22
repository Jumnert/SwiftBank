const { admin, isPushMessagingReady } = require('./firebaseAdmin');

function stringifyData(data = {}) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value == null ? '' : String(value);
  }
  return out;
}

/**
 * Send push notification via Firebase Cloud Messaging.
 * Uses a notification + data payload so alerts work in background and foreground.
 */
async function sendPushNotification(fcmToken, payload) {
  if (!fcmToken) {
    console.log('⚠️  No FCM token provided, skipping notification');
    return null;
  }

  if (!isPushMessagingReady()) {
    console.warn('⚠️  Push skipped: Firebase service account not configured');
    return null;
  }

  try {
    const data = stringifyData({
      ...(payload.data || {}),
      title: payload.title || 'SwiftBodia',
      body: payload.body || ''
    });

    const message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'swiftbodia_transactions',
          priority: 'high',
          icon: 'ic_stat_notification'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Push notification error:', error.message);

    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      console.log('⚠️  Invalid FCM token — clear it on the user row');
    }

    return null;
  }
}

module.exports = {
  sendPushNotification
};
