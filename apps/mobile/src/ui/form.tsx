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
      <Txt variant="label" color={c.ink2} nativeID={`${label}-label`}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 50,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: error ? c.danger : focused ? c.accent : c.line,
          backgroundColor: c.surface,
          paddingHorizontal: space.md,
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
          style={[t.body, { flex: 1, color: c.ink, paddingVertical: 12 }, style]}
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
                borderRadius: radius.sm,
                borderWidth: 1.5,
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
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? c.ink : c.line,
        backgroundColor: selected ? c.ink : c.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Txt variant="label" color={selected ? c.bg : c.ink}>
        {label}
      </Txt>
      {count !== undefined && (
        <Txt variant="micro" color={selected ? c.bg : c.ink3}>
          {count}
        </Txt>
      )}
    </Tappable>
  );
}
