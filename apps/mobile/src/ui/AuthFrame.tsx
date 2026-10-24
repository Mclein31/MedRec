import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, space, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';

/** Shared frame for sign-in, sign-up, code and reset screens. */
export function AuthFrame({ title, subtitle, children, footer, back = true }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; back?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }}>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: GUTTER, flex: 1, gap: space.xxl }}>
          <View style={{ minHeight: 44, justifyContent: 'center' }}>
            {back && router.canGoBack() ? (
              <Tappable onPress={() => router.back()} accessibilityLabel="Back" hitSlop={12} style={{ width: 44, height: 44, justifyContent: 'center' }}>
                <Icon name="arrow-left" size={24} color={c.ink} />
              </Tappable>
            ) : (
              <Txt variant="headline" color={c.accent}>MedRec</Txt>
            )}
          </View>
          <View style={{ gap: space.sm }}>
            <Txt variant="display" accessibilityRole="header">{title}</Txt>
            {typeof subtitle === 'string' ? <Txt color={c.ink3}>{subtitle}</Txt> : subtitle}
          </View>
          <View style={{ gap: space.lg }}>{children}</View>
          {footer && <View style={{ marginTop: 'auto', gap: space.sm }}>{footer}</View>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
