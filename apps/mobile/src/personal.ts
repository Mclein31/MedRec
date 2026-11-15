/**
 * Answers from first-use setup. Pure data and helpers: no React Native imports, so the Node tests can load it.
 * Stored on the device inside prefs; nothing here is sent to the server.
 */
export type Goal = 'organize' | 'understand' | 'visits' | 'emergency';

export interface Personal {
  /** What the person asked to be called; prefills registration. */
  name: string;
  goal: Goal | null;
  /** Record categories in the order they were picked; the first two become Records tabs. */
  categories: string[];
}

export const NO_PERSONAL: Personal = { name: '', goal: null, categories: [] };

const DEFAULT_PINNED = ['lab', 'prescription'] as const;
const GOAL_KEYS: Goal[] = ['organize', 'understand', 'visits', 'emergency'];

/** Each goal changes the Records home: the empty-state copy and one shortcut row. */
export const GOALS: Record<Goal, {
  title: string;
  subtitle: string;
  /** Remy's reply when it is picked. Only promises what the app then does. */
  reaction: string;
  /** Line on the finish card. */
  summary: string;
  home: { headline: string; body: string };
  shortcut: { to: 'remy' | 'share' | 'medical'; title: string; subtitle: string } | null;
}> = {
  organize: {
    title: 'Keep my papers in one place',
    subtitle: 'Results, prescriptions and visit notes, easy to find',
    reaction: 'A tidy folder. My favourite kind.',
    summary: 'Home set up for keeping records together',
    home: { headline: 'A home for your health history.', body: "Add a result, prescription or visit note. You'll always know where to find it." },
    shortcut: null,
  },
  understand: {
    title: 'Understand my results',
    subtitle: 'Medical terms explained in plain words',
    reaction: "I'll keep the plain-word explanations close.",
    summary: 'Ask Remy shortcut on your home',
    home: { headline: 'Results you can actually read.', body: "Add a lab result or visit note and I'll explain the terms in plain words." },
    shortcut: { to: 'remy', title: 'Ask Remy about a term', subtitle: 'Plain-word explanations from your records' },
  },
  visits: {
    title: 'Be ready for doctor visits',
    subtitle: 'Show a doctor your records with a temporary QR code',
    reaction: "I'll keep sharing close for your next visit.",
    summary: 'Share shortcut on your home',
    home: { headline: 'Ready for your next visit.', body: 'Add your records now, then show them to your doctor with a QR code that expires.' },
    shortcut: { to: 'share', title: 'Share with your doctor', subtitle: 'A view-only QR code that expires' },
  },
  emergency: {
    title: 'Be prepared for emergencies',
    subtitle: 'Allergies, medications and who to call, in one card',
    reaction: "Good thinking. We'll start with your Medical ID.",
    summary: 'Medical ID shortcut on your home',
    home: { headline: 'The essentials, ready when needed.', body: 'Set up your Medical ID first, then add the records behind it.' },
    shortcut: { to: 'medical', title: 'Set up your Medical ID', subtitle: 'Allergies, medications and emergency contact' },
  },
};

export const GOAL_ORDER = GOAL_KEYS;

/** First word of what they typed, for greetings. */
export function firstName(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? '').slice(0, 24);
}

/** Adds a category at the end, or removes it. Selection order is kept. */
export function toggleCategory(chosen: string[], key: string): string[] {
  return chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
}

/** The two categories that get their own tab on Records: the first two picks, topped up from the defaults. */
export function pinnedCategories(chosen: string[], all?: readonly string[]): [string, string] {
  const valid = all ? chosen.filter((k) => all.includes(k)) : chosen;
  const merged = [...valid, ...DEFAULT_PINNED.filter((k) => !valid.includes(k))];
  return [merged[0]!, merged[1]!];
}

/** Picked categories first (in pick order), then the rest in their usual order. */
export function orderCategories(all: readonly string[], chosen: string[]): string[] {
  const first = chosen.filter((k) => all.includes(k));
  return [...first, ...all.filter((k) => !first.includes(k))];
}

/** Tolerates anything read back from storage. */
export function sanitizePersonal(raw: unknown): Personal {
  if (!raw || typeof raw !== 'object') return NO_PERSONAL;
  const r = raw as Partial<Record<keyof Personal, unknown>>;
  return {
    name: typeof r.name === 'string' ? r.name.slice(0, 80) : '',
    goal: GOAL_KEYS.includes(r.goal as Goal) ? (r.goal as Goal) : null,
    categories: Array.isArray(r.categories) ? [...new Set(r.categories.filter((k): k is string => typeof k === 'string'))].slice(0, 12) : [],
  };
}
