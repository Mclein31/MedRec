import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TEAL = '#159A83';
const INK = '#12343B';

interface CameraControlsProps {
  onCapture: () => void;
  onSelectGallery: () => void;
  onClose: () => void;
  torchOn: boolean;
  onToggleTorch: () => void;
  isCapturing?: boolean;
  topInset: number;
  bottomInset: number;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onCapture,
  onSelectGallery,
  onClose,
  torchOn,
  onToggleTorch,
  isCapturing = false,
  topInset,
  bottomInset,
}) => {
  const handleShutterPress = () => {
    if (isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCapture();
  };

  const handleTorchPress = () => {
    Haptics.selectionAsync();
    onToggleTorch();
  };

  const handleGalleryPress = () => {
    Haptics.selectionAsync();
    onSelectGallery();
  };

  const handleClosePress = () => {
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Action Bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 12 }]} pointerEvents="box-none">
        {/* Close Button */}
        <Pressable
          onPress={handleClosePress}
          style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close document scanner"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>

        {/* Center Tag / Label */}
        <View style={styles.docTypeBadge}>
          <Ionicons name="document-text-outline" size={14} color={TEAL} />
          <Text style={styles.docTypeBadgeText}>MedRec Scanner</Text>
        </View>

        {/* Torch / Flash Toggle */}
        <Pressable
          onPress={handleTorchPress}
          style={({ pressed }) => [
            styles.circleBtn,
            torchOn && styles.circleBtnActive,
            pressed && styles.pressed,
          ]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={torchOn ? 'Turn flash off' : 'Turn flash on'}
          accessibilityState={{ checked: torchOn }}
        >
          <Ionicons
            name={torchOn ? 'flash' : 'flash-off-outline'}
            size={20}
            color={torchOn ? '#F59E0B' : '#FFFFFF'}
          />
        </Pressable>
      </View>

      {/* Bottom Control Bar */}
      <View
        style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 20) + 12 }]}
        pointerEvents="box-none"
      >
        {/* Photo Gallery Picker */}
        <Pressable
          onPress={handleGalleryPress}
          style={({ pressed }) => [styles.galleryBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Select document from photo library"
          accessibilityHint="Opens photo library to pick an existing image"
        >
          <Ionicons name="images-outline" size={24} color="#FFFFFF" />
          <Text style={styles.galleryBtnText}>Gallery</Text>
        </Pressable>

        {/* Shutter Button */}
        <Pressable
          onPress={handleShutterPress}
          disabled={isCapturing}
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && styles.shutterOuterPressed,
            isCapturing && styles.shutterDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Capture medical document photo"
          accessibilityHint="Double tap to take a photo"
        >
          <View style={styles.shutterInner}>
            {isCapturing ? (
              <ActivityIndicator size="small" color={INK} />
            ) : (
              <View style={styles.shutterCenterDot} />
            )}
          </View>
        </Pressable>

        {/* Placeholder / Align Balance Button */}
        <View style={styles.sideSpacer}>
          <View style={styles.hintBadge}>
            <Ionicons name="scan-outline" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 52, 59, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  circleBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#F59E0B',
  },
  docTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 52, 59, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(21, 154, 131, 0.35)',
  },
  docTypeBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(10, 18, 17, 0.5)',
  },
  galleryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 64,
  },
  galleryBtnText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  shutterOuterPressed: {
    transform: [{ scale: 0.94 }],
    borderColor: TEAL,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCenterDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(18, 52, 59, 0.1)',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  sideSpacer: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 52, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pressed: {
    opacity: 0.7,
  },
});
export default CameraControls;
