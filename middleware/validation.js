// Input validation and sanitization middleware
// Implements secure programming principles for data validation

const validator = require('validator');
const Logger = require('../utils/logger');

/**
 * Validates email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return validator.isEmail(email) && email.length <= 255;
};

/**
 * Validates password strength
 * Requirements: min 8 chars, at least one uppercase, one lowercase, one number
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  if (password.length < 8) {
    return false;
  }
  // Check for at least one uppercase, one lowercase, one number
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasUpper && hasLower && hasNumber;
};

/**
 * Validates phone number format (basic validation)
 * Accepts international format (+country code) or local format (can start with 0)
 */
const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Check if it's numeric and reasonable length (8-15 digits)
  // Allows: +1234567890 (international) or 0770701163 (local with leading 0)
  return /^\+?\d{8,15}$/.test(cleaned);
};

/**
 * Sanitizes string input to prevent XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  return validator.escape(str.trim());
};

/**
 * Middleware to validate registration data
 */
const validateRegistration = (req, res, next) => {
  const { email, password, phoneNumber } = req.body;
  const errors = [];

  // Validate email
  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate password
  if (!password) {
    errors.push('Password is required');
  } else if (!validatePassword(password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  // Validate phone number
  if (!phoneNumber) {
    errors.push('Phone number is required');
  } else if (!validatePhoneNumber(phoneNumber)) {
    errors.push('Invalid phone number format');
  }

  if (errors.length > 0) {
    Logger.warn('Registration validation failed', {
      email: req.body.email,
      errors,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  // Sanitize inputs (preserve original email format, just trim whitespace)
  req.body.email = email.trim().toLowerCase();
  req.body.phoneNumber = sanitizeString(phoneNumber);
  
  next();
};

/**
 * Middleware to validate login data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    Logger.warn('Login validation failed', {
      email: req.body.email,
      errors,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  // Sanitize email (preserve original format, just trim and lowercase)
  req.body.email = email.trim().toLowerCase();
  
  next();
};

/**
 * Middleware to validate MFA code
 */
const validateMFACode = (req, res, next) => {
  const { mfaCode } = req.body;

  if (!mfaCode) {
    return res.status(400).json({ error: 'MFA code is required' });
  }

  // MFA code should be 6 digits
  if (!/^\d{6}$/.test(mfaCode)) {
    return res.status(400).json({ error: 'Invalid MFA code format' });
  }

  next();
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  sanitizeString,
  validateRegistration,
  validateLogin,
  validateMFACode
};

