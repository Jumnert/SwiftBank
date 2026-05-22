const express = require('express');
const { query } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { uploadProfileImage } = require('../utils/cloudinary');

const router = express.Router();

const mapTransaction = (row) => ({
  id: String(row.id),
  user_id: String(row.user_id),
  type: row.type,
  amount: Number(row.amount),
  recipient_email: row.recipient_email,
  description: row.description,
  status: row.status,
  created_at: row.created_at
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, balance, profile_image_url, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    res.json({
      id: String(row.id),
      email: row.email,
      name: row.name,
      balance: Number(row.balance),
      profile_image_url: row.profile_image_url,
      created_at: row.created_at
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;

    const result = await query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, balance, profile_image_url',
      [name, req.userId]
    );

    const row = result.rows[0];
    res.json({
      id: String(row.id),
      email: row.email,
      name: row.name,
      balance: Number(row.balance),
      profile_image_url: row.profile_image_url
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile image
router.post('/upload-profile-image', verifyToken, async (req, res) => {
  try {
    if (!req.body.imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(req.body.imageData, 'base64');

    // Upload to Cloudinary
    const imageUrl = await uploadProfileImage(buffer, req.userId);

    // Update user profile
    const result = await query(
      'UPDATE users SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING profile_image_url',
      [imageUrl, req.userId]
    );

    res.json({
      message: 'Profile image uploaded successfully',
      profile_image_url: result.rows[0].profile_image_url
    });
  } catch (err) {
    console.error('Upload profile image error:', err);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Get balance
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT balance FROM users WHERE id = $1', [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: result.rows[0].balance });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get transactions
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );

    res.json(result.rows.map(mapTransaction));
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Get transactions by period
router.get('/transactions/:period', verifyToken, async (req, res) => {
  try {
    const { period } = req.params;
    let dateFilter;

    switch (period) {
      case 'today':
        dateFilter = "DATE(created_at) = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }

    const result = await query(
      `SELECT * FROM transactions WHERE user_id = $1 AND ${dateFilter} ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json(result.rows.map(mapTransaction));
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Add favorite
router.post('/favorites', verifyToken, async (req, res) => {
  try {
    const { recipient_email, recipient_name } = req.body;

    if (!recipient_email) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const result = await query(
      'INSERT INTO favorites (user_id, recipient_email, recipient_name) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, recipient_email, recipient_name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Get favorites
router.get('/favorites', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Delete favorite
router.delete('/favorites/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM favorites WHERE id = $1 AND user_id = $2', [id, req.userId]);

    res.json({ message: 'Favorite deleted' });
  } catch (err) {
    console.error('Delete favorite error:', err);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

// Transfer money
router.post('/transfer', verifyToken, async (req, res) => {
  try {
    const recipient_email = (req.body.recipient_email || '').trim().toLowerCase();
    const amount = parseFloat(req.body.amount);
    const description = req.body.description;

    if (!recipient_email || Number.isNaN(amount)) {
      return res.status(400).json({ error: 'Recipient email and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Start transaction
    await query('BEGIN');

    // Get sender info
    const senderResult = await query(
      'SELECT id, email, name, balance, fcm_token FROM users WHERE id = $1',
      [req.userId]
    );
    if (senderResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const sender = senderResult.rows[0];
    const senderBalance = parseFloat(sender.balance);

    if (sender.email.toLowerCase() === recipient_email) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot send money to yourself' });
    }
    
    if (senderBalance < amount) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get recipient info
    const recipientResult = await query(
      'SELECT id, email, name, fcm_token FROM users WHERE LOWER(email) = $1',
      [recipient_email]
    );
    if (recipientResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Recipient not found' });
    }

    const recipient = recipientResult.rows[0];

    // Deduct from sender
    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, sender.id]);

    // Add to recipient
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, recipient.id]);

    // Record transaction for sender
    await query(
      'INSERT INTO transactions (user_id, type, amount, recipient_email, description) VALUES ($1, $2, $3, $4, $5)',
      [sender.id, 'transfer_out', amount, recipient_email, description || 'QR Payment']
    );

    // Record transaction for recipient
    await query(
      'INSERT INTO transactions (user_id, type, amount, recipient_email, description) VALUES ($1, $2, $3, $4, $5)',
      [recipient.id, 'transfer_in', amount, sender.email, description || 'QR Payment']
    );

    await query('COMMIT');

    // Send push notifications
    const { sendPushNotification } = require('../utils/notifications');
    
    // Notify recipient
    if (recipient.fcm_token) {
      await sendPushNotification(recipient.fcm_token, {
        title: '💰 Money Received',
        body: `You received $${parseFloat(amount).toFixed(2)} from ${sender.name || sender.email}`,
        data: {
          type: 'payment_received',
          amount: amount.toString(),
          from: sender.email,
          fromName: sender.name || sender.email
        }
      });
    }

    // Notify sender
    if (sender.fcm_token) {
      await sendPushNotification(sender.fcm_token, {
        title: '✅ Payment Sent',
        body: `You sent $${parseFloat(amount).toFixed(2)} to ${recipient.name || recipient.email}`,
        data: {
          type: 'payment_sent',
          amount: amount.toString(),
          to: recipient.email,
          toName: recipient.name || recipient.email
        }
      });
    }

    res.json({ message: 'Transfer successful' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Save FCM token
router.post('/fcm-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    await query(
      'UPDATE users SET fcm_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [token, req.userId]
    );

    res.json({ message: 'FCM token saved successfully' });
  } catch (err) {
    console.error('Save FCM token error:', err);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

module.exports = router;
