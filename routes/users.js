const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Users route working' });
});

module.exports = router;