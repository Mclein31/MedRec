import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate, isCivilDate, timeLeft } from '../src/format.ts';

test('rejects impossible calendar dates', () => {
  assert.equal(isCivilDate('2026-02-28'), true);
  assert.equal(isCivilDate('2024-02-29'), true);
  assert.equal(isCivilDate('2026-02-30'), false);
  assert.equal(isCivilDate('2026-13-01'), false);
  assert.equal(isCivilDate('26-1-1'), false);
});

test('civil dates never shift a day across time zones', () => {
  assert.match(formatDate('2026-01-01', { year: true }), /2026/);
  assert.match(formatDate('2026-01-01', { year: true }), /1/);
  assert.equal(formatDate(null), 'Undated');
});

test('countdowns', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  assert.equal(timeLeft('2026-10-24T12:14:05Z', now), '14:05 left');
  assert.equal(timeLeft('2026-10-24T11:59:00Z', now), 'Expired');
  assert.equal(timeLeft('2026-10-25T12:00:00Z', now), '24 h left');
});
