import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, space, useColors } from '../theme';
import { NavHeader, Wordmark } from './brand';
import { Icon, Txt, type IconName } from './core';
import { Remy, type RemyAttention, type RemyMotion, type RemyPose } from './Remy';
import { Rise } from './motion';

/** Shared frame for sign-in, sign-up, code and reset screens. Actions follow the form in the scrollable content so text cannot be obscured. */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
  back = true,
  navTitle = 'MedRec',
  icon,
  remy = { pose: 'greeting', motion: 'wave' },
  intro,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
  navTitle?: string;
  icon?: IconName;
  remy?: { pose: RemyPose; motion: RemyMotion; attention?: RemyAttention; size?: number } | null;
  intro?: ReactNode;
}) {
  const c = useColors();
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const insets = useSafeAreaInsets();
  const column = { width: '100%' as const, maxWidth: 440, alignSelf: 'center' as const, paddingHorizontal: GUTTER };
  const canBack = back && router.canGoBack();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.sm, paddingBottom: space.xl }}>
        <View style={[column, { gap: space.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>{canBack ? <NavHeader title={navTitle} /> : <View style={{ minHeight: 52, justifyContent: 'center' }}><Wordmark /></View>}</View>
            {remy && <Remy pose={remy.pose} motion={remy.motion} attention={remy.attention} active={focused} size={remy.size ?? 52} />}
          </View>
          {intro ?? <View style={{ gap: space.sm, paddingTop: space.sm }}>
            {icon && <Icon name={icon} size={40} color={c.ink} />}
            <Txt variant="display" accessibilityRole="header">{title}</Txt>
            {typeof subtitle === 'string' ? <Txt color={c.ink3}>{subtitle}</Txt> : subtitle}
          </View>}
          <Rise from={0} duration={200} style={{ gap: space.lg }}>{children}</Rise>
          {footer && <View style={{ gap: space.md, paddingTop: space.sm }}>{footer}</View>}
          <View style={{ height: insets.bottom }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
