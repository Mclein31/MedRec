import { View } from 'react-native';
import { space } from '../theme';
import { Chip } from './form';

export type SegmentedProps<T extends string> = { items: { key: T; label: string }[]; value: T; onChange: (key: T) => void; label: string };

/** Web fallback: brand chips. iOS and Android use the system segmented controls (Segmented.ios/.android). */
export function Segmented<T extends string>({ items, value, onChange, label }: SegmentedProps<T>) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {items.map((it) => (
        <View key={it.key} style={{ flex: 1 }}>
          <Chip label={it.label} selected={value === it.key} onPress={() => onChange(it.key)} />
        </View>
      ))}
    </View>
  );
}
