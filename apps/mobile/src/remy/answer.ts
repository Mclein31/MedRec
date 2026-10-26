import { formatDate } from '../format.ts';
import type { HealthRecord } from '../lib/api';

/**
 * Ask Remy without a chat model. Every answer comes from one of three honest sources:
 * the user's own records (search), terms the AI already explained inside those records,
 * or fixed help text about MedRec itself. Anything else gets an explicit "can't answer yet".
 */

export type Search = (params: { q?: string; category?: string; limit?: number }) => Promise<HealthRecord[]>;

export type Reply =
  | { kind: 'records'; text: string; records: HealthRecord[] }
  | { kind: 'term'; term: string; text: string; source: HealthRecord | null; general: boolean }
  | { kind: 'help'; text: string; link?: { label: string; href: string } }
  | { kind: 'urgent'; text: string }
  | { kind: 'unsupported'; text: string };

const URGENT = /\b(chest pain|can'?t breathe|cannot breathe|short of breath|overdose|suicid|kill myself|stroke|unconscious|severe bleeding|emergency)\b/i;

/** Requests for personal medical decisions; Remy never answers these. */
const ADVICE = /\b(should i|is it safe|is it normal|is this normal|am i|do i have|can i (stop|start|take|skip|double)|stop taking|dose|dosage|diagnos|treat(ment)?|cure)\b/i;

const CATEGORY_WORDS: [RegExp, string][] = [
  [/\b(blood ?test|lab|labs|laboratory|results?|cbc|glucose|cholesterol|lipid|urinalysis)\b/i, 'lab'],
  [/\b(prescriptions?|medicines?|medications?|meds|drugs?|pills?)\b/i, 'prescription'],
  [/\b(x-?rays?|imaging|scans?|mri|ct|ultrasound)\b/i, 'imaging'],
  [/\b(vaccines?|vaccinations?|shots?|immuni[sz]ations?)\b/i, 'vaccination'],
  [/\b(visits?|consultations?|checkups?|check-ups?|appointments?)\b/i, 'consultation'],
  [/\b(hospital|admission|discharge)\b/i, 'hospitalization'],
  [/\b(dental|dentist|eye|vision|optometr)\b/i, 'dental_vision'],
];

const STOP = new Set(
  'a an the my me i is are was were where whats what which find show open get see latest last recent newest most do does did can you please for of to in on from with about any all record records document documents test tests result results'.split(' '),
);

/** Short, general definitions for terms that appear across MedRec. Not advice and not about the user. */
export const GLOSSARY: Record<string, string> = {
  'reference range':
    'A reference range is the interval a lab uses to help interpret a test result. It can vary between labs and groups of people. A result outside the range does not, by itself, establish a diagnosis. Your clinician considers it alongside your symptoms, history and other tests.',
  'complete blood count':
    'A complete blood count (CBC) measures the different types of cells in your blood, such as red cells, white cells and platelets. Each number comes with a reference range from the lab.',
  'fasting blood glucose': 'A fasting blood glucose test measures the sugar in your blood after not eating for a set time, usually overnight.',
  hba1c: 'HbA1c reflects your average blood sugar over roughly the past two to three months.',
  'lipid profile': 'A lipid profile measures fats in the blood, such as cholesterol and triglycerides.',
  urinalysis: 'A urinalysis looks at the appearance, concentration and content of a urine sample.',
};

const HELP: { match: RegExp; text: string; link?: { label: string; href: string } }[] = [
  {
    match: /\b(shar(e|ing)|qr|doctor see|link)\b/i,
    text: 'Sharing creates a temporary QR code and link. You choose all records, some types or specific records, and how long access lasts: 15, 30 or 60 minutes. The doctor sees them view-only in a browser, and you can end access at any time from Share.',
    link: { label: 'Create a share link', href: '/share/new' },
  },
  {
    match: /\b(medical id|emergency|responders?|blood type|allerg)/i,
    text: 'Your Medical ID keeps blood type, allergies, conditions, medications and an emergency contact on one card. You decide whether a public emergency page is on; each time it is opened you see it in Activity.',
    link: { label: 'Open Medical ID', href: '/(tabs)/medical' },
  },
  {
    match: /\b(add|upload|scan|photograph|pdf|import)\b/i,
    text: 'Tap Add record, photograph each page or choose photos or a PDF. MedRec reads the pages and fills in the title, type and date for you to check before anything is saved.',
    link: { label: 'Add a record', href: '/add' },
  },
  {
    match: /\b(export|download|backup|print)\b/i,
    text: 'From Profile, choose Export my records for a printable PDF history or a complete data file. Attachments are downloaded separately.',
    link: { label: 'Open Profile', href: '/(tabs)/profile' },
  },
  {
    match: /\b(lock|face ?id|fingerprint|password|secur|privacy|sign ?in|code)\b/i,
    text: 'Every new sign-in needs your password and a 6-digit code sent to your email. You can add app lock with Face ID, a fingerprint or your device passcode in Security & privacy.',
    link: { label: 'Security & privacy', href: '/security' },
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[“”"'?.!]/g, '').replace(/\s+/g, ' ').trim();

/** Pulls the term out of "what does X mean", "what is X", "explain X", "define X". */
export function extractTerm(question: string): string | null {
  const q = norm(question);
  const m = q.match(/^(?:what does|what do) (.+?) mean$/) ?? q.match(/^(?:what is|what are|whats|what's) (?:an? |the )?(.+)$/) ?? q.match(/^(?:explain|define|meaning of) (?:the term )?(.+)$/);
  return m?.[1]?.trim() || null;
}

export function keywords(question: string) {
  return norm(question)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function categoryFor(question: string) {
  return CATEGORY_WORDS.find(([re]) => re.test(question))?.[1];
}

function findTerm(term: string, records: HealthRecord[]) {
  const t = norm(term);
  for (const r of records) {
    const hit = r.ai?.terms.find((x) => norm(x.term) === t || norm(x.term).includes(t) || t.includes(norm(x.term)));
    if (hit) return { record: r, term: hit.term, meaning: hit.meaning };
  }
  return null;
}

const label = (r: HealthRecord) => `“${r.title}”${r.facility ? ` from ${r.facility}` : r.provider ? ` with ${r.provider}` : ''}`;

export async function answer(question: string, search: Search, context?: HealthRecord | null): Promise<Reply> {
  const q = question.trim();
  if (URGENT.test(q)) {
    return { kind: 'urgent', text: "I can't help with urgent symptoms. If this is an emergency, call your local emergency number or go to the nearest emergency department now. For anything else that worries you, contact a clinician." };
  }

  if (ADVICE.test(q) && (!extractTerm(q) || /\b(should|for me|safe)\b/i.test(q))) {
    return { kind: 'unsupported', text: "I can't give personal medical advice, like whether to change a medication or what a result means for you. Please ask your clinician or pharmacist. I can find the related records so you have them ready." };
  }

  const term = extractTerm(q);
  if (term && !/\b(medrec|sharing|medical id)\b/i.test(term)) {
    const ctx = context ? findTerm(term, [context]) : null;
    // Record search covers titles and notes, not AI terms, so fall back to scanning recent records.
    const own = ctx ?? findTerm(term, await search({ q: term, limit: 25 })) ?? findTerm(term, await search({ limit: 100 }));
    if (own) return { kind: 'term', term: own.term, text: own.meaning, source: own.record, general: false };
    const general = Object.entries(GLOSSARY).find(([k]) => norm(term).includes(k) || k.includes(norm(term)));
    if (general) return { kind: 'term', term: general[0], text: general[1], source: null, general: true };
  }

  const help = HELP.find((h) => h.match.test(q) && /\b(how|what|can i|where do i|help)\b/i.test(q));
  if (help) return { kind: 'help', text: help.text, link: help.link };

  const wantsRecords = /\b(find|where|show|open|latest|last|recent|newest|my)\b/i.test(q) || !term;
  if (wantsRecords) {
    const words = keywords(q);
    const category = categoryFor(q);
    let found = words.length ? await search({ q: words.join(' '), limit: 5 }) : [];
    if (!found.length && category) found = await search({ category, limit: 5 });
    if (!found.length && words.length > 1) found = await search({ q: words[0], limit: 5 });
    if (found.length) {
      const top = found[0]!;
      const latest = /\b(latest|last|recent|newest)\b/i.test(q);
      const text = latest || found.length === 1
        ? `${latest ? 'Your latest matching record' : 'The matching record'} is ${label(top)}${top.eventDate ? `, dated ${formatDate(top.eventDate, { year: true })}` : ''}. I found it in your saved records.`
        : `I found ${found.length} matching records in your saved records. The newest is ${label(top)}.`;
      return { kind: 'records', text, records: latest ? [top] : found.slice(0, 3) };
    }
    if (words.length || category) {
      return { kind: 'unsupported', text: "I couldn't find a saved record that matches. Try the name of the test, the doctor or the clinic, or add the record first." };
    }
  }

  return {
    kind: 'unsupported',
    text: "I can't answer open questions yet. I can find your saved records, explain terms that appear in them, and help you use MedRec. For medical questions, please ask your clinician.",
  };
}
