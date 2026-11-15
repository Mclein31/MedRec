import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstName, GOALS, GOAL_ORDER, NO_PERSONAL, orderCategories, pinnedCategories, sanitizePersonal, toggleCategory } from '../src/personal.ts';

const ALL = ['consultation', 'lab', 'prescription', 'imaging', 'vaccination'];

test('the first two picks become the Records tabs, topped up from the defaults', () => {
  assert.deepEqual(pinnedCategories([]), ['lab', 'prescription']);
  assert.deepEqual(pinnedCategories(['imaging']), ['imaging', 'lab']);
  assert.deepEqual(pinnedCategories(['prescription']), ['prescription', 'lab']);
  assert.deepEqual(pinnedCategories(['vaccination', 'imaging', 'lab']), ['vaccination', 'imaging']);
  assert.deepEqual(pinnedCategories(['removed-category', 'imaging'], ALL), ['imaging', 'lab']);
});

test('picked categories lead the list in pick order and nothing is lost', () => {
  assert.deepEqual(orderCategories(ALL, ['imaging', 'lab']), ['imaging', 'lab', 'consultation', 'prescription', 'vaccination']);
  assert.deepEqual(orderCategories(ALL, []), ALL);
  assert.deepEqual(orderCategories(ALL, ['unknown']), ALL);
});

test('toggling keeps selection order', () => {
  assert.deepEqual(toggleCategory(['lab'], 'imaging'), ['lab', 'imaging']);
  assert.deepEqual(toggleCategory(['lab', 'imaging'], 'lab'), ['imaging']);
});

test('greets by the first word only', () => {
  assert.equal(firstName('  Alex  Morgan '), 'Alex');
  assert.equal(firstName('   '), '');
});

test('stored answers are sanitized', () => {
  assert.deepEqual(sanitizePersonal(null), NO_PERSONAL);
  assert.deepEqual(sanitizePersonal({ name: 5, goal: 'win', categories: 'lab' }), NO_PERSONAL);
  assert.deepEqual(sanitizePersonal({ name: 'Alex', goal: 'visits', categories: ['lab', 'lab', 3] }), { name: 'Alex', goal: 'visits', categories: ['lab'] });
});

test('every goal has copy, and only real destinations as shortcuts', () => {
  for (const key of GOAL_ORDER) {
    const g = GOALS[key];
    assert.ok(g.title && g.subtitle && g.reaction && g.summary && g.home.headline && g.home.body);
    if (g.shortcut) assert.ok(['remy', 'share', 'medical'].includes(g.shortcut.to));
  }
});
