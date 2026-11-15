import { BottomSheet } from '@expo/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalmMotion } from '../prefs';
import { GUTTER, motion, radius, space, useColors } from '../theme';
import { Button, Txt } from './core';
import { ease } from './motion';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  closeLabel?: string;
  closeKind?: 'secondary' | 'dark';
};

/**
 * Bottom sheet. iOS and Android present the system sheet (UISheetPresentationController with a
 * drag indicator and swipe-to-dismiss; Material 3 modal bottom sheet with its scrim and back
 * gesture), sized to its content. Web keeps the custom animated sheet below.
 */
export function Sheet(props: SheetProps) {
  if (Platform.OS === 'web') return <WebSheet {...props} />;
  return <SystemSheet {...props} />;
}

function SystemSheet({ visible, onClose, title, message, children, closeLabel = 'Cancel', closeKind = 'secondary' }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // The system also reports a dismissal after our own close; only a dismissal while still open is the user's.
  const open = useRef(visible);
  open.current = visible;
  return (
    <BottomSheet isPresented={visible} onDismiss={() => open.current && onClose()} containerColor={c.bg} contentPadding={{ top: space.xl, left: GUTTER - 2, right: GUTTER - 2, bottom: Platform.OS === 'android' ? insets.bottom + space.lg : space.lg }}>
      <View accessibilityViewIsModal style={{ gap: space.lg, width: '100%' }}>
        <View style={{ gap: space.sm }}>
          <Txt variant="display" accessibilityRole="header">{title}</Txt>
          {message && <Txt color={c.ink3}>{message}</Txt>}
        </View>
        {children && <View style={{ gap: space.xs }}>{children}</View>}
        <Button kind={closeKind} label={closeLabel} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

/**
 * Web bottom sheet over a deep aubergine scrim (category picker, export, info overlays).
 * The card rises on the iOS sheet curve and leaves faster than it arrived; the scrim follows
 * the same progress so they read as one object. Stays mounted until the exit finishes, and a
 * reopen mid-exit reverses from where it is. Calm motion keeps only the fade.
 */
function WebSheet({ visible, onClose, title, message, children, closeLabel = 'Cancel', closeKind = 'secondary' }: SheetProps) {
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
