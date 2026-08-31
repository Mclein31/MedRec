import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BREAKPOINTS, ResponsiveLimits, getResponsiveSpacing } from '../constants/theme';

/**
 * Base design dimensions — iPhone 14 Plus (428 × 926 pt).
 */
const BASE_WIDTH = 428;
const BASE_HEIGHT = 926;

export interface ResponsiveLayoutState {
  // Device category flags
  isCompactPhone: boolean;
  isStandardPhone: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  isShortScreen: boolean;

  // Dimensions & Safe Areas
  width: number;
  height: number;
  insets: ReturnType<typeof useSafeAreaInsets>;

  // Spacing Tokens
  screenPadding: number;
  cardPadding: number;
  cardGap: number;
  sectionGap: number;
  inputHeight: number;
  buttonHeight: number;
  tabBarClearance: number;

  // Layout Constraints
  maxFormWidth: number;
  maxContentWidth: number;
  maxDetailWidth: number;
  maxModalWidth: number;
  containerWidth: number;
  gridColumns: number;
  sidebarWidth: number;

  // Fluid Dimension Calculators (with strict bounding floors and ceilings)
  scaleFont: (baseSize: number, min?: number, max?: number) => number;
  scaleSpacing: (baseSpacing: number) => number;

  // Legacy Helpers (bounded with safety clamps)
  wp: (size: number) => number;
  hp: (size: number) => number;
  fp: (size: number, min?: number, max?: number) => number;
}

/**
 * Unified Responsive Layout Hook for MedRec.
 * Provides dynamic viewport metrics, device categorization, safe area insets,
 * bounded scaling utilities, and layout constraints across compact phones,
 * standard phones, phablets, and iPads/tablets in portrait and landscape.
 */
export function useResponsive(): ResponsiveLayoutState {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const shorterDimension = Math.min(width, height);
  const longerDimension = Math.max(width, height);

  // Device Classifications
  const isTablet = shorterDimension >= 600 || width >= BREAKPOINTS.largePhone;
  const isLargeTablet = width >= BREAKPOINTS.tablet;
  const isCompactPhone = !isTablet && width < BREAKPOINTS.compact;
  const isStandardPhone = !isTablet && width >= BREAKPOINTS.compact;
  const isShortScreen = height < 700;

  // Spacing Tokens
  const spacing = getResponsiveSpacing(isCompactPhone, isTablet);
  const sidebarWidth = (isTablet && isLandscape) ? 260 : 0;
  const effectiveTabBarClearance = (isTablet && isLandscape) ? 24 : spacing.tabBarClearance;

  // Grid & Container metrics
  const gridColumns = isLargeTablet ? 3 : isTablet ? 2 : 1;
  const containerWidth = isTablet
    ? Math.min(width - sidebarWidth - (isLargeTablet ? 64 : 48), isLargeTablet ? ResponsiveLimits.maxDetailWidth : ResponsiveLimits.maxContentWidth)
    : width;

  // Scaling factors with strict caps
  const rawScaleW = width / BASE_WIDTH;
  const rawScaleH = height / BASE_HEIGHT;

  // Phone scale caps at 1.0; tablet typography scale is capped at 1.15 to preserve density
  const scaleW = isTablet ? Math.min(rawScaleW, 1.2) : Math.min(rawScaleW, 1.0);
  const scaleH = isTablet ? Math.min(rawScaleH, 1.2) : Math.min(rawScaleH, 1.0);
  const fontScaleFactor = isTablet ? 1.1 : Math.max(0.9, Math.min(scaleW, scaleH));

  /**
   * Bounded font scaler — guarantees legibility floors and prevents oversized tablet text.
   */
  const scaleFont = (baseSize: number, min = 10.5, max?: number): number => {
    const computed = Math.round(baseSize * fontScaleFactor);
    const floor = Math.min(baseSize, min);
    const ceiling = max ?? Math.round(baseSize * 1.15);
    return Math.max(floor, Math.min(computed, ceiling));
  };

  /**
   * Spacing scaler
   */
  const scaleSpacing = (baseSpacing: number): number => {
    if (isCompactPhone) return Math.max(4, Math.round(baseSpacing * 0.85));
    if (isTablet) return Math.round(baseSpacing * 1.2);
    return baseSpacing;
  };

  /** Width-proportional */
  const wp = (size: number): number => {
    const factor = isTablet ? Math.min(width / 768, 1.2) : Math.min(rawScaleW, 1.0);
    return Math.round(size * factor);
  };

  /** Height-proportional */
  const hp = (size: number): number => {
    const factor = isTablet ? Math.min(height / 1024, 1.2) : Math.min(rawScaleH, 1.0);
    return Math.round(size * factor);
  };

  /** Font / icon proportional with minimum readability floor */
  const fp = (size: number, min = 10.5, max?: number): number => {
    return scaleFont(size, min, max);
  };

  return {
    isCompactPhone,
    isStandardPhone,
    isTablet,
    isLargeTablet,
    isLandscape,
    isShortScreen,
    width,
    height,
    insets,
    ...spacing,
    tabBarClearance: effectiveTabBarClearance,
    sidebarWidth,
    maxFormWidth: ResponsiveLimits.maxFormWidth,
    maxContentWidth: ResponsiveLimits.maxContentWidth,
    maxDetailWidth: ResponsiveLimits.maxDetailWidth,
    maxModalWidth: ResponsiveLimits.maxModalWidth,
    containerWidth,
    gridColumns,
    scaleFont,
    scaleSpacing,
    wp,
    hp,
    fp,
  };
}

// Alias for explicit semantic naming
export const useResponsiveLayout = useResponsive;
export default useResponsive;
