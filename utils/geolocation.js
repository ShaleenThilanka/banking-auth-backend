// Geolocation utility: Fetches geolocation data from IP address
// Uses free IP geolocation API (can be replaced with paid service for production)

const axios = require('axios');
const Logger = require('./logger');

/**
 * Get geolocation data from IP address
 * Uses ip-api.com (free tier) - can be replaced with commercial service
 */
async function getGeolocationData(ipAddress) {
  try {
    // Skip localhost/internal IPs
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return {
        ipAddress,
        country_code: null,
        city: null,
        latitude: null,
        longitude: null,
        isLocal: true
      };
    }

    // Use ip-api.com free service (rate limited but sufficient for prototype)
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,countryCode,city,lat,lon`, {
      timeout: 5000
    });

    if (response.data.status === 'success') {
      return {
        ipAddress,
        country_code: response.data.countryCode,
        city: response.data.city,
        latitude: response.data.lat,
        longitude: response.data.lon,
        isLocal: false
      };
    }

    return {
      ipAddress,
      country_code: null,
      city: null,
      latitude: null,
      longitude: null,
      isLocal: false
    };
  } catch (error) {
    Logger.error('Geolocation lookup failed', error, { ipAddress });
    // Return minimal data on error
    return {
      ipAddress,
      country_code: null,
      city: null,
      latitude: null,
      longitude: null,
      isLocal: false,
      error: error.message
    };
  }
}

module.exports = {
  getGeolocationData
};

