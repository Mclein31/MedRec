import { View } from 'react-native';
import { isCivilDate, todayIso } from '../format';
import { CATEGORIES, CATEGORY_META, space, useColors } from '../theme';
import { Tappable, Txt } from '../ui/core';
import { Chip, Field } from '../ui/form';

export interface FormValue {
  title: string;
  category: string;
  eventDate: string;
  provider: string;
  facility: string;
  notes: string;
}

export const emptyForm: FormValue = { title: '', category: 'other', eventDate: '', provider: '', facility: '', notes: '' };

export function validate(v: FormValue): Partial<Record<keyof FormValue, string>> {
  const errors: Partial<Record<keyof FormValue, string>> = {};
  if (!v.title.trim()) errors.title = 'Give the record a title, like "Blood test" or "Dr. Cruz follow-up".';
  if (v.eventDate && !isCivilDate(v.eventDate)) errors.eventDate = 'Use YYYY-MM-DD with a real date, like 2026-03-14.';
  else if (v.eventDate && v.eventDate > todayIso()) errors.eventDate = "The date can't be in the future.";
  return errors;
}

export const toInput = (v: FormValue) => ({
  title: v.title.trim(),
  category: v.category,
  eventDate: v.eventDate || null,
  provider: v.provider.trim() || null,
  facility: v.facility.trim() || null,
  notes: v.notes.trim() || null,
});

export function RecordForm({ value, onChange, errors, aiFilled }: { value: FormValue; onChange: (v: FormValue) => void; errors: Partial<Record<keyof FormValue, string>>; aiFilled?: boolean }) {
  const c = useColors();
  const set = (k: keyof FormValue) => (text: string) => onChange({ ...value, [k]: text });
  return (
    <View style={{ gap: space.lg }}>
      <Field label="Title" value={value.title} onChangeText={set('title')} error={errors.title} hint={aiFilled ? 'Filled in from the document. Check it.' : undefined} />
      <View style={{ gap: 6 }}>
        <Txt variant="label" color={c.ink2}>Type</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
          {CATEGORIES.map((k) => (
            <Chip key={k} label={CATEGORY_META[k]!.label} selected={value.category === k} onPress={() => onChange({ ...value, category: k })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Field
          label="Date of visit or test"
          value={value.eventDate}
          onChangeText={(t) => set('eventDate')(t.replace(/[^\d-]/g, '').slice(0, 10))}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          error={errors.eventDate}
          hint={errors.eventDate ? undefined : 'Leave blank if the document has no date.'}
        />
        {!value.eventDate && (
          <Tappable onPress={() => set('eventDate')(todayIso())} accessibilityLabel="Use today's date" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Txt variant="label" color={c.accent}>Use today</Txt>
          </Tappable>
        )}
      </View>
      <Field label="Doctor" value={value.provider} onChangeText={set('provider')} autoCapitalize="words" placeholder="Optional" />
      <Field label="Clinic, lab or hospital" value={value.facility} onChangeText={set('facility')} autoCapitalize="words" placeholder="Optional" />
      <Field label="Your notes" value={value.notes} onChangeText={set('notes')} multiline textAlignVertical="top" style={{ minHeight: 96 }} placeholder="What the doctor said, follow-up dates, questions" />
    </View>
  );
}
