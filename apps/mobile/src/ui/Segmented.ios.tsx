import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useColors } from '../theme';
import type { SegmentedProps } from './Segmented';

/** UISegmentedControl via SwiftUI: the sliding glass thumb, system haptics-free selection and Dynamic Type. */
export function Segmented<T extends string>({ items, value, onChange, label }: SegmentedProps<T>) {
  const c = useColors();
  return (
    <Host matchContents={{ vertical: true }} seedColor={c.accent} style={{ width: '100%' }}>
      <Picker
        selection={value}
        onSelectionChange={(k: T) => { void Haptics.selectionAsync(); onChange(k); }}
        modifiers={[pickerStyle('segmented'), accessibilityLabel(label)]}
      >
        {items.map((it) => (
          <Text key={it.key} modifiers={[tag(it.key)]}>{it.label}</Text>
        ))}
      </Picker>
    </Host>
  );
}
