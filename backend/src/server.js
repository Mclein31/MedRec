const app = require('./app');
const { runMigrations } = require('./migrations/runMigration');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    console.log('[Server] Checking database schema & applying migrations...');
    await runMigrations();
    console.log('[Server] Database schema is up to date.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Listening on http://localhost:${PORT} and http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Fatal error initializing database migrations:', err);
    process.exit(1);
  }
}

startServer();
