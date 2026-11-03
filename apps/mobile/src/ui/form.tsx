import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Platform, Pressable, Switch, TextInput, View, type TextInputProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';
import { radius, space, type as t, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';
import { colorTransition, useSlidingMarker } from './motion';

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string | null; secureToggle?: boolean; onVisibilityChange?: (visible: boolean) => void };

/** Always-visible label above the input; errors replace the hint and say what to do. */
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, hint, error, secureToggle, onVisibilityChange, style, ...input }, ref) {
  const c = useColors();
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current!, []);
  const calm = useCalmMotion();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  // Opt out from the first render: changing hints after focus cannot remove UIKit's
  // stuck strong-password cover. Keep saved-login autofill and other platforms intact.
  const manualNewPassword = Platform.OS === 'ios' && secureToggle && (input.textContentType === 'newPassword' || input.autoComplete === 'new-password');
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" color={c.ink} nativeID={`${label}-label`}>
        {label}
      </Txt>
      <Animated.View
        style={[colorTransition(calm, ['borderColor']), {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderRadius: radius.sm + 2,
          borderWidth: focused || error ? 1.5 : 1,
          borderColor: error ? c.danger : focused ? c.accent : c.line,
          backgroundColor: c.surface,
          paddingHorizontal: space.lg,
        }]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={c.ink3}
          secureTextEntry={secureToggle ? hidden : input.secureTextEntry}
          {...input}
          textContentType={manualNewPassword ? 'none' : input.textContentType}
          autoComplete={manualNewPassword ? 'off' : input.autoComplete}
          autoCorrect={input.autoCorrect ?? !secureToggle}
          spellCheck={input.spellCheck ?? !secureToggle}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[t.body, { flex: 1, color: c.ink, paddingVertical: 10, outlineWidth: 0 }, style]}
          maxFontSizeMultiplier={1.6}
        />
        {secureToggle && (
          <Tappable onPress={() => { const nextHidden = !hidden; setHidden(nextHidden); onVisibilityChange?.(!nextHidden); inputRef.current?.focus(); }} accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={10}>
            <Icon name={hidden ? 'eye-off-outline' : 'eye-outline'} />
          </Tappable>
        )}
      </Animated.View>
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
      transition
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
      transition
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

/** Compact text selector (All / Lab results / Prescriptions / More). One persimmon bar slides to the active tab. */
export function TextTabs({ items, active, onSelect }: { items: { key: string; label: string; selected?: boolean }[]; active: string; onSelect: (key: string) => void }) {
  const c = useColors();
  const activeKey = items.find((it) => it.selected ?? it.key === active)?.key;
  const marker = useSlidingMarker(activeKey, BAR);

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, minHeight: 52, marginLeft: -2, alignItems: 'center' }}>
      {items.map((it) => {
        const on = it.key === activeKey;
        return (
          <View key={it.key} onLayout={marker.item(it.key)}>
            <Tappable
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
              <View onLayout={marker.bar(it.key)} style={{ marginTop: 4, height: 3, width: BAR }} />
            </Tappable>
          </View>
        );
      })}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: BAR, height: 3, borderRadius: 2, backgroundColor: c.persimmon }, marker.style]} />
    </View>
  );
}

const BAR = 22;

/** Brand switch: aubergine/gold track with a white thumb on every platform (web defaults to teal). */
export function Toggle({ value, onValueChange, disabled, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; accessibilityLabel: string }) {
  const c = useColors();
  // react-native-web reads activeThumbColor; native platforms ignore it.
  const web = { activeThumbColor: '#FFFFFF' } as object;
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: c.accent, false: c.line }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={c.line}
      accessibilityLabel={accessibilityLabel}
      {...web}
    />
  );
}
