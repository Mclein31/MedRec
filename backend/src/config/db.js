const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : true,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

module.exports = pool;
