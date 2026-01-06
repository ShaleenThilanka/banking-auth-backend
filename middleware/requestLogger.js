// Request Logger Middleware
// Logs all incoming requests and responses for debugging

const Logger = require('../utils/logger');

/**
 * Middleware to log HTTP requests and responses
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  Logger.request(req);

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    Logger.response(req, res, res.statusCode, responseTime);
    return originalJson(data);
  };

  // Override res.send to log response
  const originalSend = res.send.bind(res);
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    Logger.response(req, res, res.statusCode, responseTime);
    return originalSend(data);
  };

  next();
};

module.exports = requestLogger;

