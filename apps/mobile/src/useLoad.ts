import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { messageFor } from './lib/errors';

/** Loads on focus; keeps showing the last data while refreshing; ignores out-of-order responses. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (mode: 'load' | 'refresh' = 'load') => {
    const id = ++seq.current;
    if (mode === 'refresh') setRefreshing(true);
    try {
      const value = await fn();
      if (id === seq.current) {
        setData(value);
        setError(null);
      }
    } catch (err) {
      if (id === seq.current) setError(messageFor(err));
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, deps);

  useFocusEffect(
    useCallback(() => {
      void run();
    }, [run]),
  );

  return { data, setData, error, loading, refreshing, reload: () => run('load'), refresh: () => run('refresh') };
}
