import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/** Keep motion in sync with live accessibility and app visibility changes. */
export function useMotionPreferences() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const visibility = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { mounted = false; motion.remove(); visibility.remove(); };
  }, []);
  return { reducedMotion, foreground };
}
