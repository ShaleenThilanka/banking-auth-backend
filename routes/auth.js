const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { detectFraud } = require('../utils/fraudDetection');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate MFA secret
    const mfaSecret = speakeasy.generateSecret({
      name: `BankingApp (${email})`
    });

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, mfa_secret, phone_number) 
       VALUES ($1, $2, $3, $4) RETURNING id, email`,
      [email, passwordHash, mfaSecret.base32, phoneNumber]
    );

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(mfaSecret.otpauth_url);

    res.status(201).json({
      message: 'User registered successfully',
      mfaSetup: {
        secret: mfaSecret.base32,
        qrCode: qrCodeUrl
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      await pool.query(
        'INSERT INTO login_attempts (user_id, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)',
        [null, ipAddress, userAgent, false]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      await pool.query(
        'INSERT INTO login_attempts (user_id, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)',
        [user.id, ipAddress, userAgent, false]
      );
      
      await detectFraud(user.id, ipAddress, userAgent, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Record successful login
    await pool.query(
      'INSERT INTO login_attempts (user_id, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)',
      [user.id, ipAddress, userAgent, true]
    );

    await detectFraud(user.id, ipAddress, userAgent, true);

    // Check if MFA is required
    if (user.mfa_secret) {
      return res.json({
        message: 'MFA required',
        mfaRequired: true,
        tempToken: jwt.sign(
          { userId: user.id, step: 'mfa' },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        )
      });
    }

    // Generate final token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify MFA
router.post('/verify-mfa', async (req, res) => {
  try {
    const { tempToken, mfaCode } = req.body;

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    
    // Get user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = userResult.rows[0];

    // Verify MFA code
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: mfaCode,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // Generate final token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'MFA verification successful',
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, phone_number, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;