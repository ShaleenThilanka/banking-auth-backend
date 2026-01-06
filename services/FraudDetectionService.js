// FraudDetectionService: Implements rule-based fraud detection
// Follows Single Responsibility Principle (SOLID)

const pool = require('../config/database');
const { auditLog } = require('../utils/auditLogger');
const { getGeolocationData } = require('../utils/geolocation');
const Logger = require('../utils/logger');

class FraudDetectionService {
  /**
   * Main fraud detection method
   */
  async detectFraud(userId, ipAddress, userAgent, success) {
    try {
      // Get geolocation data
      const geoData = await getGeolocationData(ipAddress);

      // Record login attempt with geolocation
      await this.recordLoginAttempt(userId, ipAddress, userAgent, success, geoData);

      if (!success) {
        await this.checkFailedLoginPatterns(userId, ipAddress);
        return;
      }

      // For successful logins, run all fraud checks
      await Promise.all([
        this.checkMultipleIPs(userId, ipAddress),
        this.checkUnusualLocation(userId, geoData),
        this.checkRapidLogins(userId, ipAddress),
        this.updateGeolocationProfile(userId, geoData)
      ]);
    } catch (error) {
      Logger.error('Fraud detection error', error, {
        userId,
        ipAddress,
        success
      });
      await auditLog(userId, 'FRAUD_DETECTION_ERROR', 'fraud', userId, ipAddress, userAgent, 
        { error: error.message }, 500);
    }
  }

