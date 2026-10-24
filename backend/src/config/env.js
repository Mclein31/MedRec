const path = require('path');
const dotenv = require('dotenv');

const isTest = process.env.NODE_ENV === 'test';
dotenv.config({
  path: path.resolve(__dirname, isTest ? '../../.env.test' : '../../.env'),
  override: isTest,
  quiet: true,
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.trim().length < 32 || JWT_SECRET === 'medrec-production-jwt-secret-at-least-32-chars-long') {
  throw new Error('JWT_SECRET must be configured with a private random secret of at least 32 characters.');
}

function positiveTimeout(name, fallback) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isInteger(value) || value < 1 || value > 120000) {
    throw new Error(`${name} must be a whole number between 1 and 120000 milliseconds.`);
  }
  return value;
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PG_CONNECTION_TIMEOUT_MS: positiveTimeout('PG_CONNECTION_TIMEOUT_MS', 5000),
  PG_QUERY_TIMEOUT_MS: positiveTimeout('PG_QUERY_TIMEOUT_MS', 10000),
};
