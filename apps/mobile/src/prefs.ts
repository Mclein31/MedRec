import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { KEYS, secure } from './lib/storage';

export interface Prefs {
  appearance: 'system' | 'light' | 'dark';
  /** Gentler motion on top of the system Reduce Motion setting. */
  gentleMotion: boolean;
  largerText: boolean;
}

const DEFAULTS: Prefs = { appearance: 'system', gentleMotion: false, largerText: false };

let value: Prefs = DEFAULTS;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadPrefs() {
  try {
    const raw = await secure.get(KEYS.prefs);
    if (raw) value = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    value = DEFAULTS;
  }
  emit();
}

export async function setPrefs(patch: Partial<Prefs>) {
  value = { ...value, ...patch };
  emit();
  await secure.set(KEYS.prefs, JSON.stringify(value));
}

export function usePrefs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => value,
  );
}

/** True when either the system setting or the in-app "Gentler motion" asks for less movement. */
export function useCalmMotion() {
  const system = useReducedMotion();
  return system || usePrefs().gentleMotion;
}
