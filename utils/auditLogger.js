// Audit Logger: Comprehensive audit trail for security compliance
// Implements audit logging for GDPR, PCI-DSS compliance

const pool = require('../config/database');

/**
 * Log audit event
 * @param {number} userId - User ID (null for anonymous actions)
 * @param {string} action - Action performed
 * @param {string} resourceType - Type of resource (auth, user, fraud, etc.)
 * @param {number} resourceId - ID of the resource
 * @param {string} ipAddress - IP address of the requester
 * @param {string} userAgent - User agent string
 * @param {object} requestData - Additional request data
 * @param {number} responseStatus - HTTP response status
 */
async function auditLog(userId, action, resourceType, resourceId, ipAddress, userAgent, requestData = {}, responseStatus = 200) {
  try {
    // Determine severity based on action type
    let severity = 'INFO';
    if (action.includes('FAILED') || action.includes('FRAUD') || action.includes('ERROR')) {
      severity = 'WARN';
    }
    if (action.includes('SECURITY') || action.includes('BREACH')) {
      severity = 'ERROR';
    }

    await pool.query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, resource_id, ip_address, user_agent, request_data, response_status, severity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        JSON.stringify(requestData),
        responseStatus,
        severity
      ]
    );
  } catch (error) {
    // Don't throw error on audit log failure to prevent breaking main flow
    console.error('Audit logging error:', error);
  }
}

module.exports = {
  auditLog
};

