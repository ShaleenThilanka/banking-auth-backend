const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (for debugging)
if (process.env.LOG_REQUESTS !== 'false') {
  app.use(requestLogger);
}

// Rate limiting - more lenient in development, stricter in production
const isDevelopment = process.env.NODE_ENV !== 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // More lenient in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Note: Auth-specific rate limiters are defined in routes/auth.js for granular control

app.use(generalLimiter);

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fraudRoutes = require('./routes/fraud');

// Use routes (rate limiting applied in route files for granular control)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fraud', fraudRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Banking Auth Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  Logger.error('Unhandled error in request', err, {
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  Logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, () => {
  Logger.success(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
  Logger.info(`Health check: http://localhost:${PORT}/api/health`);
  
  // Log database connection status
  const pool = require('./config/database');
  pool.query('SELECT NOW() as now')
    .then(() => {
      Logger.success('Database connection established');
    })
    .catch((err) => {
      Logger.error('Database connection failed', err);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  Logger.error('Unhandled Promise Rejection', err);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  Logger.error('Uncaught Exception', err);
  // Gracefully shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Logger.info('Process terminated');
    process.exit(0);
  });
});