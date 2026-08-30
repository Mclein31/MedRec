import { Platform } from 'react-native';

export const Colors = {
  // Brand & Primary Palette
  primary: '#159A83',
  teal: '#159A83',
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
  bg: '#F4FAF9',
  background: '#F4FAF9',
  cardBg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E5F0EE',
  divider: '#F0F5F4',

  // Typography & Text
  ink: '#12343B',
  textPrimary: '#12343B',
  muted: '#64748B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
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
  success: '#159A83',
  successLight: '#DDF5EE',

  // UI Overlays & Affordances
  dragHandle: '#CBD5E1',
  backdrop: 'rgba(18, 52, 59, 0.45)',

  // Backwards compatibility for boilerplate hooks (useThemeColor, etc.)
  light: {
    text: '#12343B',
    background: '#F4FAF9',
    tint: '#159A83',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#159A83',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#159A83',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#159A83',
  },
};

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
