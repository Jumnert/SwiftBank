# SwiftBodia Backend

Express.js backend for SwiftBodia mobile app with PostgreSQL database, Cloudinary image storage, and Gmail email verification.

## Features

- User authentication with email verification via OTP
- Password reset with OTP verification
- User profile management with profile image upload
- Money transfer between users
- Transaction history tracking
- Favorites management
- JWT token-based authorization
- Cloudinary integration for profile images

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

- `PORT` - Server port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string (Neon)
  - Format: `postgresql://user:password@host/database`
- `JWT_SECRET` - Secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- `GMAIL_USER` - Gmail address for sending emails
- `GMAIL_PASSWORD` - Gmail app password (not regular password)
- `NODE_ENV` - Environment (development/production)

### 3. Setup PostgreSQL Database (Neon)

1. Create a Neon account at https://neon.tech
2. Create a new project and database
3. Copy the connection string to `DATABASE_URL` in `.env`

The database tables will be created automatically on first run.

### 4. Setup Cloudinary

1. Create a Cloudinary account at https://cloudinary.com
2. Get your cloud name, API key, and API secret from the dashboard
3. Add them to `.env`

### 5. Setup Gmail for Email Verification

1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Use the app password in `GMAIL_PASSWORD` (not your regular password)

## Running the Server

```bash
npm start
```

The server will start on the port specified in `.env` (default: 5000).

## API Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Body: { email, password, name }
Response: { message, email }
```

#### Verify Email
```
POST /api/auth/verify-email
Body: { email, otp }
Response: { message, token, user }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
Response: { message, token, user }
```

#### Request Password Reset
```
POST /api/auth/request-reset
Body: { email }
Response: { message, email }
```

#### Reset Password
```
POST /api/auth/reset-password
Body: { email, otp, newPassword }
Response: { message }
```

### User Profile (Requires JWT Token)

#### Get Profile
```
GET /api/user/profile
Headers: { Authorization: "Bearer <token>" }
Response: { id, email, name, balance, profile_image_url, created_at }
```

#### Update Profile
```
PUT /api/user/profile
Headers: { Authorization: "Bearer <token>" }
Body: { name }
Response: { id, email, name, balance, profile_image_url }
```

#### Upload Profile Image
```
POST /api/user/upload-profile-image
Headers: { Authorization: "Bearer <token>" }
Body: { imageData } (base64 encoded)
Response: { message, profile_image_url }
```

#### Get Balance
```
GET /api/user/balance
Headers: { Authorization: "Bearer <token>" }
Response: { balance }
```

### Transactions

#### Get All Transactions
```
GET /api/user/transactions
Headers: { Authorization: "Bearer <token>" }
Response: [{ id, user_id, type, amount, recipient_email, description, status, created_at }]
```

#### Get Transactions by Period
```
GET /api/user/transactions/:period
Headers: { Authorization: "Bearer <token>" }
Params: period = "today" | "week" | "month"
Response: [{ id, user_id, type, amount, recipient_email, description, status, created_at }]
```

#### Transfer Money
```
POST /api/user/transfer
Headers: { Authorization: "Bearer <token>" }
Body: { recipient_email, amount, description }
Response: { message }
```

### Favorites

#### Get Favorites
```
GET /api/user/favorites
Headers: { Authorization: "Bearer <token>" }
Response: [{ id, user_id, recipient_email, recipient_name, created_at }]
```

#### Add Favorite
```
POST /api/user/favorites
Headers: { Authorization: "Bearer <token>" }
Body: { recipient_email, recipient_name }
Response: { id, user_id, recipient_email, recipient_name, created_at }
```

#### Delete Favorite
```
DELETE /api/user/favorites/:id
Headers: { Authorization: "Bearer <token>" }
Response: { message }
```

### Health Check

```
GET /api/health
Response: { status, message }
```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password` - Hashed password
- `name` - User's name
- `balance` - Account balance (default: $10.00)
- `profile_image_url` - Cloudinary image URL
- `is_verified` - Email verification status
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Transactions Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `type` - "transfer_in" or "transfer_out"
- `amount` - Transaction amount
- `recipient_email` - Other party's email
- `description` - Transaction description
- `status` - "completed", "pending", etc.
- `created_at` - Transaction timestamp

### Favorites Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `recipient_email` - Favorite recipient email
- `recipient_name` - Favorite recipient name
- `created_at` - When added to favorites

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid token or credentials)
- `404` - Not found
- `500` - Server error

Error responses include an `error` field with a descriptive message.

## Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- OTP codes expire after 10 minutes
- All sensitive data is stored securely
- CORS is enabled for frontend communication
- Use HTTPS in production

## Development

The backend uses:
- Express.js for HTTP server
- PostgreSQL for database
- Cloudinary for image storage
- Nodemailer for email sending
- bcryptjs for password hashing
- jsonwebtoken for authentication

## License

ISC
