import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveLimits } from '../../constants/theme';

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
  const { width, height, isLandscape } = useResponsive();
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // 3:4 Document Aspect Ratio Viewfinder Dimensions (clamped for portrait & landscape)
  const maxViewfinder = isLandscape ? Math.min(height * 0.7, 300) : Math.min(width * 0.82, ResponsiveLimits.viewfinderMax);
  const viewfinderWidth = Math.round(maxViewfinder);
  const viewfinderHeight = Math.round(viewfinderWidth * 1.35);

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
    outputRange: [10, viewfinderHeight - 14],
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
      <View style={[styles.middleRow, { height: viewfinderHeight }]}>
        <View style={styles.maskSide} />

        {/* Viewfinder Cutout */}
        <View style={[styles.cutout, { width: viewfinderWidth, height: viewfinderHeight }]}>
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
  },
  maskSide: {
    flex: 1,
    backgroundColor: MASK_COLOR,
  },
  cutout: {
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
