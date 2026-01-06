// AuthController: Handles HTTP requests for authentication
// Follows MVC pattern and Single Responsibility Principle

const authService = require('../services/AuthService');
const fraudDetectionService = require('../services/FraudDetectionService');
const Logger = require('../utils/logger');

class AuthController {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { email, password, phoneNumber } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      Logger.info('Registration attempt', { email, ipAddress });

      const result = await authService.register(
        email,
        password,
        phoneNumber,
        ipAddress,
        userAgent
      );

      Logger.success('User registered successfully', { userId: result.user.id, email });

      res.status(201).json({
        message: 'User registered successfully',
        ...result
      });
    } catch (error) {
      Logger.error('Registration failed', error, {
        email: req.body.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        endpoint: '/api/auth/register'
      });
      
      res.status(400).json({
        error: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      Logger.info('Login attempt', { email, ipAddress });

      const result = await authService.login(
        email,
        password,
        ipAddress,
        userAgent
      );

      // Run fraud detection (non-blocking)
      if (result.user) {
        fraudDetectionService.detectFraud(
          result.user.id,
          ipAddress,
          userAgent,
          true
        ).catch(err => Logger.error('Fraud detection error during login', err, { userId: result.user.id }));
      }

      if (result.mfaRequired) {
        Logger.info('MFA required for login', { email, ipAddress });
        return res.json({
          message: 'MFA required',
          mfaRequired: true,
          tempToken: result.tempToken
        });
      }

      Logger.success('Login successful', { email, userId: result.user.id });
      res.json({
        message: 'Login successful',
        token: result.token,
        user: result.user
      });
    } catch (error) {
      Logger.error('Login failed', error, {
        email: req.body.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        endpoint: '/api/auth/login'
      });
      
      // Run fraud detection for failed login
      if (req.body.email) {
        fraudDetectionService.detectFraud(
          null,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'],
          false
        ).catch(err => Logger.error('Fraud detection error for failed login', err));
      }

      res.status(401).json({ 
        error: error.message || 'Login failed' 
      });
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(req, res) {
    try {
      const { tempToken, mfaCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      Logger.info('MFA verification attempt', { ipAddress });

      const result = await authService.verifyMFA(
        tempToken,
        mfaCode,
        ipAddress,
        userAgent
      );

      // Run fraud detection after successful MFA
      if (result.user) {
        fraudDetectionService.detectFraud(
          result.user.id,
          ipAddress,
          userAgent,
          true
        ).catch(err => Logger.error('Fraud detection error during MFA verification', err, { userId: result.user.id }));
      }

      Logger.success('MFA verification successful', { userId: result.user.id });
      res.json({
        message: 'MFA verification successful',
        token: result.token,
        user: result.user
      });
    } catch (error) {
      Logger.error('MFA verification failed', error, {
        ipAddress: req.ip || req.connection.remoteAddress,
        endpoint: '/api/auth/verify-mfa'
      });
      
      res.status(401).json({ 
        error: error.message || 'MFA verification failed' 
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.userId);
      Logger.info('Profile retrieved', { userId: req.user.userId });
      res.json({ user });
    } catch (error) {
      Logger.error('Profile retrieval failed', error, {
        userId: req.user?.userId,
        endpoint: '/api/auth/profile'
      });
      
      res.status(404).json({ 
        error: error.message || 'User not found' 
      });
    }
  }
}

module.exports = new AuthController();

