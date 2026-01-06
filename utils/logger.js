// Enhanced Logger Utility
// Provides structured logging for errors and debugging

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class Logger {
  /**
   * Format timestamp
   */
  static getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Log error with full details
   */
  static error(message, error = null, context = {}) {
    const timestamp = this.getTimestamp();
    console.error(`${colors.red}[ERROR]${colors.reset} [${timestamp}] ${message}`);
    
    if (error) {
      console.error(`${colors.red}Error Details:${colors.reset}`);
      console.error(`  Message: ${error.message || 'N/A'}`);
      console.error(`  Stack: ${error.stack || 'N/A'}`);
      
      if (error.code) {
        console.error(`  Code: ${error.code}`);
      }
      
      if (error.response) {
        console.error(`  Response Status: ${error.response.status}`);
        console.error(`  Response Data:`, error.response.data);
      }
    }
    
    if (Object.keys(context).length > 0) {
      console.error(`${colors.cyan}Context:${colors.reset}`, JSON.stringify(context, null, 2));
    }
    
    console.error(''); // Empty line for readability
  }

  /**
   * Log warning
   */
  static warn(message, context = {}) {
    const timestamp = this.getTimestamp();
    console.warn(`${colors.yellow}[WARN]${colors.reset} [${timestamp}] ${message}`);
    if (Object.keys(context).length > 0) {
      console.warn(`${colors.cyan}Context:${colors.reset}`, context);
    }
  }

  /**
   * Log info
   */
  static info(message, context = {}) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.blue}[INFO]${colors.reset} [${timestamp}] ${message}`);
    if (Object.keys(context).length > 0) {
      console.log(`${colors.cyan}Context:${colors.reset}`, context);
    }
  }

  /**
   * Log success
   */
  static success(message, context = {}) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.green}[SUCCESS]${colors.reset} [${timestamp}] ${message}`);
    if (Object.keys(context).length > 0) {
      console.log(`${colors.cyan}Context:${colors.reset}`, context);
    }
  }

  /**
   * Log database query (for debugging)
   */
  static query(query, params = []) {
    if (process.env.LOG_QUERIES === 'true') {
      const timestamp = this.getTimestamp();
      console.log(`${colors.magenta}[QUERY]${colors.reset} [${timestamp}]`);
      console.log(`  SQL: ${query}`);
      if (params.length > 0) {
        console.log(`  Params:`, params);
      }
    }
  }

  /**
   * Log HTTP request
   */
  static request(req) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.cyan}[REQUEST]${colors.reset} [${timestamp}] ${req.method} ${req.path}`);
    console.log(`  IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`  User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
    if (req.body && Object.keys(req.body).length > 0) {
      // Don't log passwords
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = '***';
      if (sanitizedBody.mfaCode) sanitizedBody.mfaCode = '***';
      console.log(`  Body:`, sanitizedBody);
    }
  }

  /**
   * Log HTTP response
   */
  static response(req, res, statusCode, responseTime) {
    const timestamp = this.getTimestamp();
    const color = statusCode >= 400 ? colors.red : statusCode >= 300 ? colors.yellow : colors.green;
    console.log(`${color}[RESPONSE]${colors.reset} [${timestamp}] ${req.method} ${req.path} - ${statusCode} (${responseTime}ms)`);
  }
}

module.exports = Logger;

