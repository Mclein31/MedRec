import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface OnboardingSlide {
  id: string;
  stepNumber: number;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  headline: string;
  subtitle: string;
  heroType: 'records' | 'sharing' | 'emergency' | 'privacy';
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'unified-records',
    stepNumber: 1,
    badge: 'A CLEARER HEALTH HISTORY',
    badgeColor: '#087F6D',
    badgeBg: '#DDF5EE',
    headline: 'Your health story.\nAll together.',
    subtitle:
      'Keep lab results, prescriptions, and visits in one place. Start with a photo or a simple note.',
    heroType: 'records',
  },
  {
    id: 'doctor-sharing',
    stepNumber: 2,
    badge: 'READY FOR YOUR NEXT VISIT',
    badgeColor: '#1976D2',
    badgeBg: '#EBF3FB',
    headline: 'Less paperwork.\nMore conversation.',
    subtitle:
      'Choose the records to share, then show your doctor a QR code. Access is read-only and expires automatically.',
    heroType: 'sharing',
  },
  {
    id: 'emergency-id',
    stepNumber: 3,
    badge: 'THE DETAILS THAT MATTER',
    badgeColor: '#D92D20',
    badgeBg: '#FEF3F2',
    headline: 'Keep your essentials\nclose at hand.',
    subtitle:
      'Add allergies, medications, and an emergency contact to your Medical ID. Open it from your profile when you need it.',
    heroType: 'emergency',
  },
  {
    id: 'privacy-security',
    stepNumber: 4,
    badge: 'YOU CHOOSE WHO SEES WHAT',
    badgeColor: '#087F6D',
    badgeBg: '#DDF5EE',
    headline: 'Your records.\nYour say.',
    subtitle:
      'Choose what to share, end access at any time, and export your history whenever you need a copy.',
    heroType: 'privacy',
  },
];

export interface PrivacyPillar {
  icon: IoniconName;
  title: string;
  description: string;
}

export const PRIVACY_PILLARS: readonly PrivacyPillar[] = [
  {
    icon: 'shield-checkmark',
    title: 'Share on your terms',
    description: 'Choose specific records or share your full history.',
  },
  {
    icon: 'lock-closed',
    title: 'Private document storage',
    description: 'Attachments use private storage and temporary download links.',
  },
  {
    icon: 'timer-outline',
    title: 'Access has an end',
    description: 'QR access expires automatically. Revoke it sooner from Share.',
  },
] as const;
