// AuthService: Handles authentication business logic
// Follows Single Responsibility Principle (SOLID)

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pool = require('../config/database');
const { auditLog } = require('../utils/auditLogger');
const Logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user
   */
  async register(email, password, phoneNumber, ipAddress, userAgent) {
    try {
      // Check if user exists
      const userExists = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (userExists.rows.length > 0) {
        await auditLog(null, 'REGISTER_ATTEMPT', 'user', null, ipAddress, userAgent, 
          { email, reason: 'User already exists' }, 400);
        throw new Error('User already exists');
      }

      // Hash password with appropriate salt rounds
      const saltRounds = 12; // Increased for better security
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate MFA secret
      const mfaSecret = speakeasy.generateSecret({
        name: `BankingApp (${email})`,
        issuer: 'Secure Banking System'
      });

      // Insert user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, mfa_secret, phone_number) 
         VALUES (?, ?, ?, ?)`,
        [email, passwordHash, mfaSecret.base32, phoneNumber]
      );
      
      // Get the inserted user (MySQL doesn't support RETURNING)
      const insertedUser = await pool.query(
        'SELECT id, email, created_at FROM users WHERE email = ?',
        [email]
      );
      
      const user = insertedUser.rows[0];

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(mfaSecret.otpauth_url);

      // Audit log
      await auditLog(user.id, 'USER_REGISTERED', 'user', user.id, ipAddress, userAgent);

      return {
        user: { id: user.id, email: user.email },
        mfaSetup: {
          secret: mfaSecret.base32,
          qrCode: qrCodeUrl
        }
      };
    } catch (error) {
      Logger.error('AuthService.register failed', error, { email });
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  async login(email, password, ipAddress, userAgent) {
    try {
      // Find user
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (userResult.rows.length === 0) {
        await pool.query(
          'INSERT INTO login_attempts (user_id, ip_address, user_agent, success) VALUES (?, ?, ?, ?)',
          [null, ipAddress, userAgent, false]
        );
        await auditLog(null, 'LOGIN_ATTEMPT', 'auth', null, ipAddress, userAgent, 
          { email, reason: 'User not found' }, 401);
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        await auditLog(user.id, 'LOGIN_ATTEMPT_LOCKED', 'auth', user.id, ipAddress, userAgent, 
          { reason: 'Account locked' }, 403);
        throw new Error('Account is temporarily locked due to multiple failed attempts');
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        // Increment failed attempts
        const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
        let lockUntil = null;

        // Lock account after 5 failed attempts for 30 minutes
        if (newFailedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await pool.query(
          `UPDATE users SET failed_login_attempts = ?, account_locked_until = ? WHERE id = ?`,
          [newFailedAttempts, lockUntil, user.id]
        );

        await pool.query(
          'INSERT INTO login_attempts (user_id, ip_address, user_agent, success) VALUES (?, ?, ?, ?)',
          [user.id, ipAddress, userAgent, false]
        );

        await auditLog(user.id, 'LOGIN_FAILED', 'auth', user.id, ipAddress, userAgent, 
          { reason: 'Invalid password', failedAttempts: newFailedAttempts }, 401);
        
        throw new Error('Invalid credentials');
      }

      // Reset failed attempts on successful login
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Record successful login attempt
      await pool.query(
        'INSERT INTO login_attempts (user_id, ip_address, user_agent, success) VALUES (?, ?, ?, ?)',
        [user.id, ipAddress, userAgent, true]
      );

      await auditLog(user.id, 'LOGIN_SUCCESS', 'auth', user.id, ipAddress, userAgent);

      // Check if MFA is required
      if (user.mfa_secret) {
        const tempToken = jwt.sign(
          { userId: user.id, step: 'mfa', ipAddress },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );

        return {
          mfaRequired: true,
          tempToken
        };
      }

      // Generate final token
      const token = this.generateToken(user);

      return {
        token,
        user: { id: user.id, email: user.email }
      };
    } catch (error) {
      Logger.error('AuthService.login failed', error, { email });
      throw error;
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(tempToken, mfaCode, ipAddress, userAgent) {
    try {
      // Verify temp token
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      
      // Verify IP address matches
      if (decoded.ipAddress !== ipAddress) {
        await auditLog(decoded.userId, 'MFA_VERIFICATION_FAILED', 'auth', decoded.userId, 
          ipAddress, userAgent, { reason: 'IP address mismatch' }, 403);
        throw new Error('Security verification failed');
      }

      // Get user
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Verify MFA code
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaCode,
        window: 1 // Allow 1 time step tolerance
      });

      if (!verified) {
        await auditLog(user.id, 'MFA_VERIFICATION_FAILED', 'auth', user.id, 
          ipAddress, userAgent, { reason: 'Invalid MFA code' }, 401);
        throw new Error('Invalid MFA code');
      }

      // Generate final token
      const token = this.generateToken(user);

      await auditLog(user.id, 'MFA_VERIFICATION_SUCCESS', 'auth', user.id, ipAddress, userAgent);

      return {
        token,
        user: { id: user.id, email: user.email }
      };
    } catch (error) {
      Logger.error('AuthService.verifyMFA failed', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const userResult = await pool.query(
        'SELECT id, email, phone_number, created_at, last_login_at FROM users WHERE id = ?',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      return userResult.rows[0];
    } catch (error) {
      Logger.error('AuthService.getProfile failed', error, { userId });
      throw error;
    }
  }
}

module.exports = new AuthService();

