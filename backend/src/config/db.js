const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED === 'true'
  ? true
  : (process.env.PGSSL_REJECT_UNAUTHORIZED === 'false' ? false : isProduction);

const ssl = process.env.PGSSL !== undefined
  ? (process.env.PGSSL === 'true' ? { rejectUnauthorized } : false)
  : (isProduction ? { rejectUnauthorized } : false);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

module.exports = pool;
