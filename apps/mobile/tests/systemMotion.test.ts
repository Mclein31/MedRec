import assert from 'node:assert/strict';
import test from 'node:test';
import { createSystemMotionSignal } from '../src/ui/systemMotion.ts';

test('live OS changes win over an older pending initial query', async () => {
  let finish!: (value: boolean) => void;
  let changed!: (value: boolean) => void;
  const signal = createSystemMotionSignal(() => new Promise<boolean>((resolve) => { finish = resolve; }), (cb) => { changed = cb; return () => {}; });
  const unsubscribe = signal.subscribe(() => {});
  changed(true);
  finish(false);
  await Promise.resolve();
  assert.equal(signal.getSnapshot(), true);
  changed(false);
  assert.equal(signal.getSnapshot(), false);
  unsubscribe();
});

test('multiple consumers share one OS listener and release it after the last consumer leaves', () => {
  let subscriptions = 0;
  let removals = 0;
  const signal = createSystemMotionSignal(async () => false, () => { subscriptions++; return () => { removals++; }; });
  const first = signal.subscribe(() => {});
  const second = signal.subscribe(() => {});
  assert.equal(subscriptions, 1);
  first(); assert.equal(removals, 0);
  second(); assert.equal(removals, 1);
});

test('an abandoned async query cannot overwrite a newer subscription', async () => {
  const pending: ((value: boolean) => void)[] = [];
  const signal = createSystemMotionSignal(() => new Promise<boolean>((resolve) => pending.push(resolve)), () => () => {});
  const first = signal.subscribe(() => {});
  first();
  const second = signal.subscribe(() => {});
  pending[1]!(true); await Promise.resolve();
  pending[0]!(false); await Promise.resolve();
  assert.equal(signal.getSnapshot(), true);
  second();
});
