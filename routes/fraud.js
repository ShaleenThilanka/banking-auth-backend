const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const router = express.Router();

// Get fraud alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await pool.query(
      'SELECT * FROM fraud_flags WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [req.user.userId]
    );

    res.json({ alerts: alerts.rows });
  } catch (error) {
    console.error('Fraud alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get login history
router.get('/login-history', authenticateToken, async (req, res) => {
  try {
    const history = await pool.query(
      'SELECT * FROM login_attempts WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [req.user.userId]
    );

    res.json({ history: history.rows });
  } catch (error) {
    console.error('Login history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;