  /**
   * Record login attempt with geolocation data
   */
  async recordLoginAttempt(userId, ipAddress, userAgent, success, geoData) {
    try {
      await pool.query(
        `INSERT INTO login_attempts 
         (user_id, ip_address, user_agent, success, geolocation_data, country_code, city, latitude, longitude) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          ipAddress,
          userAgent,
          success,
          JSON.stringify(geoData),
          geoData?.country_code || null,
          geoData?.city || null,
          geoData?.latitude || null,
          geoData?.longitude || null
        ]
      );
    } catch (error) {
      Logger.error('Error recording login attempt', error, { userId, ipAddress, success });
    }
  }

  /**
   * Check for multiple failed login attempts
   */
  async checkFailedLoginPatterns(userId, ipAddress) {
    try {
      const failedAttempts = await pool.query(
        `SELECT COUNT(*) as count 
         FROM login_attempts 
         WHERE user_id = $1 AND success = false AND timestamp > NOW() - INTERVAL '15 minutes'`,
        [userId]
      );

      const count = parseInt(failedAttempts.rows[0].count);

      if (count >= 3) {
        await this.flagFraud(
          userId,
          'Multiple failed login attempts within 15 minutes',
          3,
          ipAddress,
          { failedAttempts: count, timeWindow: '15 minutes' }
        );
      }
    } catch (error) {
      Logger.error('Error checking failed login patterns', error, { userId, ipAddress });
    }
  }

  /**
   * Check for multiple IP addresses in short time
   */
  async checkMultipleIPs(userId, ipAddress) {
    try {
      const recentIPs = await pool.query(
        `SELECT COUNT(DISTINCT ip_address) as ip_count 
         FROM login_attempts 
         WHERE user_id = $1 AND success = true AND timestamp > NOW() - INTERVAL '1 hour'`,
        [userId]
      );

      const ipCount = parseInt(recentIPs.rows[0].ip_count);

      if (ipCount > 2) {
        // Get the distinct IPs
        const distinctIPs = await pool.query(
          `SELECT DISTINCT ip_address 
           FROM login_attempts 
           WHERE user_id = $1 AND success = true AND timestamp > NOW() - INTERVAL '1 hour'`,
          [userId]
        );

        await this.flagFraud(
          userId,
          'Multiple IP addresses used in short time period',
          2,
          ipAddress,
          { 
            ipCount, 
            timeWindow: '1 hour',
            ipAddresses: distinctIPs.rows.map(r => r.ip_address)
          }
        );
      }
    } catch (error) {
      Logger.error('Error checking multiple IPs', error, { userId, ipAddress });
    }
  }

  /**
   * Check for unusual geolocation
   */
  async checkUnusualLocation(userId, geoData) {
    try {
      if (!geoData || !geoData.country_code) {
        return; // Cannot check without geolocation data
      }

      // Get user's trusted locations
      const trustedLocations = await pool.query(
        `SELECT country_code, city, is_trusted 
         FROM user_geolocation_profiles 
         WHERE user_id = $1 AND is_trusted = true`,
        [userId]
      );

      // If user has no trusted locations, mark this as trusted
      if (trustedLocations.rows.length === 0) {
        await this.updateGeolocationProfile(userId, geoData, true);
        return;
      }

      // Check if current location matches any trusted location
      const isKnownLocation = trustedLocations.rows.some(loc => 
        loc.country_code === geoData.country_code && 
        (!geoData.city || loc.city === geoData.city)
      );

      if (!isKnownLocation) {
        // Calculate distance from nearest trusted location if we have coordinates
        let distance = null;
        if (geoData.latitude && geoData.longitude) {
          const nearestLocation = await pool.query(
            `SELECT latitude, longitude 
             FROM user_geolocation_profiles 
             WHERE user_id = $1 AND is_trusted = true 
             ORDER BY 
               (6371 * acos(
                 cos(radians($2)) * cos(radians(latitude)) * 
                 cos(radians(longitude) - radians($3)) + 
                 sin(radians($2)) * sin(radians(latitude))
               )) ASC
             LIMIT 1`,
            [userId, geoData.latitude, geoData.longitude]
          );

          if (nearestLocation.rows.length > 0) {
            const loc = nearestLocation.rows[0];
            distance = this.calculateDistance(
              geoData.latitude, geoData.longitude,
              parseFloat(loc.latitude), parseFloat(loc.longitude)
            );
          }
        }

        // Flag if distance is significant (>1000km) or unknown location
        if (!distance || distance > 1000) {
          await this.flagFraud(
            userId,
            `Unusual geolocation: ${geoData.city || 'Unknown'}, ${geoData.country_code}`,
            distance && distance > 5000 ? 4 : 2,
            geoData.ipAddress,
            {
              country: geoData.country_code,
              city: geoData.city,
              distance: distance ? `${distance.toFixed(2)} km` : 'Unknown'
            }
          );
        }
      }
    } catch (error) {
      Logger.error('Error checking unusual location', error, { userId, geoData });
    }
  }

  /**
   * Check for rapid successive logins (potential automated attack)
   */
  async checkRapidLogins(userId, ipAddress) {
    try {
      const rapidLogins = await pool.query(
        `SELECT COUNT(*) as count 
         FROM login_attempts 
         WHERE user_id = $1 AND success = true AND timestamp > NOW() - INTERVAL '5 minutes'`,
        [userId]
      );

      const count = parseInt(rapidLogins.rows[0].count);

      if (count > 5) {
        await this.flagFraud(
          userId,
          'Rapid successive logins detected (potential automated attack)',
          3,
          ipAddress,
          { loginCount: count, timeWindow: '5 minutes' }
        );
      }
    } catch (error) {
      Logger.error('Error checking rapid logins', error, { userId, ipAddress });
    }
  }

  /**
   * Update user's geolocation profile
   */
  async updateGeolocationProfile(userId, geoData, isTrusted = false) {
    try {
      if (!geoData || !geoData.country_code) {
        return;
      }

      // Check if location profile exists
      const existing = await pool.query(
        `SELECT id, login_count FROM user_geolocation_profiles 
         WHERE user_id = $1 AND country_code = $2 AND city = $3`,
        [userId, geoData.country_code, geoData.city || null]
      );

      if (existing.rows.length > 0) {
        // Update existing profile
        await pool.query(
          `UPDATE user_geolocation_profiles 
           SET last_seen = CURRENT_TIMESTAMP, 
               login_count = login_count + 1,
               is_trusted = CASE WHEN login_count >= 3 THEN true ELSE is_trusted END
           WHERE id = $1`,
          [existing.rows[0].id]
        );
      } else {
        // Create new profile
        await pool.query(
          `INSERT INTO user_geolocation_profiles 
           (user_id, country_code, city, latitude, longitude, is_trusted) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            geoData.country_code,
            geoData.city || null,
            geoData.latitude || null,
            geoData.longitude || null,
            isTrusted
          ]
        );
      }
    } catch (error) {
      Logger.error('Error updating geolocation profile', error, { userId, geoData });
    }
  }

  /**
   * Flag potential fraud
   */
  async flagFraud(userId, reason, severity, ipAddress, metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO fraud_flags (user_id, reason, severity, ip_address, metadata) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, reason, severity, ipAddress, JSON.stringify(metadata)]
      );

      await auditLog(userId, 'FRAUD_FLAGGED', 'fraud', userId, ipAddress, null, 
        { reason, severity, metadata }, 200);
    } catch (error) {
      Logger.error('Error flagging fraud', error, { userId, reason, severity, ipAddress });
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get fraud alerts for a user
   */
  async getFraudAlerts(userId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM fraud_flags 
         WHERE user_id = $1 
         ORDER BY detected_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      Logger.error('Error getting fraud alerts', error, { userId });
      throw error;
    }
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM login_attempts 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      Logger.error('Error getting login history', error, { userId });
      throw error;
    }
  }
}

module.exports = new FraudDetectionService();

