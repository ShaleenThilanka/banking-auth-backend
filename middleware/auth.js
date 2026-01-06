// Authentication Middleware
// Validates JWT tokens and provides user context

const jwt = require('jsonwebtoken');
const { auditLog } = require('../utils/auditLogger');

/**
 * Middleware to authenticate JWT tokens
 * Follows secure programming principles
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!token) {
    auditLog(null, 'AUTH_FAILED', 'auth', null, ipAddress, userAgent, 
      { reason: 'No token provided' }, 401);
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      await auditLog(null, 'AUTH_FAILED', 'auth', null, ipAddress, userAgent, 
        { reason: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' }, 403);
      return res.status(403).json({ 
        error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or expired token' 
      });
    }

    // Attach user to request object
    req.user = user;
    
    // Log successful authentication
    await auditLog(user.userId, 'AUTH_SUCCESS', 'auth', user.userId, ipAddress, userAgent);
    
    next();
  });
}

module.exports = { authenticateToken };