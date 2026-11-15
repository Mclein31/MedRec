import { useSyncExternalStore } from 'react';
import { api, type Person } from './lib/api';
import { KEYS, secure } from './lib/storage';

/**
 * Caregiver profiles (DD-55): the family members on this account and who is being viewed.
 * `active` null means the account holder. The choice is remembered per account on this device.
 */
interface State { userId: string | null; people: Person[]; active: string | null; loaded: boolean }

let state: State = { userId: null, people: [], active: null, loaded: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };

/** Loads the family for a signed-in account; an older API without /people simply means no family yet. */
export async function loadPeople(userId: string) {
  if (state.userId !== userId) {
    set({ userId, people: [], active: null, loaded: false });
    // Restore who was being viewed first, before the slower list request, so nothing created
    // right after launch is filed under the wrong person.
    const saved = await secure.get(KEYS.activePerson(userId)).catch(() => null);
    if (state.userId === userId && state.active === null && saved) set({ active: saved });
  }
  let list: Person[];
  try {
    list = (await api.people()).people;
  } catch {
    // Offline or an older API: keep whatever is known rather than switching people under the user.
    if (state.userId === userId) set({ loaded: true });
    return;
  }
  if (state.userId !== userId) return;
  set({ people: list, active: state.active && list.some((p) => p.id === state.active) ? state.active : null, loaded: true });
  if (state.active === null) await secure.remove(KEYS.activePerson(userId)).catch(() => undefined);
}

/** Re-reads the family (e.g. record counts after saving a record). */
export function refreshPeople() {
  if (state.userId) void loadPeople(state.userId);
}

export function resetPeople() {
  set({ userId: null, people: [], active: null, loaded: false });
}

export async function setActivePerson(id: string | null) {
  set({ active: id });
  if (state.userId) await (id ? secure.set(KEYS.activePerson(state.userId), id) : secure.remove(KEYS.activePerson(state.userId))).catch(() => undefined);
}

/** Replaces or adds one person after an edit, without a reload. */
export function upsertPerson(person: Person) {
  const exists = state.people.some((p) => p.id === person.id);
  set({ people: exists ? state.people.map((p) => (p.id === person.id ? { ...p, ...person } : p)) : [...state.people, person] });
}

export function dropPerson(id: string) {
  set({ people: state.people.filter((p) => p.id !== id), active: state.active === id ? null : state.active });
  if (state.active === null && state.userId) void secure.remove(KEYS.activePerson(state.userId)).catch(() => undefined);
}

export function usePeople() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => void listeners.delete(l); }, () => state);
}

/** Who the app is showing: `personId` null and `person` null for the account holder. */
export function useActivePerson() {
  const s = usePeople();
  const person = s.active ? s.people.find((p) => p.id === s.active) ?? null : null;
  // personId comes straight from the saved choice, even while the list is still loading.
  return { personId: s.active, person, people: s.people };
}

/** "Your" or "Mia's", for titles like "Your records." */
export const possessive = (person: Person | null) => (person ? `${person.name.split(' ')[0]}'s` : 'Your');
