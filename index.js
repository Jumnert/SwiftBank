require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const userRoutes = require('./routes/user');
const { initializeDatabase } = require('./db/database');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase (push + token verify)
initializeFirebaseAdmin();

// Initialize database
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SwiftBodia backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

// Default to 3000 to avoid conflicts with macOS services (e.g. AirPlay/AirTunes can use 5000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SwiftBodia backend running on port ${PORT}`);
});
