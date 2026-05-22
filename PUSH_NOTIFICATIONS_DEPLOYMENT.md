# Push Notifications Deployment Guide 🔔

## Backend Changes Complete ✅

### Files Added/Modified:

1. **routes/user.js** ✅
   - Updated `/transfer` endpoint to send push notifications
   - Added `/fcm-token` endpoint to save device tokens
   - Uses database transactions for safety

2. **utils/notifications.js** ✅ (NEW)
   - `sendPushNotification()` - Send to single device
   - `sendMulticastNotification()` - Send to multiple devices
   - Error handling for invalid tokens

3. **migrations/add_fcm_token.sql** ✅ (NEW)
   - Adds `fcm_token` column to users table
   - Adds index for performance
   - Adds `updated_at` column and trigger

4. **run-migration.js** ✅ (NEW)
   - Script to run database migration

## Deployment Steps

### Step 1: Run Database Migration

```bash
cd backend
node run-migration.js
```

Expected output:
```
🔄 Running database migration...
✅ Migration completed successfully!
   - Added fcm_token column to users table
   - Added index on fcm_token
   - Added updated_at column and trigger
```

### Step 2: Verify Firebase Admin SDK

Firebase Admin SDK is already installed. Verify it's initialized in `routes/oauth.js`:

```javascript
// Should already be there from Firebase OAuth setup
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'swiftbodia'
  });
}
```

### Step 3: Deploy to Render

```bash
cd backend
git add .
git commit -m "Add push notifications for transfers"
git push origin main
```

Render will auto-deploy. Check logs for:
```
✅ Firebase Admin initialized
Server running on port 3000
```

### Step 4: Test Locally (Optional)

```bash
cd backend
npm start
```

Test transfer endpoint:
```bash
curl -X POST http://localhost:3000/api/user/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "recipient@example.com",
    "amount": 50.00,
    "description": "Test payment"
  }'
```

## How It Works

### 1. User Logs In
```
App starts → Firebase generates FCM token → Sends to backend
Backend saves token in users.fcm_token column
```

### 2. User Sends Money
```
User scans QR → Enters amount → Taps "Send Money"
    ↓
App calls POST /api/user/transfer
    ↓
Backend:
  1. Validates amount and balance
  2. Deducts from sender
  3. Adds to recipient
  4. Records transactions
  5. Sends push notifications to both users
    ↓
Both users receive notifications
```

### 3. Notification Payload

**Recipient receives:**
```json
{
  "notification": {
    "title": "💰 Money Received",
    "body": "You received $50.00 from John Doe"
  },
  "data": {
    "type": "payment_received",
    "amount": "50.00",
    "from": "john@example.com",
    "fromName": "John Doe"
  }
}
```

**Sender receives:**
```json
{
  "notification": {
    "title": "✅ Payment Sent",
    "body": "You sent $50.00 to Jane Smith"
  },
  "data": {
    "type": "payment_sent",
    "amount": "50.00",
    "to": "jane@example.com",
    "toName": "Jane Smith"
  }
}
```

## Database Schema

### users table (updated)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255),
  balance DECIMAL(10,2) DEFAULT 10.00,
  profile_image_url TEXT,
  fcm_token TEXT,              -- NEW: Firebase Cloud Messaging token
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- NEW: Auto-updated
);

CREATE INDEX idx_users_fcm_token ON users(fcm_token);
```

## API Endpoints

### POST /api/user/transfer
Transfer money between users and send notifications.

**Request:**
```json
{
  "recipient_email": "recipient@example.com",
  "amount": 50.00,
  "description": "Lunch payment"
}
```

**Response:**
```json
{
  "message": "Transfer successful"
}
```

**Errors:**
- `400` - Invalid amount or insufficient balance
- `404` - Recipient not found
- `500` - Transfer failed

### POST /api/user/fcm-token
Save FCM token for push notifications.

**Request:**
```json
{
  "token": "fcm_token_here..."
}
```

**Response:**
```json
{
  "message": "FCM token saved successfully"
}
```

## Testing Push Notifications

### Method 1: Test from Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Enter FCM token (check app logs)
4. Send notification

### Method 2: Test via Backend

1. Make a transfer between two users
2. Both should receive notifications
3. Check backend logs:
   ```
   ✅ Push notification sent successfully: projects/...
   ```

### Method 3: Test with curl

```bash
# Save FCM token
curl -X POST http://localhost:3000/api/user/fcm-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_FCM_TOKEN"}'

# Make transfer
curl -X POST http://localhost:3000/api/user/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "recipient@example.com",
    "amount": 10.00,
    "description": "Test"
  }'
```

## Troubleshooting

### No notifications received

**Check:**
1. FCM token saved in database:
   ```sql
   SELECT email, fcm_token FROM users WHERE email = 'user@example.com';
   ```

2. Firebase Admin SDK initialized:
   ```
   Backend logs should show: ✅ Firebase Admin initialized
   ```

3. App has notification permission:
   - Android 13+: Check Settings → Apps → SwiftBodia → Notifications

4. Backend logs for errors:
   ```
   ❌ Push notification error: ...
   ```

### Invalid token errors

If you see:
```
messaging/invalid-registration-token
messaging/registration-token-not-registered
```

**Solution:**
- Token expired or invalid
- User uninstalled/reinstalled app
- Clear token from database and regenerate

### Notifications not showing

**Check:**
1. App is in background (foreground notifications need special handling)
2. Notification channel created (Android O+)
3. Sound/vibration enabled in device settings

## Environment Variables

Ensure these are set on Render:

```env
FIREBASE_PROJECT_ID=swiftbodia
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
```

## Security Notes

- FCM tokens are sensitive - don't expose in logs
- Tokens can expire - handle gracefully
- Invalid tokens should be removed from database
- Use HTTPS for all API calls
- Validate JWT tokens on all endpoints

## Next Steps

1. ✅ Run migration: `node run-migration.js`
2. ✅ Deploy to Render
3. ⏳ Test transfer with notifications
4. ⏳ Monitor logs for errors
5. ⏳ Add notification preferences (optional)

---

**Status**: Backend ready for push notifications! 🚀
