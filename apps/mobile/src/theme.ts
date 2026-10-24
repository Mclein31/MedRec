import { useColorScheme } from 'react-native';

/**
 * MedRec design tokens. The accent is reserved for the one primary action per
 * screen; everything else is carried by type weight and neutral surfaces.
 */
const light = {
  bg: '#F6F7F6',
  surface: '#FFFFFF',
  surfaceSunken: '#EEF1F0',
  ink: '#14211D',
  ink2: '#3E4C48',
  ink3: '#66746F',
  line: '#E2E7E5',
  accent: '#087F6D',
  accentPressed: '#066B5C',
  accentSoft: '#E7F3F0',
  onAccent: '#FFFFFF',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  warn: '#8A5A00',
  warnSoft: '#FDF3DC',
  scrim: 'rgba(10,20,17,0.45)',
};

const dark: typeof light = {
  bg: '#0F1513',
  surface: '#161E1B',
  surfaceSunken: '#1C2622',
  ink: '#E8EEEC',
  ink2: '#B9C5C1',
  ink3: '#8B9994',
  line: '#26312D',
  accent: '#3FBFA6',
  accentPressed: '#35A890',
  accentSoft: '#16302A',
  onAccent: '#06231D',
  danger: '#FF8A80',
  dangerSoft: '#3A1D1B',
  warn: '#F2C46B',
  warnSoft: '#352A12',
  scrim: 'rgba(0,0,0,0.6)',
};

export type Colors = typeof light;

export const font = {
  regular: 'LexendDeca-Regular',
  medium: 'LexendDeca-Medium',
  semibold: 'LexendDeca-SemiBold',
  bold: 'LexendDeca-Bold',
};

export const type = {
  display: { fontFamily: font.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headline: { fontFamily: font.medium, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
export const GUTTER = 20;
export const MAX_CONTENT_WIDTH = 640;

/** Motion: short, ease-out, no overshoot. */
export const motion = { press: 140, enter: 220, stagger: 60, pressScale: 0.97 } as const;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  consultation: { label: 'Consultations', icon: 'stethoscope' },
  lab: { label: 'Lab results', icon: 'flask-outline' },
  prescription: { label: 'Prescriptions', icon: 'pill' },
  imaging: { label: 'Imaging', icon: 'radiology-box-outline' },
  vaccination: { label: 'Vaccinations', icon: 'needle' },
  hospitalization: { label: 'Hospital stays', icon: 'hospital-building' },
  dental_vision: { label: 'Dental & vision', icon: 'eye-outline' },
  other: { label: 'Other', icon: 'file-document-outline' },
};

export const CATEGORIES = Object.keys(CATEGORY_META);
