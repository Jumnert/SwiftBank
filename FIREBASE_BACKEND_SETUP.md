# Firebase Backend Setup - COMPLETE ✅

## What Changed

Your backend now verifies **Firebase ID tokens** instead of Google ID tokens directly.

### Updated Files:
- ✅ `routes/oauth.js` - Now uses Firebase Admin SDK to verify tokens
- ✅ `package.json` - Added `firebase-admin` dependency
- ✅ `.env` - Added Firebase configuration

## How It Works

```
Android App → Firebase Auth → Firebase Token
    ↓
Backend receives Firebase token at /api/auth/google
    ↓
Firebase Admin SDK verifies token
    ↓
Extract user info (email, name, picture)
    ↓
Create/update user in PostgreSQL database
    ↓
Generate your own JWT token
    ↓
Return JWT + user data to app
```

## Configuration

### Current Setup (Development)
The backend is configured to work **without a service account** for development:

```env
FIREBASE_PROJECT_ID=swiftbodia
```

This is sufficient for token verification in development/testing.

### Production Setup (Optional)

For production, you can add a Firebase service account for enhanced security:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: swiftbodia
3. **Go to Project Settings** → Service Accounts
4. **Click "Generate New Private Key"**
5. **Download the JSON file**
6. **Convert to single-line string** and add to `.env`:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"swiftbodia",...}
```

## Testing

### 1. Start the backend:
```bash
cd backend
npm start
```

You should see:
```
✅ Firebase Admin initialized with project ID
Server running on port 3000
```

### 2. Test the endpoint:

From your Android app, when a user signs in with Google:
- App gets Google ID token
- Firebase signs in with that token
- Firebase returns Firebase ID token
- App sends Firebase token to: `POST https://swiftbank-fwcs.onrender.com/api/auth/google`

### 3. Expected Response:

```json
{
  "message": "Login successful",
  "token": "your-jwt-token-here",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "User Name",
    "balance": 10.00,
    "profile_image_url": "https://..."
  }
}
```

## Error Handling

### Common Errors:

**"Firebase token verification failed"**
- Check that FIREBASE_PROJECT_ID matches your Firebase project
- Ensure the token is a Firebase ID token, not a Google ID token

**"Firebase token has no email"**
- User's Google account doesn't have an email (rare)
- Token is invalid or expired

**"Firebase Admin initialization error"**
- Check FIREBASE_PROJECT_ID in .env
- If using service account, verify JSON format

## Database Schema

The `upsertOAuthUser` function creates/updates users in the `users` table:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255), -- NULL for OAuth users
  is_verified BOOLEAN DEFAULT true,
  balance DECIMAL(10,2) DEFAULT 10.00,
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

OAuth users:
- Have `is_verified = true` automatically
- Have `password = NULL` (they use OAuth)
- Get $10.00 starting balance

## Deployment to Render

Your backend is already deployed at: `https://swiftbank-fwcs.onrender.com/`

To update with Firebase changes:

1. **Push to Git**:
```bash
cd backend
git add .
git commit -m "Add Firebase Admin SDK for OAuth"
git push
```

2. **Render will auto-deploy** (if connected to Git)

3. **Add Environment Variable** on Render:
   - Go to your Render dashboard
   - Select your service
   - Go to Environment
   - Add: `FIREBASE_PROJECT_ID=swiftbodia`
   - Save changes (triggers redeploy)

## Testing the Full Flow

1. **Build Android app** with Firebase OAuth
2. **Click "Sign in with Google"**
3. **Select Google account**
4. **Check Android logs**:
   ```
   FirebaseAuthHelper: Signing in with Firebase using Google ID token
   FirebaseAuthHelper: Firebase sign-in successful, got Firebase token
   ```
5. **Check backend logs**:
   ```
   ✅ Firebase token verified for: user@example.com
   ```
6. **User should be logged in** and redirected to HomeScreen

## Troubleshooting

### Backend logs show "Firebase token verification failed"
- The token might be a Google ID token instead of Firebase token
- Check that Android app is using `FirebaseAuthHelper.signInWithGoogle()`

### User created but no profile picture
- Firebase token might not include picture claim
- Check `decodedToken.picture` in backend logs

### "Module not found: firebase-admin"
- Run `npm install` in backend folder
- Check that `firebase-admin` is in `package.json` dependencies

## Next Steps

1. ✅ Backend updated to verify Firebase tokens
2. ✅ Firebase Admin SDK installed
3. ⏳ Deploy to Render with FIREBASE_PROJECT_ID
4. ⏳ Test end-to-end flow from Android app

---

**Status**: Backend ready for Firebase OAuth! 🚀
