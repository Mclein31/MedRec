import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 3:4 Document Aspect Ratio Viewfinder Dimensions
const VIEWFINDER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);
const VIEWFINDER_HEIGHT = VIEWFINDER_WIDTH * 1.38; // ~3:4.14 ratio matching standard A4 / Prescription sheets
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
const CORNER_RADIUS = 6;
const TEAL = '#159A83';

interface ViewfinderOverlayProps {
  guidanceText?: string;
  isCapturing?: boolean;
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  guidanceText = 'Position document within frame',
  isCapturing = false,
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [scanLineAnim]);

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, VIEWFINDER_HEIGHT - 14],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top darkened mask */}
      <View style={styles.maskTop}>
        <View style={styles.guidancePill}>
          <Text style={styles.guidanceText}>{guidanceText}</Text>
        </View>
      </View>

      {/* Middle row containing left mask, transparent cutout, and right mask */}
      <View style={styles.middleRow}>
        <View style={styles.maskSide} />

        {/* Viewfinder Cutout */}
        <View style={styles.cutout}>
          {/* Animated subtle scan indicator */}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY }] },
              isCapturing && { opacity: 0 },
            ]}
          />

          {/* High-Contrast Teal Corners */}
          {/* Top Left */}
          <View style={[styles.corner, styles.cornerTL]} />
          {/* Top Right */}
          <View style={[styles.corner, styles.cornerTR]} />
          {/* Bottom Left */}
          <View style={[styles.corner, styles.cornerBL]} />
          {/* Bottom Right */}
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.maskSide} />
      </View>

      {/* Bottom darkened mask */}
      <View style={styles.maskBottom} />
    </View>
  );
};

const MASK_COLOR = 'rgba(10, 18, 17, 0.62)';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  maskTop: {
    flex: 1,
    backgroundColor: MASK_COLOR,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  guidancePill: {
    backgroundColor: 'rgba(18, 52, 59, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(21, 154, 131, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  guidanceText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  middleRow: {
    flexDirection: 'row',
    height: VIEWFINDER_HEIGHT,
  },
  maskSide: {
    flex: 1,
    backgroundColor: MASK_COLOR,
  },
  cutout: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: TEAL,
    borderRadius: 1,
    opacity: 0.65,
    shadowColor: TEAL,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: TEAL,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  maskBottom: {
    flex: 1.4,
    backgroundColor: MASK_COLOR,
  },
});
export default ViewfinderOverlay;
