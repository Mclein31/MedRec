import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTING_CYCLE_MS, blinkFrame, formAttention, minorFrameAt, privacyFrameAt } from '../src/ui/remyActing.ts';

test('a blink has closing, closed and reopening drawings, with stillness on both sides', () => {
  assert.deepEqual([-1, 0, 64, 65, 154, 155, 229, 230].map(blinkFrame), [null, 1, 1, 2, 2, 1, 1, null]);
});

test('Remy rests for most of the idle cycle instead of constantly waving', () => {
  let still = 0;
  for (let t = 0; t < ACTING_CYCLE_MS; t += 50) if (minorFrameAt(t, 'greeting', 'wave') === 0) still++;
  assert.ok(still / (ACTING_CYCLE_MS / 50) > 0.8);
  assert.equal(minorFrameAt(16_200, 'greeting', 'wave'), 0);
});

test('form attention and busy states look toward the form but retain natural blinks', () => {
  assert.equal(minorFrameAt(4000, 'default', 'idle', 'form'), 3);
  assert.equal(minorFrameAt(4000, 'reading', 'read', 'busy'), 3);
  assert.equal(minorFrameAt(2430, 'default', 'idle', 'form'), 2);
});

test('the private pose suppresses idle acting and covers/uncovering use the same reversible path', () => {
  assert.equal(minorFrameAt(2430, 'greeting', 'wave', 'private'), 0);
  const forward = [0, .2, .4, .6, .8, 1].map(privacyFrameAt);
  assert.deepEqual(forward, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([1, .8, .6, .4, .2, 0].map(privacyFrameAt), forward.toReversed());
  assert.equal(privacyFrameAt(3), 5);
  assert.equal(privacyFrameAt(-2), 0);
});

test('password visibility peeks only during password focus, with focus preserved during submission', () => {
  assert.equal(formAttention('private', false, false), 'private');
  assert.equal(formAttention('private', true, false), 'private');
  assert.equal(formAttention('private', false, true), 'peek');
  assert.equal(formAttention('private', true, true), 'peek');
  assert.equal(formAttention('form', false, true), 'form');
  assert.equal(formAttention('idle', true, true), 'busy');
});

test('static instances stay still and every primary pose uses valid atlas cells across cycle boundaries', () => {
  for (const pose of ['default', 'greeting', 'curious', 'searching', 'reading', 'saved'] as const) {
    for (let t = -1000; t < 61_000; t += 17) {
      const frame = minorFrameAt(t, pose, 'idle', 'idle', 137);
      assert.ok(Number.isInteger(frame) && frame >= 0 && frame <= 5);
      assert.equal(minorFrameAt(t, pose, 'none', 'form'), 0);
    }
  }
});
