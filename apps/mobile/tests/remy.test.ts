import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HealthRecord } from '../src/lib/api.ts';
import { answer, extractTerm, type Search } from '../src/remy/answer.ts';

const rec = (over: Partial<HealthRecord>): HealthRecord => ({
  id: 'r1', title: 'Complete blood count', category: 'lab', eventDate: '2026-10-22', provider: null, facility: 'Rivera Diagnostic Center',
  notes: null, ai: null, fileCount: 1, createdAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z', ...over,
});

/** Mimics the API: `q` matches titles only, `category` filters, newest first. */
const fake = (records: HealthRecord[]): Search => async ({ q, category }) =>
  records.filter((r) => (!q || q.split(' ').some((w) => r.title.toLowerCase().includes(w))) && (!category || r.category === category));

const cbc = rec({ ai: { summary: 's', findings: [], medications: [], labValues: [], terms: [{ term: 'Hemoglobin', meaning: 'The protein in red blood cells that carries oxygen.' }], model: 'm' } });
const visit = rec({ id: 'r2', title: 'Annual checkup', category: 'consultation', eventDate: '2026-10-18' });

test('extracts the term from common phrasings', () => {
  assert.equal(extractTerm('What does reference range mean?'), 'reference range');
  assert.equal(extractTerm('what is HbA1c'), 'hba1c');
  assert.equal(extractTerm('Explain hemoglobin'), 'hemoglobin');
  assert.equal(extractTerm('Find my latest blood test'), null);
});

test('finds the latest blood test from the actual records and links its id', async () => {
  const r = await answer('Find my latest blood test', fake([cbc, visit]));
  assert.equal(r.kind, 'records');
  assert.equal(r.kind === 'records' && r.records[0]!.id, 'r1');
});

test('explains a term from the AI reading saved with a record, even when search misses it', async () => {
  const r = await answer('What does hemoglobin mean?', fake([cbc, visit]));
  assert.equal(r.kind, 'term');
  assert.ok(r.kind === 'term' && r.source?.id === 'r1' && !r.general);
});

test('falls back to general glossary text, labelled as general', async () => {
  const r = await answer('What does reference range mean?', fake([visit]));
  assert.ok(r.kind === 'term' && r.general && r.source === null);
});

test('never gives personal medical advice', async () => {
  for (const q of ['Should I stop taking metformin?', 'Is it safe to double my dose?', 'Do I have diabetes?']) {
    assert.equal((await answer(q, fake([cbc]))).kind, 'unsupported', q);
  }
});

test('points urgent symptoms to emergency care instead of triaging', async () => {
  assert.equal((await answer('I have chest pain', fake([cbc]))).kind, 'urgent');
});

test('answers app help questions with fixed MedRec guidance', async () => {
  const r = await answer('How does sharing work?', fake([]));
  assert.ok(r.kind === 'help' && r.link?.href === '/share/new');
});

test('admits when it has no answer instead of inventing one', async () => {
  assert.equal((await answer('Tell me a joke', fake([]))).kind, 'unsupported');
});
