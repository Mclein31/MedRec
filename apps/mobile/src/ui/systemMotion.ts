/** One live OS subscription shared by every motion-aware component. */
export function createSystemMotionSignal(read: () => Promise<boolean>, listen: (changed: (value: boolean) => void) => () => void) {
  let value: boolean | undefined;
  let stop: (() => void) | null = null;
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: boolean) => {
    if (next === value) return;
    value = next;
    listeners.forEach((notify) => notify());
  };
  return {
    getSnapshot: () => value,
    getServerSnapshot: () => undefined,
    subscribe(notify: () => void) {
      listeners.add(notify);
      if (!stop) {
        const current = ++generation;
        let changed = false;
        stop = listen((next) => { changed = true; publish(next); });
        void read().then((next) => { if (generation === current && !changed) publish(next); }).catch(() => undefined);
      }
      return () => {
        listeners.delete(notify);
        if (!listeners.size) { stop?.(); stop = null; generation++; }
      };
    },
  };
}
