import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalmMotion } from '../prefs';
import { GUTTER, motion, radius, space, useColors } from '../theme';
import { Button, Txt } from './core';
import { ease } from './motion';

/**
 * Bottom sheet over a deep aubergine scrim (category picker, export, info overlays).
 * The card rises on the iOS sheet curve and leaves faster than it arrived; the scrim follows
 * the same progress so they read as one object. Stays mounted until the exit finishes, and a
 * reopen mid-exit reverses from where it is. Calm motion keeps only the fade.
 */
export function Sheet({
  visible,
  onClose,
  title,
  message,
  children,
  closeLabel = 'Cancel',
  closeKind = 'secondary',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  closeLabel?: string;
  closeKind?: 'secondary' | 'dark';
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const calm = useCalmMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);
  const travel = useSharedValue(480);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      p.value = withTiming(1, { duration: calm ? 150 : motion.sheetIn, easing: ease.sheet });
    } else {
      p.value = withTiming(0, { duration: calm ? 120 : motion.sheetOut, easing: ease.out }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, mounted, calm, p]);

  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));
  const card = useAnimatedStyle(() => ({
    opacity: calm ? p.value : Math.min(1, p.value * 2),
    transform: [{ translateY: calm ? 0 : (1 - p.value) * travel.value }],
  }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[{ flex: 1, backgroundColor: c.scrim }, scrim]}>
        <Pressable onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" style={{ flex: 1 }} />
      </Animated.View>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.lg }}>
        <Animated.View
          onLayout={(e) => (travel.value = e.nativeEvent.layout.height + insets.bottom + space.lg)}
          style={[{ width: '100%', maxWidth: 520, alignSelf: 'center' }, card]}
        >
          <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderRadius: radius.lg, paddingHorizontal: GUTTER - 2, paddingTop: GUTTER, paddingBottom: GUTTER, gap: space.lg, maxHeight: 640 }}>
            <View style={{ gap: space.sm }}>
              <Txt variant="display" accessibilityRole="header">{title}</Txt>
              {message && <Txt color={c.ink3}>{message}</Txt>}
            </View>
            {children && <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.xs }}>{children}</ScrollView>}
            <Button kind={closeKind} label={closeLabel} onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
