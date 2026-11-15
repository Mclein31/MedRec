import { Host, Slider } from '@expo/ui';
import * as Haptics from 'expo-haptics';
import { Platform, View } from 'react-native';
import { space, useColors } from '../theme';
import { Txt } from './core';

export const DURATIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
];

/**
 * How long a share lasts: the system slider (UISlider / Material 3 slider) snapping to the three
 * allowed lengths, with the chosen one read out above it. A tick of haptic feedback lands on each stop.
 */
export function DurationSlider({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const c = useColors();
  const index = Math.max(0, DURATIONS.findIndex((d) => d.minutes === minutes));
  const current = DURATIONS[index]!;
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="title" accessibilityLiveRegion="polite">{current.label}</Txt>
      <Host matchContents={{ vertical: true }} seedColor={c.accent} style={{ width: '100%' }}>
        <Slider
          value={index}
          min={0}
          max={DURATIONS.length - 1}
          step={1}
          onValueChange={(v) => {
            const next = DURATIONS[Math.round(v)];
            if (next && next.minutes !== minutes) {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onChange(next.minutes);
            }
          }}
        />
      </Host>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {DURATIONS.map((d) => (
          <Txt key={d.minutes} variant="caption" color={d.minutes === minutes ? c.ink : c.ink3}>{d.label}</Txt>
        ))}
      </View>
    </View>
  );
}
