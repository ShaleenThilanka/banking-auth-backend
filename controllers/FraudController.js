// FraudController: Handles HTTP requests for fraud detection data
// Follows MVC pattern

const fraudDetectionService = require('../services/FraudDetectionService');

class FraudController {
  /**
   * Get fraud alerts for authenticated user
   */
  async getFraudAlerts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const alerts = await fraudDetectionService.getFraudAlerts(
        req.user.userId,
        limit
      );

      res.json({ alerts });
    } catch (error) {
      console.error('Fraud alerts error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch fraud alerts' 
      });
    }
  }

  /**
   * Get login history for authenticated user
   */
  async getLoginHistory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const history = await fraudDetectionService.getLoginHistory(
        req.user.userId,
        limit
      );

      res.json({ history });
    } catch (error) {
      console.error('Login history error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch login history' 
      });
    }
  }
}

module.exports = new FraudController();

