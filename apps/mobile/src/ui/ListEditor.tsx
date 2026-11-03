import { View } from 'react-native';
import { radius, space, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';
import { Field } from './form';

export { withDraft } from '../listDraft';
import { withDraft } from '../listDraft';

/**
 * Tag-style list input. The draft is controlled by the parent so typed-but-not-added text
 * can be saved with the form instead of being lost.
 */
export function ListEditor({ label, items, onChange, draft, onDraft, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; draft: string; onDraft: (v: string) => void; placeholder: string }) {
  const c = useColors();
  const add = () => {
    onChange(withDraft(items, draft));
    onDraft('');
  };
  return (
    <View style={{ gap: space.sm }}>
      <Field label={label} value={draft} onChangeText={onDraft} placeholder={placeholder} onSubmitEditing={add} returnKeyType="done" submitBehavior="submit" hint={draft.trim() ? undefined : 'Add one at a time.'} />
      {!!draft.trim() && (
        <Tappable onPress={add} accessibilityLabel={`Add ${draft.trim()}`} hitSlop={8} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
          <Icon name="plus" size={18} color={c.accent} />
          <Txt variant="label" color={c.accent}>Add “{draft.trim()}”</Txt>
        </Tappable>
      )}
      {items.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {items.map((i) => (
            <Tappable key={i} onPress={() => onChange(items.filter((x) => x !== i))} accessibilityLabel={`Remove ${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 10, minHeight: 36, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
              <Txt variant="label">{i}</Txt>
              <Icon name="close" size={14} />
            </Tappable>
          ))}
        </View>
      )}
    </View>
  );
}
