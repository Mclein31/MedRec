import { forwardRef, useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { radius, space, type as t, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string | null; secureToggle?: boolean };

/** Always-visible label above the input; errors replace the hint and say what to do. */
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, hint, error, secureToggle, style, ...input }, ref) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" color={c.ink} nativeID={`${label}-label`}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 54,
          borderRadius: radius.sm + 2,
          borderWidth: focused || error ? 1.5 : 1,
          borderColor: error ? c.danger : focused ? c.accent : c.line,
          backgroundColor: c.surface,
          paddingHorizontal: space.lg,
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={c.ink3}
          secureTextEntry={secureToggle ? hidden : input.secureTextEntry}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[t.body, { flex: 1, color: c.ink, paddingVertical: 12, outlineWidth: 0 }, style]}
          maxFontSizeMultiplier={1.6}
        />
        {secureToggle && (
          <Tappable onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={10}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} />
          </Tappable>
        )}
      </View>
      {(error || hint) && (
        <Txt variant="caption" color={error ? c.danger : c.ink3}>
          {error ?? hint}
        </Txt>
      )}
    </View>
  );
});

/** Six boxes over one real input, so paste and one-time-code autofill work. */
export function CodeInput({ value, onChange, error, autoFocus = true }: { value: string; onChange: (v: string) => void; error?: boolean; autoFocus?: boolean }) {
  const c = useColors();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessible={false}>
      <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'space-between' }}>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <View
              key={i}
              style={{
                flex: 1,
                maxWidth: 56,
                aspectRatio: 0.86,
                borderRadius: radius.sm - 2,
                borderWidth: active || error ? 1.5 : 1,
                borderColor: error ? c.danger : active ? c.accent : c.line,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt variant="title" style={{ fontSize: 24 }}>
                {value[i] ?? ''}
              </Txt>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={6}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="6-digit code"
        style={{ position: 'absolute', opacity: 0.01, width: '100%', height: '100%' }}
        caretHidden
      />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, count }: { label: string; selected: boolean; onPress: () => void; count?: number }) {
  const c = useColors();
  return (
    <Tappable
      onPress={onPress}
      haptic
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      style={{
        minHeight: 44,
        paddingHorizontal: space.lg,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.line,
        backgroundColor: selected ? c.accent : c.surface,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Txt variant="label" color={selected ? c.onAccent : c.ink}>
        {label}
      </Txt>
      {count !== undefined && (
        <Txt variant="caption" color={selected ? c.onAccent : c.ink3}>
          {count}
        </Txt>
      )}
    </Tappable>
  );
}

/** Search box with a leading magnifier; the label is for screen readers. */
export function SearchField({ value, onChangeText, placeholder, label = 'Search records' }: { value: string; onChangeText: (v: string) => void; placeholder: string; label?: string }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 54, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: focused ? c.accent : value ? c.line : 'transparent', paddingHorizontal: space.lg }}>
      <Icon name="magnify" size={22} color={c.ink2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.ink3}
        accessibilityLabel={label}
        returnKeyType="search"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[t.body, { flex: 1, color: c.ink, paddingVertical: 12, outlineWidth: 0 }]}
        maxFontSizeMultiplier={1.6}
      />
      {!!value && (
        <Tappable onPress={() => onChangeText('')} accessibilityLabel="Clear search" hitSlop={10}>
          <Icon name="close-circle" size={20} color={c.ink3} />
        </Tappable>
      )}
    </View>
  );
}

/** Selectable card used for share scope: check circle, title, detail. */
export function Choice({ title, subtitle, selected, onPress, multi = false }: { title: string; subtitle?: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  const c = useColors();
  return (
    <Tappable
      onPress={onPress}
      haptic
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, minHeight: 64, borderRadius: radius.md, borderWidth: selected ? 1.5 : 1, borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.surface : 'transparent' }}
    >
      <Icon name={selected ? (multi ? 'checkbox-marked-outline' : 'check-circle-outline') : multi ? 'checkbox-blank-outline' : 'circle-outline'} size={26} color={selected ? c.accent : c.ink3} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        {subtitle ? <Txt variant="caption" color={c.ink3}>{subtitle}</Txt> : null}
      </View>
    </Tappable>
  );
}

/** Compact text selector (All / Lab results / Prescriptions / More) with an underline on the active tab. */
export function TextTabs({ items, active, onSelect }: { items: { key: string; label: string; selected?: boolean }[]; active: string; onSelect: (key: string) => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, minHeight: 52, marginLeft: -2, alignItems: 'center' }}>
      {items.map((it) => {
        const on = it.selected ?? it.key === active;
        return (
          <Tappable
            key={it.key}
            onPress={() => onSelect(it.key)}
            haptic
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label}
            style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt variant="body" color={on ? c.ink : c.ink3} style={on ? { fontFamily: 'DMSans-SemiBold' } : undefined}>
              {it.label}
            </Txt>
            <View style={{ marginTop: 4, height: 3, width: 22, borderRadius: 2, backgroundColor: on ? c.persimmon : 'transparent' }} />
          </Tappable>
        );
      })}
    </View>
  );
}
