import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import { useColors } from '../theme';
import type { SegmentedProps } from './Segmented';

/** Material 3 single-choice segmented button row. */
export function Segmented<T extends string>({ items, value, onChange }: SegmentedProps<T>) {
  const c = useColors();
  return (
    <Host matchContents={{ vertical: true }} seedColor={c.accent} style={{ width: '100%' }}>
      <SingleChoiceSegmentedButtonRow>
        {items.map((it) => (
          <SegmentedButton key={it.key} selected={value === it.key} onClick={() => onChange(it.key)}>
            <SegmentedButton.Label>
              <Text>{it.label}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
