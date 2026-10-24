const crypto = require('node:crypto');

// Exercise the running local server, not an in-process/mocked Express instance.
// This creates only a randomly named audit account, then deletes that account.
async function verifyLocalAuth() {
  const base = 'http://127.0.0.1:4000/api';
  const email = `medrec-auth-audit-${crypto.randomUUID()}@example.invalid`;
  const password = `Audit9A-${crypto.randomBytes(24).toString('hex')}`;
  let token;
  let created = false;
  let registrationAttempted = false;
  const results = {};
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${body.error || body.code || ''}`);
    return { status: response.status, body };
  };
  try {
    results.ready = (await request('/ready')).status;
    registrationAttempted = true;
    const registration = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Temporary Auth Audit', email, password }) });
    created = true;
    token = registration.body.token;
    results.register = registration.status;
    if (!token) throw new Error('Registration did not return a session token.');
    const duplicate = await fetch(`${base}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Retry must not replace the name', email, password }),
      signal: AbortSignal.timeout(15000),
    });
    const duplicateBody = await duplicate.json();
    results.signupRetry = duplicate.status;
    if (duplicate.status !== 409 || duplicateBody.code !== 'EMAIL_ALREADY_EXISTS') throw new Error('Signup retry did not return the recoverable email-conflict code.');
    const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = login.body.token;
    if (!token) throw new Error('Login did not return a session token.');
    results.login = login.status;
    if (login.body.user.id !== registration.body.user.id || login.body.user.name !== 'Temporary Auth Audit') throw new Error('Signup retry changed the original account.');
    for (const endpoint of ['/auth/me', '/profile', '/records', '/share', '/notifications']) results[endpoint] = (await request(endpoint)).status;
    results.logout = (await request('/auth/logout', { method: 'POST' })).status;
    const revoked = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    results.revokedSession = revoked.status;
    if (revoked.status !== 401) throw new Error('Logging out did not revoke the session.');
    const again = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = again.body.token;
    results.loginAgain = again.status;
    console.log(JSON.stringify({ result: 'pass', checks: results }));
  } finally {
    if (registrationAttempted) {
      // Scope cleanup to this exact generated identity, including partial
      // registration/signing failures. Never delete an existing patient account.
      const pool = require('../src/config/db');
      try {
        const deleted = await pool.query('DELETE FROM public.users WHERE email = $1', [email]);
        if (created && deleted.rowCount !== 1) throw new Error('Could not verify temporary audit-account cleanup.');
        console.log(deleted.rowCount ? 'Temporary audit account removed.' : 'No temporary audit account remains.');
      } finally { await pool.end(); }
    }
  }
}

verifyLocalAuth().catch(error => {
  console.error('Local auth verification failed:', error.message);
  process.exitCode = 1;
});
