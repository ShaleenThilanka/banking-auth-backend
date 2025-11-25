const pool = require('../config/database');

async function detectFraud(userId, ipAddress, userAgent, success) {
  try {
    // Check for multiple failed attempts
    if (!success) {
      const failedAttempts = await pool.query(
        `SELECT COUNT(*) as count 
         FROM login_attempts 
         WHERE user_id = $1 AND success = false AND timestamp > NOW() - INTERVAL '15 minutes'`,
        [userId]
      );

      if (parseInt(failedAttempts.rows[0].count) >= 3) {
        await pool.query(
          'INSERT INTO fraud_flags (user_id, reason, severity, ip_address) VALUES ($1, $2, $3, $4)',
          [userId, 'Multiple failed login attempts', 2, ipAddress]
        );
      }
    }

    // For successful logins, check IP patterns
    if (success) {
      const recentIPs = await pool.query(
        `SELECT COUNT(DISTINCT ip_address) as ip_count 
         FROM login_attempts 
         WHERE user_id = $1 AND success = true AND timestamp > NOW() - INTERVAL '1 hour'`,
        [userId]
      );

      if (parseInt(recentIPs.rows[0].ip_count) > 2) {
        await pool.query(
          'INSERT INTO fraud_flags (user_id, reason, severity, ip_address) VALUES ($1, $2, $3, $4)',
          [userId, 'Multiple IP addresses used in short time', 2, ipAddress]
        );
      }
    }
  } catch (error) {
    console.error('Fraud detection error:', error);
  }
}

module.exports = { detectFraud };