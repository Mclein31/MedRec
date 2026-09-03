const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(__dirname, '../../.env.test'), override: true });
} else {
  dotenv.config();
}

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
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

module.exports = pool;
