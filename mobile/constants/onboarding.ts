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
    badge: 'ALL-IN-ONE HEALTH VAULT',
    badgeColor: '#159A83',
    badgeBg: '#DDF5EE',
    headline: 'Your Complete Health History, Unified & Clarified',
    subtitle:
      'Organize lab tests, doctor visits, and medications in one secure timeline with automated AI clinical summaries.',
    heroType: 'records',
  },
  {
    id: 'doctor-sharing',
    stepNumber: 2,
    badge: 'FRICTIONLESS SHARING',
    badgeColor: '#1976D2',
    badgeBg: '#EBF3FB',
    headline: 'Share Instantly with Doctors via Secure QR',
    subtitle:
      'Provide doctors instant, temporary read-only access during consultations. No accounts needed and links auto-expire.',
    heroType: 'sharing',
  },
  {
    id: 'emergency-id',
    stepNumber: 3,
    badge: 'CRITICAL SAFETY',
    badgeColor: '#D92D20',
    badgeBg: '#FEF3F2',
    headline: 'Emergency Medical ID Ready When Seconds Count',
    subtitle:
      'Keep your blood type, severe allergies, and emergency contacts accessible to first responders right from your phone.',
    heroType: 'emergency',
  },
  {
    id: 'privacy-security',
    stepNumber: 4,
    badge: 'PATIENT-FIRST PRIVACY',
    badgeColor: '#159A83',
    badgeBg: '#DDF5EE',
    headline: 'Your Health Data Belongs Only to You',
    subtitle:
      'Zero ads, zero data selling, and zero AI training on your private files. Bank-grade encryption safeguards your health.',
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
    title: 'Zero Ads & Zero Data Selling',
    description: 'We never monetize, share, or broker your personal health records.',
  },
  {
    icon: 'lock-closed',
    title: 'Private Encrypted Vault',
    description: 'All documents are stored in private Cloudflare R2 vaults with AES-256 encryption.',
  },
  {
    icon: 'timer-outline',
    title: 'Time-Expiring Access Tokens',
    description: 'Doctor shares auto-expire in 15 minutes and can be revoked with 1 tap.',
  },
] as const;
