const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'skillswap',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,                  // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected DB pool error:', err.message);
});

/**
 * Run a single query against the pool.
 * @param {string} text  — SQL string with $1, $2 … placeholders
 * @param {Array}  params — bound parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Grab a dedicated client for multi-statement transactions.
 * Remember to call client.release() in a finally block.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
