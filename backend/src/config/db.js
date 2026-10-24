const { Pool } = require('pg');
const { PG_CONNECTION_TIMEOUT_MS, PG_QUERY_TIMEOUT_MS } = require('./env');

const isProduction = process.env.NODE_ENV === 'production';
const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED === 'true'
  ? true
  : (process.env.PGSSL_REJECT_UNAUTHORIZED === 'false' ? false : isProduction);

const ssl = process.env.PGSSL !== undefined
  ? (process.env.PGSSL === 'true' ? { rejectUnauthorized } : false)
  : (isProduction ? { rejectUnauthorized } : false);

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/medrec';

const pool = new Pool({
  connectionString,
  ssl,
  connectionTimeoutMillis: PG_CONNECTION_TIMEOUT_MS,
  query_timeout: PG_QUERY_TIMEOUT_MS,
  statement_timeout: PG_QUERY_TIMEOUT_MS,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

module.exports = pool;
