const path = require('path');

describe('Backend environment configuration', () => {
  const previousEnvironment = process.env;
  let configure;

  beforeEach(() => {
    process.env = { ...previousEnvironment, JWT_SECRET: 'isolated-private-unit-test-secret-of-thirty-two-characters', NODE_ENV: 'development' };
    delete process.env.PG_CONNECTION_TIMEOUT_MS;
    delete process.env.PG_QUERY_TIMEOUT_MS;
    configure = jest.fn();
    jest.doMock('dotenv', () => ({ config: configure }));
  });
  afterEach(() => { process.env = previousEnvironment; jest.dontMock('dotenv'); });

  function load() {
    let configuration;
    jest.isolateModules(() => { configuration = require('../src/config/env'); });
    return configuration;
  }

  it('loads the backend environment by absolute path, regardless of launch directory', () => {
    const configuration = load();
    expect(configure).toHaveBeenCalledWith({ path: path.resolve(__dirname, '../.env'), override: false, quiet: true });
    expect(configuration.PG_CONNECTION_TIMEOUT_MS).toBe(5000);
    expect(configuration.PG_QUERY_TIMEOUT_MS).toBe(10000);
  });

  it('loads only the separate test environment with deterministic precedence', () => {
    process.env.NODE_ENV = 'test';
    load();
    expect(configure).toHaveBeenCalledWith({ path: path.resolve(__dirname, '../.env.test'), override: true, quiet: true });
  });

  it.each([undefined, '', 'short-secret', 'medrec-production-jwt-secret-at-least-32-chars-long'])('refuses missing, weak, or public JWT secret %#', secret => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    expect(load).toThrow(/private random secret/);
  });

  it.each(['0', '-1', 'Infinity', '1.5', '120001', 'invalid'])('rejects an unbounded or invalid database timeout %s', timeout => {
    process.env.PG_CONNECTION_TIMEOUT_MS = timeout;
    expect(load).toThrow(/PG_CONNECTION_TIMEOUT_MS/);
  });
});
