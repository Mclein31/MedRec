import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, space, useColors } from '../theme';
import { NavHeader, Wordmark } from './brand';
import { Icon, Txt, type IconName } from './core';
import { Remy, type RemyMotion, type RemyPose } from './Remy';

/** Shared frame for sign-in, sign-up, code and reset screens. The primary action is pinned at the bottom. */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
  back = true,
  navTitle = 'MedRec',
  icon,
  remy = { pose: 'greeting', motion: 'wave' },
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
  navTitle?: string;
  icon?: IconName;
  remy?: { pose: RemyPose; motion: RemyMotion } | null;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const column = { width: '100%' as const, maxWidth: 440, alignSelf: 'center' as const, paddingHorizontal: GUTTER };
  const canBack = back && router.canGoBack();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.sm, paddingBottom: space.xl }}>
        <View style={[column, { gap: space.xl }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>{canBack ? <NavHeader title={navTitle} /> : <View style={{ minHeight: 52, justifyContent: 'center' }}><Wordmark /></View>}</View>
            {remy && <Remy pose={remy.pose} motion={remy.motion} size={52} />}
          </View>
          <View style={{ gap: space.sm, paddingTop: space.lg }}>
            {icon && <Icon name={icon} size={40} color={c.ink} />}
            <Txt variant="display" accessibilityRole="header">{title}</Txt>
            {typeof subtitle === 'string' ? <Txt color={c.ink3}>{subtitle}</Txt> : subtitle}
          </View>
          <View style={{ gap: space.lg }}>{children}</View>
        </View>
      </ScrollView>
      {footer && <View style={[column, { gap: space.md, paddingTop: space.sm, paddingBottom: insets.bottom + space.lg }]}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}
