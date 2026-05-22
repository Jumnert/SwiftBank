const express = require('express');
const { query } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { uploadProfileImage } = require('../utils/cloudinary');

const router = express.Router();

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

    res.json(result.rows[0]);
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

    res.json(result.rows[0]);
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

    res.json(result.rows);
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

    res.json(result.rows);
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
    const { recipient_email, amount, description } = req.body;

    if (!recipient_email || !amount) {
      return res.status(400).json({ error: 'Recipient email and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get sender's balance
    const senderResult = await query('SELECT balance FROM users WHERE id = $1', [req.userId]);
    if (senderResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const senderBalance = parseFloat(senderResult.rows[0].balance);
    if (senderBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get recipient
    const recipientResult = await query('SELECT id FROM users WHERE email = $1', [recipient_email]);
    if (recipientResult.rows.length === 0) {
      return res.status(400).json({ error: 'Recipient not found' });
    }

    const recipientId = recipientResult.rows[0].id;

    // Deduct from sender
    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, req.userId]);

    // Add to recipient
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, recipientId]);

    // Record transaction for sender
    await query(
      'INSERT INTO transactions (user_id, type, amount, recipient_email, description) VALUES ($1, $2, $3, $4, $5)',
      [req.userId, 'transfer_out', amount, recipient_email, description]
    );

    // Record transaction for recipient
    await query(
      'INSERT INTO transactions (user_id, type, amount, recipient_email, description) VALUES ($1, $2, $3, $4, $5)',
      [recipientId, 'transfer_in', amount, req.userEmail, description]
    );

    res.json({ message: 'Transfer successful' });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

module.exports = router;
