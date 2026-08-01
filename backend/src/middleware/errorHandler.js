// Centralized error handler. Controllers call next(err) on unexpected failures.
function errorHandler(err, req, res, next) {
  console.error(err);

  // Postgres unique violation (e.g. duplicate email)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  // Postgres invalid input syntax (e.g. malformed UUID passed in a URL)
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Postgres value too long for column
  if (err.code === '22001') {
    return res.status(400).json({ error: 'One of the provided values is too long' });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

module.exports = { errorHandler, notFound };
