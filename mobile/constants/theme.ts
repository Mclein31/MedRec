import { Platform } from 'react-native';

export const Colors = {
  // Brand & Primary Palette
  primary: '#087F6D',
  teal: '#087F6D',
  tealDark: '#12343B',
  primaryDark: '#12343B',
  tealLight: '#DDF5EE',
  primaryLight: '#DDF5EE',

  // Accent & Action Tokens
  blue: '#1976D2',
  blueLight: '#EBF3FB',
  blueBorder: '#D4E5F9',
  info: '#1976D2',
  infoLight: '#EBF3FB',

  // Canvas & Surfaces
  bg: '#F5F8F7',
  background: '#F5F8F7',
  cardBg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#DCE7E4',
  divider: '#F0F5F4',

  // Typography & Text
  ink: '#12343B',
  textPrimary: '#12343B',
  muted: '#64748B',
  textSecondary: '#64748B',
  textMuted: '#64748B',
  white: '#FFFFFF',

  // Semantic & Status Tokens
  danger: '#D92D20',
  red: '#D92D20',
  dangerLight: '#FEF3F2',
  redLight: '#FEF3F2',
  dangerBorder: '#FECDCA',
  redBorder: '#FECDCA',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  success: '#087F6D',
  successLight: '#DDF5EE',

  // UI Overlays & Affordances
  dragHandle: '#CBD5E1',
  backdrop: 'rgba(18, 52, 59, 0.45)',
};

export const BREAKPOINTS = {
  compact: 375,   // Below 375dp: Compact phones (iPhone SE, small Android)
  standard: 414,  // 375 - 414dp: Standard portrait phones
  largePhone: 600,// 415 - 599dp: Phablets / Foldables outer
  tablet: 840,    // 600 - 839dp: Compact tablets / iPad portrait
  desktop: 1024,  // ≥ 840dp: iPad landscape / Large tablets
} as const;

export const ResponsiveLimits = {
  maxFormWidth: 500,          // Max width for auth forms & single-column inputs
  maxContentWidth: 760,       // Max width for main dashboards & profile cards
  maxDetailWidth: 920,        // Max width for record detail split views
  maxModalWidth: 560,         // Max width for centered sheet modals on tablet
  maxLandscapeWidth: 1140,    // Max container width for widescreen tablet landscape
  maxModalLandscapeWidth: 640,// Max width for 2-column centered dialogs in landscape
  minTapTarget: 44,           // WCAG AA compliant minimum interactive target
  viewfinderMax: 360,         // Max width for camera capture viewfinder
} as const;

export const LandscapeTokens = {
  navRailWidth: 88,              // Compact touch-friendly icon+label rail
  navSidebarWidth: 240,          // Expanded sidebar for Pro 12.9" widescreen
  masterPaneWidth: 360,          // Ideal width for record list browsing
  splitLeftRatio: 0.44,          // Proportional split left
  splitRightRatio: 0.56,         // Proportional split right
  maxBoundedWidth: 1040,         // Centered forms & profile container cap
  maxModalLandscapeWidth: 680,   // Standard landscape dialog modal cap
  cardPaddingLandscape: 20,      // Elevated touch surface padding
  gutterLandscape: 24,           // Spacing between split columns
  minTouchTarget: 44,            // WCAG AA compliant hit target floor
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 20,
  cardPadding: 16,
  tabBarClearance: 110,
};

export const getResponsiveSpacing = (isCompact: boolean, isTablet: boolean) => ({
  screenPadding: isCompact ? 16 : isTablet ? 28 : 20,
  cardPadding: isCompact ? 12 : isTablet ? 20 : 16,
  cardGap: isCompact ? 8 : isTablet ? 16 : 12,
  sectionGap: isCompact ? 10 : isTablet ? 20 : 14,
  inputHeight: isCompact ? 48 : isTablet ? 54 : 50,
  buttonHeight: isCompact ? 46 : isTablet ? 52 : 48,
  tabBarClearance: isCompact ? 95 : isTablet ? 120 : 110,
});

export const Radii = {
  xs: 4,
  sm: 6,
  md: 8,
  pill: 10,
  button: 12,
  card: 16,
  sheet: 24,
  full: 9999,
};

export const Typography = {
  display: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 28,
    lineHeight: 34,
    color: Colors.ink,
  },
  screenTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 26,
    lineHeight: 32,
    color: Colors.ink,
  },
  title1: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    lineHeight: 26,
    color: Colors.ink,
  },
  title2: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: Colors.ink,
  },
  sectionHeader: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.ink,
  },
  cardTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14.5,
    lineHeight: 20,
    color: Colors.ink,
  },
  body: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.ink,
  },
  bodyBold: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.muted,
  },
  caption: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    lineHeight: 15,
    color: Colors.muted,
  },
  button: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.white,
  },
  buttonSmall: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.teal,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Lexend Deca, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
