import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, MAX_CONTENT_WIDTH, motion, radius, space, useColors } from '../theme';
import { Icon, Tappable, Txt, type IconName } from './core';

export const TAB_BAR_CLEARANCE = 96;

export function Screen({
  title,
  subtitle,
  right,
  children,
  refreshing,
  onRefresh,
  scroll = true,
  tabBar = true,
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  tabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const inner = (
    <View style={[{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: GUTTER, gap: space.xxl }, contentStyle]}>
      {title && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md, paddingTop: space.sm }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="display" accessibilityRole="header">
              {title}
            </Txt>
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
  const pad = { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + (tabBar ? TAB_BAR_CLEARANCE : space.xxl) };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.ink3} /> : undefined}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{inner}</View>
      )}
    </View>
  );
}

export function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt variant="title" accessibilityRole="header">
          {title}
        </Txt>
        {action && (
          <Tappable onPress={action.onPress} accessibilityLabel={action.label} hitSlop={10}>
            <Txt variant="label" color={c.accent}>
              {action.label}
            </Txt>
          </Tappable>
        )}
      </View>
      {children}
    </View>
  );
}

/** Inset grouped container; rows inside get hairline separators, never nested cards. */
export function Group({ children }: { children: ReactNode }) {
  const c = useColors();
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
          {child as ReactNode}
        </View>
      ))}
    </View>
  );
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
}: {
  icon?: IconName;
  title: string;
  subtitle?: string | null;
  value?: string | null;
  onPress?: () => void;
  tone?: 'danger';
  chevron?: boolean;
  accessory?: ReactNode;
}) {
  const c = useColors();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 56 }}>
      {icon && <Icon name={icon} size={22} color={tone === 'danger' ? c.danger : c.ink2} />}
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

export function Empty({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.lg, gap: space.md }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={26} color={c.accent} />
      </View>
      <Txt variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt variant="body" color={c.ink3} style={{ textAlign: 'center', maxWidth: 320 }}>
        {message}
      </Txt>
      {action}
    </View>
  );
}

/**
 * Staggered list entrance; the system Reduce Motion setting turns it off.
 * Native only: Reanimated's web layout-animation cleanup crashes on unmount.
 */
export function Enter({ index = 0, children }: { index?: number; children: ReactNode }) {
  if (Platform.OS === 'web') return <View>{children}</View>;
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.enter)
        .delay(Math.min(index, 8) * motion.stagger)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ transform: [{ translateY: 8 }] })
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}
