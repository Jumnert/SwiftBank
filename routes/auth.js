const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');
const { generateOTP, sendOtpWithFallback, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`[REGISTER] Attempting to send verification email to: ${email}`);

    // Send verification email with fallback to Firebase
    const emailSent = await sendOtpWithFallback(email, otp);
    
    console.log(`[REGISTER] Email send result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
    
    if (!emailSent) {
      console.error(`[REGISTER] Failed to send verification email to ${email}`);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // Store OTP temporarily
    otpStore.set(email, { otp, expires: otpExpires, password: hashedPassword, name });

    console.log(`[REGISTER] OTP stored for ${email}, waiting for verification`);

    res.json({
      message: 'Verification code sent to your email',
      email: email
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify Email OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ error: 'No verification request found' });
    }

    if (new Date() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Create user with $200 starting balance
    const result = await query(
      'INSERT INTO users (email, password, name, is_verified, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, balance',
      [email, storedData.password, storedData.name, true, 200.00]
    );

    const user = result.rows[0];
    otpStore.delete(email);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        balance: Number(user.balance ?? 200)
      }
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(401).json({ error: 'Email not verified' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        balance: Number(user.balance),
        profile_image_url: user.profile_image_url
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Request Password Reset
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Send reset email with fallback to Firebase
    const emailSent = await sendOtpWithFallback(email, otp);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    // Store OTP
    otpStore.set(`reset_${email}`, { otp, expires: otpExpires });

    res.json({
      message: 'Password reset code sent to your email',
      email: email
    });
  } catch (err) {
    console.error('Request reset error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Verify Reset OTP and Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const storedData = otpStore.get(`reset_${email}`);
    if (!storedData) {
      return res.status(400).json({ error: 'No reset request found' });
    }

    if (new Date() > storedData.expires) {
      otpStore.delete(`reset_${email}`);
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    otpStore.delete(`reset_${email}`);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
