import { useColorScheme } from 'react-native';
import { usePrefs } from './prefs';

/**
 * MedRec "Warm folio" tokens (design/medrec-uiux-handoff/TOKENS.json).
 * Aubergine carries actions and marks; persimmon is the one signature action per
 * screen and always takes dark ink; gold and peach stay restrained.
 */
const light = {
  bg: '#FFF9EF',
  surface: '#FFFFFF',
  surfaceSunken: '#F5ECE5',
  ink: '#302238',
  ink2: '#4A3A52',
  ink3: '#6F5B67',
  line: '#D9CBC6',
  accent: '#492D48',
  accentPressed: '#3A2339',
  accentSoft: '#F5ECE5',
  onAccent: '#FFFFFF',
  persimmon: '#E66E4F',
  onPersimmon: '#302238',
  gold: '#F4CD63',
  onGold: '#302238',
  peach: '#F4B89A',
  /** Deep panel used for the Medical ID card, camera stage and share hero. */
  panel: '#302238',
  onPanel: '#FFFFFF',
  danger: '#AA283B',
  dangerSoft: '#FBE9EA',
  warn: '#8A5A00',
  warnSoft: '#FDF3DC',
  scrim: 'rgba(48,34,56,0.92)',
};

const dark: typeof light = {
  bg: '#1E1624',
  surface: '#2A2031',
  surfaceSunken: '#33283A',
  ink: '#FBF3EA',
  ink2: '#E3D5DA',
  ink3: '#BBA9B4',
  line: '#4A3C50',
  accent: '#F4CD63',
  accentPressed: '#E6BD52',
  accentSoft: '#33283A',
  onAccent: '#302238',
  persimmon: '#EE8466',
  onPersimmon: '#302238',
  gold: '#F4CD63',
  onGold: '#302238',
  peach: '#F4B89A',
  panel: '#3A2A40',
  onPanel: '#FFFFFF',
  danger: '#FF9AA6',
  dangerSoft: '#3E1F27',
  warn: '#F2C46B',
  warnSoft: '#352A12',
  scrim: 'rgba(10,6,12,0.85)',
};

export type Colors = typeof light;

export const font = {
  regular: 'DMSans-Regular',
  medium: 'DMSans-Medium',
  semibold: 'DMSans-SemiBold',
  bold: 'DMSans-Bold',
  heading: 'Sora-SemiBold',
  headingBold: 'Sora-Bold',
  wordmark: 'Manrope-ExtraBold',
};

export const type = {
  hero: { fontFamily: font.heading, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  display: { fontFamily: font.heading, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: font.heading, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headline: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
  numeral: { fontFamily: font.heading, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
export const GUTTER = 24;
export const MAX_CONTENT_WIDTH = 640;

/** Motion: 180ms routine ease-out, 220ms onboarding, no overshoot on clinical surfaces. */
export const motion = { press: 140, routine: 180, enter: 220, stagger: 60, pressScale: 0.97 } as const;

export function useColors(): Colors {
  const system = useColorScheme();
  const { appearance } = usePrefs();
  const scheme = appearance === 'system' ? system : appearance;
  return scheme === 'dark' ? dark : light;
}

export const CATEGORY_META: Record<string, { label: string; short: string; icon: string }> = {
  consultation: { label: 'Consultations', short: 'Visit', icon: 'stethoscope' },
  lab: { label: 'Lab results', short: 'Lab result', icon: 'flask-outline' },
  prescription: { label: 'Prescriptions', short: 'Prescription', icon: 'pill' },
  imaging: { label: 'Imaging', short: 'Imaging', icon: 'radiology-box-outline' },
  vaccination: { label: 'Vaccinations', short: 'Vaccination', icon: 'needle' },
  hospitalization: { label: 'Hospital stays', short: 'Hospital stay', icon: 'hospital-building' },
  dental_vision: { label: 'Dental & vision', short: 'Dental & vision', icon: 'eye-outline' },
  other: { label: 'Other', short: 'Document', icon: 'file-document-outline' },
};

export const CATEGORIES = Object.keys(CATEGORY_META);
