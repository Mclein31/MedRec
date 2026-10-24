import { useSyncExternalStore } from 'react';
import { KEYS, secure } from './lib/storage';

let value: boolean | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadOnboarded() {
  value = (await secure.get(KEYS.onboarded)) === '1';
  emit();
}

export async function markOnboarded() {
  value = true;
  emit();
  await secure.set(KEYS.onboarded, '1');
}

/** null until loaded from storage. */
export function useOnboarded() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => value,
  );
}
