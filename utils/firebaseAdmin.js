const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let messagingReady = false;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'swiftbodia';

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      messagingReady = true;
      console.log('✅ Firebase Admin initialized (service account from FIREBASE_SERVICE_ACCOUNT)');
      return admin;
    }

    const credentialsPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      messagingReady = true;
      console.log(`✅ Firebase Admin initialized (service account file: ${credentialsPath})`);
      return admin;
    }

    // Fallback: token verification only (push will NOT work without credentials)
    admin.initializeApp({ projectId });
    messagingReady = false;
    console.warn(
      '⚠️  Firebase Admin started without service account — push notifications disabled. ' +
        'Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH in .env'
    );
    return admin;
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    throw error;
  }
}

function isPushMessagingReady() {
  if (!admin.apps.length) {
    initializeFirebaseAdmin();
  }
  return messagingReady;
}

module.exports = {
  admin,
  initializeFirebaseAdmin,
  isPushMessagingReady
};
