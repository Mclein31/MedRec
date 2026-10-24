process.env.NODE_ENV = 'test';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.test'), override: true, quiet: true });
