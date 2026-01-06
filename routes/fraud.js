// Fraud Routes: RESTful API endpoints for fraud detection data
// Follows MVC pattern with controller separation

const express = require('express');
const router = express.Router();
const fraudController = require('../controllers/FraudController');
const { authenticateToken } = require('../middleware/auth');

// Get fraud alerts for authenticated user
router.get('/alerts', authenticateToken, (req, res) => {
  fraudController.getFraudAlerts(req, res);
});

// Get login history for authenticated user
router.get('/login-history', authenticateToken, (req, res) => {
  fraudController.getLoginHistory(req, res);
});

module.exports = router;