// config/database.js
const mysql = require('mysql2/promise');
const Logger = require('../utils/logger');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'banking_auth',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
  .then((connection) => {
    Logger.success('Connected to MySQL database', {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'banking_auth',
      user: process.env.DB_USER || 'root'
    });
    connection.release();
  })
  .catch((err) => {
    Logger.error('Database connection error', err, {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'banking_auth'
    });
  });

// Enhanced query wrapper with error logging and MySQL result format conversion
const originalQuery = pool.query.bind(pool);
pool.query = async function(text, params) {
  Logger.query(text, params);
  try {
    const [rows, fields] = await originalQuery(text, params);
    // Convert MySQL result format to PostgreSQL-like format for compatibility
    return { rows, fields };
  } catch (err) {
    Logger.error('Database query error', err, {
      query: text,
      params: params ? params.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p) : []
    });
    throw err;
  }
};

module.exports = pool;