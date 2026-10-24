/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const file = path.resolve(__dirname, '../lib/apiBaseUrl.ts');
const loaded = new Module(file, module);
loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { resolveApiBaseUrl } = loaded.exports;

test('native development follows Metro when the Wi-Fi IP changes', () => {
  const options = { configuredUrl: '', development: true, platform: 'ios' };
  assert.equal(resolveApiBaseUrl({ ...options, metroHost: '192.168.1.25:8081' }), 'http://192.168.1.25:4000/api');
  assert.equal(resolveApiBaseUrl({ ...options, metroHost: '192.168.1.9:8081' }), 'http://192.168.1.9:4000/api');
});

test('web uses the browser host and Android maps Metro loopback to its host machine', () => {
  assert.equal(resolveApiBaseUrl({ development: true, platform: 'web', webHostname: 'localhost', metroHost: '192.168.1.9:8081' }), 'http://localhost:4000/api');
  assert.equal(resolveApiBaseUrl({ development: true, platform: 'android', metroHost: '127.0.0.1:8081' }), 'http://10.0.2.2:4000/api');
  assert.equal(resolveApiBaseUrl({ development: true, platform: 'android', metroHost: '192.168.1.9:8081' }), 'http://192.168.1.9:4000/api');
});

test('explicit backend URLs remain authoritative and omit trailing slashes', () => {
  for (const development of [true, false]) {
    assert.equal(resolveApiBaseUrl({ development, platform: 'ios', configuredUrl: ' https://api.example.com/api/ ', metroHost: '192.168.1.9:8081' }), 'https://api.example.com/api');
  }
});

test('missing Metro metadata preserves local platform fallbacks', () => {
  assert.equal(resolveApiBaseUrl({ development: true, platform: 'ios' }), 'http://localhost:4000/api');
  assert.equal(resolveApiBaseUrl({ development: true, platform: 'android', metroHost: 'invalid host!' }), 'http://10.0.2.2:4000/api');
  assert.equal(resolveApiBaseUrl({ development: true, platform: 'ios', metroHost: '[::1]:8081' }), 'http://[::1]:4000/api');
});
