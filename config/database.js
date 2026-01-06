// config/database.js
const { Pool } = require('pg');
const Logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'banking_auth',
  user: process.env.DB_USER || 'shaliya',
  password: process.env.DB_PASSWORD || '12345678',
});

pool.on('connect', () => {
  Logger.success('Connected to PostgreSQL database', {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'banking_auth',
    user: process.env.DB_USER || 'shaliya'
  });
});

pool.on('error', (err) => {
  Logger.error('Database connection error', err, {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'banking_auth'
  });
});

// Enhanced query wrapper with error logging
const originalQuery = pool.query.bind(pool);
pool.query = function(text, params) {
  Logger.query(text, params);
  return originalQuery(text, params).catch((err) => {
    Logger.error('Database query error', err, {
      query: text,
      params: params ? params.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p) : []
    });
    throw err;
  });
};

module.exports = pool;