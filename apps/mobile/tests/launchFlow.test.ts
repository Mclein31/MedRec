import assert from 'node:assert/strict';
import test from 'node:test';
import { launchPresentation } from '../src/ui/launchFlow.ts';

const start = { startupComplete: false, completedUser: null, status: 'loading' as const, onboarded: null, userId: null };

test('startup waits for both session and first-use state before choosing a story', () => {
  assert.equal(launchPresentation(start)?.kind, null);
  assert.equal(launchPresentation({ ...start, status: 'signedOut' })?.done, false);
  assert.equal(launchPresentation({ ...start, onboarded: false })?.done, false);
  assert.deepEqual(launchPresentation({ ...start, onboarded: true }), { key: 'startup', kind: 'returning', reason: 'startup', done: false });
  assert.deepEqual(launchPresentation({ ...start, status: 'signedOut', onboarded: false }), { key: 'startup', kind: 'first-use', reason: 'startup', done: true });
});

test('existing sessions, returning users and offline restoration do not replay the first-use story', () => {
  assert.equal(launchPresentation({ ...start, status: 'signedOut', onboarded: true })?.kind, 'returning');
  assert.equal(launchPresentation({ ...start, status: 'signedIn', userId: 'a', onboarded: false })?.kind, 'returning');
  assert.equal(launchPresentation({ ...start, status: 'offline', onboarded: false })?.kind, 'returning');
});

test('login arrival requires authentication, acknowledges that user, and can replay after logout', () => {
  const auth = { ...start, startupComplete: true, status: 'signedOut' as const, onboarded: true };
  assert.equal(launchPresentation(auth), null);
  const session = { ...auth, status: 'signedIn' as const, userId: 'a' };
  assert.deepEqual(launchPresentation(session), { key: 'session', kind: 'returning', reason: 'sign-in', done: true });
  assert.equal(launchPresentation({ ...session, completedUser: 'a' }), null);
  assert.equal(launchPresentation({ ...session, completedUser: 'b' })?.reason, 'sign-in');
  assert.equal(launchPresentation({ ...auth, completedUser: 'a' }), null);
  assert.equal(launchPresentation({ ...session, completedUser: null })?.done, true);
});

test('session retry keeps a pending preload and exposes offline UI on failure', () => {
  const retry = { ...start, startupComplete: true, onboarded: true };
  assert.deepEqual(launchPresentation(retry), { key: 'session', kind: 'returning', reason: 'sign-in', done: false });
  assert.equal(launchPresentation({ ...retry, status: 'offline' }), null);
});
