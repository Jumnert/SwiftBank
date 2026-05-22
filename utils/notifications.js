const admin = require('firebase-admin');

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {string} fcmToken - The FCM token of the recipient device
 * @param {object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {object} payload.data - Additional data payload
 */
async function sendPushNotification(fcmToken, payload) {
  if (!fcmToken) {
    console.log('⚠️  No FCM token provided, skipping notification');
    return;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'swiftbodia_transactions',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    
    // If token is invalid, we might want to remove it from database
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.log('⚠️  Invalid FCM token, should be removed from database');
    }
    
    throw error;
  }
}

/**
 * Send notification to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {object} payload - Notification payload
 */
async function sendMulticastNotification(fcmTokens, payload) {
  if (!fcmTokens || fcmTokens.length === 0) {
    console.log('⚠️  No FCM tokens provided, skipping notification');
    return;
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'swiftbodia_transactions'
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);
    return response;
  } catch (error) {
    console.error('❌ Multicast notification error:', error.message);
    throw error;
  }
}

module.exports = {
  sendPushNotification,
  sendMulticastNotification
};
