import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveApiBase } from '../src/lib/apiBase.ts';

test('an explicit URL always wins, without a trailing slash', () => {
  assert.equal(resolveApiBase({ explicit: 'https://api.medrec.app/', hostUri: '192.168.1.9:8081', platform: 'ios' }), 'https://api.medrec.app');
});

test('development follows the current Metro host, so a new Wi-Fi address just works', () => {
  assert.equal(resolveApiBase({ hostUri: '192.168.1.9:8081', platform: 'ios' }), 'http://192.168.1.9:8787');
  assert.equal(resolveApiBase({ hostUri: '10.0.0.42:8081', platform: 'ios' }), 'http://10.0.0.42:8787');
});

test('the Android emulator reaches the laptop through 10.0.2.2', () => {
  assert.equal(resolveApiBase({ hostUri: 'localhost:8081', platform: 'android' }), 'http://10.0.2.2:8787');
  assert.equal(resolveApiBase({ hostUri: null, platform: 'android' }), 'http://10.0.2.2:8787');
});

test('web uses the page host', () => {
  assert.equal(resolveApiBase({ webHost: 'localhost', platform: 'web' }), 'http://localhost:8787');
});
