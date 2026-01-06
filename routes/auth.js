// Auth Routes: RESTful API endpoints for authentication
// Follows MVC pattern with controller separation

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateMFACode } = require('../middleware/validation');

// Rate limiters - more lenient in development
const isDevelopment = process.env.NODE_ENV !== 'production';

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 20 : 3, // More lenient in development
  message: 'Too many registration attempts, please try again later.',
  skipSuccessfulRequests: true
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5, // More lenient in development
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Register new user
router.post('/register', registerLimiter, validateRegistration, (req, res) => {
  authController.register(req, res);
});

// Login user
router.post('/login', loginLimiter, validateLogin, (req, res) => {
  authController.login(req, res);
});

// Verify MFA code
router.post('/verify-mfa', validateMFACode, (req, res) => {
  authController.verifyMFA(req, res);
});

// Get user profile (protected route)
router.get('/profile', authenticateToken, (req, res) => {
  authController.getProfile(req, res);
});

module.exports = router;