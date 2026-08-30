import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, Radii, ResponsiveLimits } from '../../constants/theme';

const TEAL = Colors.teal;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const CARD_BG = Colors.cardBg;
const DARK_BG = '#0A1211';

export interface DocumentPreviewProps {
  photoUri: string;
  onConfirm: (photoUri: string) => void;
  onRetake: () => void;
  onCancel: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  photoUri,
  onConfirm,
  onRetake,
  onCancel,
}) => {
  const { insets, isTablet, screenPadding, scaleFont } = useResponsive();

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(photoUri);
  };

  const handleRetake = () => {
    Haptics.selectionAsync();
    onRetake();
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    onCancel();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            paddingLeft: Math.max(insets.left, screenPadding),
            paddingRight: Math.max(insets.right, screenPadding),
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cancel and discard preview"
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Document Preview</Text>

        <Pressable
          onPress={handleRetake}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retake document photo"
        >
          <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Main Image Viewport */}
      <View style={styles.imageViewport}>
        <Image
          source={{ uri: photoUri }}
          style={styles.previewImage}
          resizeMode="contain"
          accessibilityLabel="Captured document preview"
        />
      </View>

      {/* Bottom Inspection & Confirmation Sheet */}
      <View
        style={[
          styles.bottomSheet,
          isTablet && styles.bottomSheetTablet,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <View style={styles.legibilityBadge}>
            <Ionicons name="shield-checkmark" size={16} color={TEAL} />
            <Text style={styles.legibilityBadgeText}>Quality Self-Check</Text>
          </View>

          <Text
            style={[
              styles.sheetTitle,
              { fontSize: scaleFont(18, 16, 20) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            Is this document legible?
          </Text>
          <Text
            style={[
              styles.sheetSubtitle,
              { fontSize: scaleFont(13, 12, 14) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            Make sure text, dates, test values, and signatures are crisp and clearly readable.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {/* Retake Button */}
          <Pressable
            onPress={handleRetake}
            style={({ pressed }) => [
              styles.retakeBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Ionicons name="camera-outline" size={18} color={INK} />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </Pressable>

          {/* Confirm Button */}
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.useBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Use this document"
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.useBtnText}>Use Document</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    zIndex: 10,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  imageViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  bottomSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    gap: 16,
  },
  bottomSheetTablet: {
    maxWidth: ResponsiveLimits.maxModalWidth,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 28,
    marginBottom: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: {
    gap: 4,
  },
  legibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DDF5EE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  legibilityBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: TEAL,
  },
  sheetTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  sheetSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F4FAF9',
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: BORDER,
  },
  retakeBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  useBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 14,
    height: 50,
    shadowColor: TEAL,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  useBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default DocumentPreview;
