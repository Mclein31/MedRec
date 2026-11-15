import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNone, withDraft } from '../src/listDraft.ts';

test('saves text typed into a list field even if Add was never tapped', () => {
  assert.deepEqual(withDraft([], '  Penicillin '), ['Penicillin']);
  assert.deepEqual(withDraft(['Asthma'], 'Eczema'), ['Asthma', 'Eczema']);
});

test('ignores blank drafts and case-insensitive duplicates', () => {
  const items = ['Penicillin'];
  assert.equal(withDraft(items, '   '), items);
  assert.equal(withDraft(items, 'penicillin'), items);
});

test('a real entry replaces the explicit none answer', () => {
  const none = 'No known allergies';
  assert.deepEqual(withDraft([none], 'Penicillin', none), ['Penicillin']);
  assert.deepEqual(withDraft([none], '  ', none), [none]);
  assert.equal(isNone([none], none), true);
  assert.equal(isNone([], none), false);
  assert.equal(isNone(['Penicillin'], none), false);
});
