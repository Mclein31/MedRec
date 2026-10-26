import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, radius, space, useColors } from '../theme';
import { Button, Txt } from './core';
import { Rise } from './motion';

/** Bottom sheet over a deep aubergine scrim (category picker, export, info overlays). */
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" style={{ flex: 1, backgroundColor: c.scrim }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.lg }}>
        <Rise from={40} duration={220} style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderRadius: radius.lg, paddingHorizontal: GUTTER - 2, paddingTop: GUTTER, paddingBottom: GUTTER, gap: space.lg, maxHeight: 640 }}>
            <View style={{ gap: space.sm }}>
              <Txt variant="display" accessibilityRole="header">{title}</Txt>
              {message && <Txt color={c.ink3}>{message}</Txt>}
            </View>
            {children && <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.xs }}>{children}</ScrollView>}
            <Button kind={closeKind} label={closeLabel} onPress={onClose} />
          </View>
        </Rise>
      </View>
    </Modal>
  );
}
