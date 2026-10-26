import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalmMotion } from '../prefs';
import { GUTTER, MAX_CONTENT_WIDTH, motion, radius, space, useColors } from '../theme';
import { BrandHeader, NavHeader } from './brand';
import { Icon, Tappable, Txt, type IconName } from './core';
import { Remy, type RemyMotion, type RemyPose } from './Remy';

export const TAB_BAR_CLEARANCE = 104;

type Nav = { title?: string; onBack?: () => void; back?: 'arrow-left' | 'close'; right?: ReactNode };

export function Screen({
  title,
  subtitle,
  eyebrow,
  right,
  brand = false,
  nav,
  footer,
  children,
  refreshing,
  onRefresh,
  scroll = true,
  tabBar = true,
  tint,
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  right?: ReactNode;
  /** Main tab header: MedRec wordmark plus Ask Remy. */
  brand?: boolean;
  /** Secondary header with a back arrow. */
  nav?: Nav;
  /** Pinned bottom action area (primary button), kept above the keyboard. */
  footer?: ReactNode;
  children?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  tabBar?: boolean;
  /** Background override, e.g. the soft neutral of the explanation screen. */
  tint?: string;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const column = { width: '100%' as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const, paddingHorizontal: GUTTER };
  const inner = (
    <View style={[column, { gap: space.xl }, contentStyle]}>
      {brand && <BrandHeader />}
      {nav && <NavHeader {...nav} />}
      {(title || eyebrow) && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
          <View style={{ flex: 1, gap: space.sm }}>
            {eyebrow}
            {title && (
              <Txt variant="display" accessibilityRole="header">
                {title}
              </Txt>
            )}
            {subtitle && (
              <Txt variant="body" color={c.ink3}>
                {subtitle}
              </Txt>
            )}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
  const bottom = footer ? space.xl : insets.bottom + (tabBar ? TAB_BAR_CLEARANCE : space.xxl);
  const pad = { paddingTop: insets.top + space.sm, paddingBottom: bottom };
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.ink3} /> : undefined}
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad]}>{inner}</View>
  );
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: tint ?? c.bg }}>
      {body}
      {footer && <View style={[column, { gap: space.md, paddingTop: space.sm, paddingBottom: insets.bottom + space.lg }]}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}

export function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt variant="headline" style={{ fontSize: 18, lineHeight: 24 }} accessibilityRole="header">
          {title}
        </Txt>
        {action && (
          <Tappable onPress={action.onPress} accessibilityLabel={action.label} hitSlop={10}>
            <Txt variant="label" color={c.ink2} style={{ textDecorationLine: 'underline' }}>
              {action.label}
            </Txt>
          </Tappable>
        )}
      </View>
      {children}
    </View>
  );
}

/** White grouped container; rows inside get hairline separators, never nested cards. */
export function Group({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const c = useColors();
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={bare ? undefined : { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
          {child as ReactNode}
        </View>
      ))}
    </View>
  );
}

/** Thin divider used between list blocks. */
export function Rule({ dashed = false, color }: { dashed?: boolean; color?: string }) {
  const c = useColors();
  return <View style={{ borderTopWidth: 1, borderColor: color ?? c.line, borderStyle: dashed ? 'dashed' : 'solid' }} />;
}

export function Row({
  icon,
  title,
  subtitle,
  value,
  onPress,
  tone,
  chevron = !!onPress,
  accessory,
  inset = true,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string | null;
  value?: string | null;
  onPress?: () => void;
  tone?: 'danger';
  chevron?: boolean;
  accessory?: ReactNode;
  inset?: boolean;
}) {
  const c = useColors();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: inset ? space.lg : 0, paddingVertical: space.lg, minHeight: 64 }}>
      {icon && <Icon name={icon} size={24} color={tone === 'danger' ? c.danger : c.ink} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline" color={tone === 'danger' ? c.danger : c.ink} numberOfLines={2}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={c.ink3} numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant="body" color={c.ink3} numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Txt>
      ) : null}
      {accessory}
      {chevron && <Icon name="chevron-right" size={20} color={c.ink3} />}
    </View>
  );
  return onPress ? (
    <Tappable onPress={onPress} accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}>
      {body}
    </Tappable>
  ) : (
    body
  );
}

/** Empty or recovery state led by a Remy pose; facts and actions stay below the art. */
export function Empty({
  pose = 'curious',
  motion = 'peek',
  icon,
  title,
  message,
  action,
  size = 150,
  align = 'center',
}: {
  pose?: RemyPose;
  motion?: RemyMotion;
  /** Plain icon instead of Remy, for neutral clinical states. */
  icon?: IconName;
  title: string;
  message: string;
  action?: ReactNode;
  size?: number;
  align?: 'center' | 'start';
}) {
  const c = useColors();
  const start = align === 'start';
  return (
    <View style={{ alignItems: start ? 'stretch' : 'center', paddingVertical: space.xl, gap: space.md }}>
      {icon ? <Icon name={icon} size={40} color={c.ink} /> : <Remy pose={pose} size={size} motion={motion} ground style={{ alignSelf: 'center' }} />}
      <Txt variant="title" style={{ textAlign: start ? 'left' : 'center', fontSize: 24, lineHeight: 30 }} accessibilityRole="header">
        {title}
      </Txt>
      <Txt variant="body" color={c.ink3} style={{ textAlign: start ? 'left' : 'center', maxWidth: start ? undefined : 340 }}>
        {message}
      </Txt>
      {action}
    </View>
  );
}

/**
 * Staggered list entrance; system Reduce Motion and in-app Gentler motion turn it off.
 * Native only: Reanimated's web layout-animation cleanup crashes on unmount (DD-44).
 */
export function Enter({ index = 0, children }: { index?: number; children: ReactNode }) {
  const calm = useCalmMotion();
  if (Platform.OS === 'web' || calm) return <View>{children}</View>;
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.routine)
        .delay(Math.min(index, 8) * motion.stagger)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ transform: [{ translateY: 8 }] })
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}
