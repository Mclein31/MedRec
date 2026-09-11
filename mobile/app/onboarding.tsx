import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Colors, Radii } from '../constants/theme';
import { ONBOARDING_SLIDES, PRIVACY_PILLARS } from '../constants/onboarding';

const TEAL = Colors.teal;
const INK = Colors.ink;
const BG = Colors.bg;
const CARD_BG = Colors.cardBg;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const RED = Colors.red;
const RED_LIGHT = Colors.redLight;
const RED_BORDER = Colors.redBorder;
const BLUE = Colors.blue;
const BLUE_LIGHT = Colors.blueLight;
const TEAL_LIGHT = Colors.tealLight;

export default function OnboardingScreen() {
  const router = useRouter();
  const { token, completeOnboarding } = useAuth();
  const {
    width,
    isTablet,
    isCompactPhone,
    insets,
    scaleFont,
  } = useResponsive();

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isReplayMode = !!token;

  // Re-align carousel offset on orientation / dimension change
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: activeIndex * width, animated: false });
  }, [width, activeIndex]);

  // Full-width responsive content layout bounded on tablets to preserve authentic proportions
  const maxContentWidth = isTablet ? Math.min(width - 48, 580) : width;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / width);
      if (page !== activeIndex && page >= 0 && page < ONBOARDING_SLIDES.length) {
        setActiveIndex(page);
        Haptics.selectionAsync();
      }
    },
    [activeIndex, width]
  );

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= ONBOARDING_SLIDES.length) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
      setActiveIndex(index);
    },
    [width]
  );

  const handleNext = useCallback(() => {
    if (activeIndex < ONBOARDING_SLIDES.length - 1) {
      goToSlide(activeIndex + 1);
    }
  }, [activeIndex, goToSlide]);

  const handleBack = useCallback(() => {
    if (activeIndex > 0) {
      goToSlide(activeIndex - 1);
    }
  }, [activeIndex, goToSlide]);

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isReplayMode) {
      router.back();
    } else {
      await completeOnboarding();
      router.replace('/login');
    }
  }, [isReplayMode, completeOnboarding, router]);

  const handleGetStarted = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isReplayMode) {
      router.back();
    } else {
      await completeOnboarding();
      router.replace('/register');
    }
  }, [isReplayMode, completeOnboarding, router]);

  const handleSignIn = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isReplayMode) {
      router.back();
    } else {
      await completeOnboarding();
      router.replace('/login');
    }
  }, [isReplayMode, completeOnboarding, router]);

  // ─────────────────────────────────────────────────────────────────────────
  // HERO PREVIEWS (Authentic Mini UI Replicas of App Features)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Slide 1 Preview: Authentic Health Records List & Gemini AI Insights
   */
  const renderRecordsHero = () => (
    <View style={styles.previewCard}>
      {/* Grouped Records List Section */}
      <View style={styles.recordsGroup}>
        {/* Category Chips Filter Bar (Exact pattern from Records tab) */}
        <View style={styles.chipsRow}>
          <View style={[styles.chip, styles.chipActive]}>
            <Text style={styles.chipTextActive}>Labs</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Consultations</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Prescriptions</Text>
          </View>
        </View>

        {/* Record Cards Stack */}
        <View style={styles.recordsCardsStack}>
          {/* Record Card 1: Lab Result */}
          <View style={styles.recordCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.typeBadgeText}>LAB RESULT</Text>
              <View style={styles.statusBadgeTeal}>
                <Text style={styles.statusBadgeTextTeal}>NORMAL</Text>
              </View>
            </View>
            <View style={styles.recordRow}>
              <View style={[styles.recordIconBox, { backgroundColor: TEAL_LIGHT }]}>
                <Image
                  source={require('../assets/icons/lab.png')}
                  style={styles.recordIconAsset}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.recordContent}>
                <Text style={styles.recordTitle} numberOfLines={1}>
                  Complete Blood Count (CBC)
                </Text>
                <View style={styles.recordDateRow}>
                  <Image
                    source={require('../assets/icons/calendar.png')}
                    style={styles.calendarIcon}
                  />
                  <Text style={styles.recordDateText}>Oct 14, 2025 • St. Jude Diagnostic</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Record Card 2: Consultation */}
          <View style={styles.recordCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.typeBadgeText, { color: BLUE }]}>CONSULTATION</Text>
              <View style={styles.statusBadgeBlue}>
                <Text style={styles.statusBadgeTextBlue}>REVIEWED</Text>
              </View>
            </View>
            <View style={styles.recordRow}>
              <View style={[styles.recordIconBox, { backgroundColor: BLUE_LIGHT }]}>
                <Image
                  source={require('../assets/icons/consultation.png')}
                  style={styles.recordIconAsset}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.recordContent}>
                <Text style={styles.recordTitle} numberOfLines={1}>
                  Cardiology Review
                </Text>
                <View style={styles.recordDateRow}>
                  <Image
                    source={require('../assets/icons/calendar.png')}
                    style={styles.calendarIcon}
                  />
                  <Text style={styles.recordDateText}>Sep 28, 2025 • Dr. Sarah Mitchell</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* AI Medical Insights Banner (Exact replica from Records tab) */}
      <View style={styles.aiInsightsCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiTitleGroup}>
            <Image
              source={require('../assets/icons/AI.png')}
              style={styles.aiIconAsset}
              resizeMode="contain"
            />
            <Text style={styles.aiTitleText}>AI Medical Insights</Text>
          </View>
          <View style={styles.aiModelBadge}>
            <Text style={styles.aiModelBadgeText}>Gemini 2.5</Text>
          </View>
        </View>
        <Text style={styles.aiBodyText}>
          Vitals normal. Blood pressure stable at 118/76 mmHg. Cholesterol levels reduced 14% compared to prior checkup.
        </Text>
      </View>
    </View>
  );

  /**
   * Slide 2 Preview: Authentic Doctor's QR Access Card
   */
  const renderSharingHero = () => (
    <View style={styles.previewCard}>
      <View style={styles.shareHeaderRow}>
        <View style={styles.liveBadgeRow}>
          <View style={styles.livePulsingDot} />
          <Text style={styles.liveBadgeText}>ACTIVE SESSION</Text>
        </View>
        <Text style={styles.shareDoctorName}>Dr. Sarah Mitchell, MD</Text>
      </View>

      {/* Real QRCode SVG container */}
      <View style={styles.qrWrapper}>
        <View style={styles.qrInnerBox}>
          <QRCode
            value="https://medrec.health/share/session-sample"
            size={isCompactPhone ? 96 : isTablet ? 150 : 124}
            color={INK}
            backgroundColor={CARD_BG}
          />
        </View>
        <View style={styles.qrTimerRow}>
          <Image
            source={require('../assets/icons/clock.png')}
            style={styles.clockIcon}
          />
          <Text style={styles.qrTimerText}>Auto-expires in 59:42</Text>
        </View>
      </View>

      {/* 1-Tap Revoke Action */}
      <View style={styles.revokeCardBanner}>
        <Ionicons name="close-circle" size={14} color={RED} />
        <Text style={styles.revokeBannerText}>Instant 1-Tap Revoke Anytime</Text>
      </View>

      {/* Security Guarantee Pill */}
      <View style={styles.shareSecurityFootnote}>
        <Ionicons name="shield-checkmark" size={13} color={TEAL} />
        <Text style={styles.shareSecurityText}>
          Temporary read-only link • No app or sign-in required for provider
        </Text>
      </View>
    </View>
  );

  /**
   * Slide 3 Preview: Authentic Emergency Medical ID Placard
   */
  const renderEmergencyHero = () => (
    <View style={styles.previewCard}>
      {/* Emergency Header Bar */}
      <View style={styles.emergencyHeaderBar}>
        <View style={styles.emergencyTitleRow}>
          <View style={styles.emergencyIconCircle}>
            <Ionicons name="medical" size={13} color="#FFFFFF" />
          </View>
          <Text style={styles.emergencyHeaderText}>FIRST RESPONDER MEDICAL ID</Text>
        </View>
        <View style={styles.bloodTypePill}>
          <Text style={styles.bloodTypePillText}>BLOOD: O+</Text>
        </View>
      </View>

      {/* Cohesive Medical Data Cluster */}
      <View style={styles.emergencyBodyGroup}>
        {/* Critical Allergies Alert */}
        <View style={styles.allergyAlertBox}>
          <View style={styles.allergyLabelRow}>
            <Ionicons name="warning" size={12} color={RED} />
            <Text style={styles.allergyLabelText}>CRITICAL ALLERGIES</Text>
          </View>
          <Text style={styles.allergyValueText}>Penicillin (Anaphylactic) • Peanuts</Text>
        </View>

        {/* Clinical Conditions & Maintenance Meds */}
        <View style={styles.emergencyGridRow}>
          <View style={styles.emergencyGridCol}>
            <Text style={styles.gridLabel}>CONDITIONS</Text>
            <Text style={styles.gridValue}>Asthma (Mild)</Text>
          </View>
          <View style={styles.emergencyGridDivider} />
          <View style={styles.emergencyGridCol}>
            <Text style={styles.gridLabel}>MAINTENANCE MEDS</Text>
            <Text style={styles.gridValue}>Albuterol Inhaler</Text>
          </View>
        </View>

        {/* Emergency ICE Contact Quick Dial */}
        <View style={styles.emergencyContactRow}>
          <View style={styles.iceAvatarCircle}>
            <Ionicons name="call" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.iceContent}>
            <Text style={styles.iceLabel}>Emergency Contact (ICE)</Text>
            <Text style={styles.iceName}>Sarah (Spouse) • (555) 019-2834</Text>
          </View>
        </View>
      </View>

      {/* Paramedic Offline Guarantee */}
      <View style={styles.offlineNoticeBox}>
        <Ionicons name="flash" size={12} color={TEAL} />
        <Text style={styles.offlineNoticeText}>
          Accessible offline without phone unlocking or cell reception
        </Text>
      </View>
    </View>
  );

  /**
   * Slide 4 Preview: Authentic Zero-Knowledge Privacy & Security
   */
  const renderPrivacyHero = () => (
    <View style={styles.previewCard}>
      {/* Top Shield Emblem */}
      <View style={styles.privacyEmblemRow}>
        <View style={styles.padlockEmblemBox}>
          <Image
            source={require('../assets/icons/padlock.png')}
            style={styles.padlockAsset}
            resizeMode="contain"
          />
        </View>
        <View style={styles.privacyEmblemTextCol}>
          <Text style={styles.privacyEmblemTitle}>Zero-Knowledge Vault</Text>
          <Text style={styles.privacyEmblemSub}>Patient-owned health encryption</Text>
        </View>
      </View>

      {/* 3 Authentic Privacy Guarantee Rows */}
      <View style={styles.privacyPillarsContainer}>
        {PRIVACY_PILLARS.map((pillar, idx) => (
          <View key={pillar.title}>
            <View style={styles.privacyPillarRow}>
              <View style={styles.pillarIconCircle}>
                <Ionicons
                  name={pillar.icon}
                  size={15}
                  color={TEAL}
                />
              </View>
              <View style={styles.pillarTextCol}>
                <Text style={styles.pillarTitleText}>{pillar.title}</Text>
                <Text style={styles.pillarDescText} numberOfLines={2}>
                  {pillar.description}
                </Text>
              </View>
            </View>
            {idx < PRIVACY_PILLARS.length - 1 && <View style={styles.pillarDivider} />}
          </View>
        ))}
      </View>

      {/* Regulatory Compliance Seal */}
      <View style={styles.complianceSealBox}>
        <Ionicons name="shield-checkmark" size={13} color={Colors.muted} />
        <Text style={styles.complianceSealText}>
          HIPAA Architecture • AES-256 Cloudflare R2 • End-to-End Encrypted
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ───────────────────────────────────────────────────────────────────
          TOP BRAND HEADER & SKIP CONTROLS (Aligned with App Navbars)
      ─────────────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
            paddingHorizontal: isTablet ? Math.max((width - maxContentWidth) / 2 + 20, 24) : 16,
          },
        ]}
      >
        {/* Brand Row */}
        <View style={styles.topBrandRow}>
          <View style={styles.brandTitleRow}>
            <Image
              source={require('../assets/logo/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitleText}>MedRec</Text>
          </View>

          {/* Replay Close or Pre-SignIn Skip */}
          {isReplayMode ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.closeCircleBtn, pressed && styles.pressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close tutorial"
              accessibilityHint="Dismisses the tour and returns to the previous screen"
            >
              <Ionicons name="close" size={20} color={INK} />
            </Pressable>
          ) : activeIndex < ONBOARDING_SLIDES.length - 1 ? (
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipPillBtn, pressed && styles.pressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding tour"
              accessibilityHint="Skips the introduction and proceeds to sign in"
            >
              <Text style={styles.skipPillText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* 4-Segment Progress Bar */}
        <View style={styles.segmentedProgressBar}>
          {ONBOARDING_SLIDES.map((slide, index) => {
            const isFilled = index <= activeIndex;
            return (
              <View
                key={slide.id}
                style={[
                  styles.progressSegment,
                  isFilled ? styles.progressSegmentFilled : styles.progressSegmentUnfilled,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────────────
          HORIZONTAL CAROUSEL (Buttery-smooth Native Paging)
      ─────────────────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        style={styles.carouselScrollView}
      >
        {ONBOARDING_SLIDES.map((slide, index) => {
          return (
            <View key={slide.id} style={[styles.slidePage, { width }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.slideScrollView}
                contentContainerStyle={[
                  styles.slideScrollContent,
                  {
                    maxWidth: maxContentWidth,
                    paddingHorizontal: isTablet ? 0 : 16,
                  },
                ]}
              >
                {/* Feature Category Badge */}
                <View style={styles.badgeWrapper}>
                  <View style={[styles.badgePill, { backgroundColor: slide.badgeBg }]}>
                    <Text style={[styles.badgePillText, { color: slide.badgeColor }]}>
                      {slide.badge}
                    </Text>
                  </View>
                </View>

                {/* Narrative Headline & Subtitle */}
                <Text
                  style={[
                    styles.headlineText,
                    {
                      fontSize: scaleFont(23, 20, 26),
                      lineHeight: scaleFont(29, 26, 32),
                    },
                  ]}
                >
                  {slide.headline}
                </Text>

                <Text
                  style={[
                    styles.subtitleText,
                    {
                      fontSize: scaleFont(13, 12, 14.5),
                      lineHeight: scaleFont(18.5, 16.5, 21),
                    },
                  ]}
                >
                  {slide.subtitle}
                </Text>

                {/* Authentic Mini UI Hero Graphic */}
                <View style={styles.heroWrapper}>
                  {slide.heroType === 'records' && renderRecordsHero()}
                  {slide.heroType === 'sharing' && renderSharingHero()}
                  {slide.heroType === 'emergency' && renderEmergencyHero()}
                  {slide.heroType === 'privacy' && renderPrivacyHero()}
                </View>
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────────────
          BOTTOM CONTROLS (Back / Dynamic Pill Indicators / Primary CTA)
      ─────────────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomControlsRoot,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: isTablet ? Math.max((width - maxContentWidth) / 2 + 20, 24) : 16,
          },
        ]}
      >
        {activeIndex < ONBOARDING_SLIDES.length - 1 ? (
          /* Slides 1-3 Navigation Bar */
          <View style={styles.carouselNavRow}>
            {/* Left: Back Button */}
            <View style={styles.navSideSlot}>
              {activeIndex > 0 ? (
                <Pressable
                  onPress={handleBack}
                  style={({ pressed }) => [styles.backNavBtn, pressed && styles.pressed]}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Previous slide"
                  accessibilityHint="Navigates to the preceding onboarding slide"
                >
                  <Ionicons name="chevron-back" size={16} color={MUTED} />
                  <Text style={styles.backNavText}>Back</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Center: Animated Indicator Pills */}
            <View style={styles.indicatorsRow}>
              {ONBOARDING_SLIDES.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => goToSlide(i)}
                  hitSlop={{ top: 18, bottom: 18, left: 8, right: 8 }}
                  style={[
                    styles.indicatorBase,
                    i === activeIndex ? styles.indicatorActive : styles.indicatorInactive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to slide ${i + 1}`}
                  accessibilityHint={`Navigates directly to slide ${i + 1}`}
                />
              ))}
            </View>

            {/* Right: Next Button */}
            <View style={styles.navSideSlotRight}>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [styles.nextNavBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Next slide"
                accessibilityHint="Advances to the next onboarding slide"
              >
                <Text style={styles.nextNavText}>Next</Text>
                <Image
                  source={require('../assets/icons/arrow.png')}
                  style={styles.arrowIconNext}
                />
              </Pressable>
            </View>
          </View>
        ) : (
          /* Slide 4 Final Conversion CTA Column */
          <View style={styles.finalCtaColumn}>
            {/* Primary Action Button */}
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [styles.primaryCtaBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isReplayMode ? 'Finish Tutorial' : 'Get Started with MedRec'}
              accessibilityHint={
                isReplayMode
                  ? 'Dismisses the tutorial and returns to profile'
                  : 'Completes the tour and opens the account registration form'
              }
            >
              <Text style={styles.primaryCtaText}>
                {isReplayMode ? 'Finish Tutorial' : 'Get Started'}
              </Text>
              <Image
                source={require('../assets/icons/arrow.png')}
                style={styles.arrowIconCta}
              />
            </Pressable>

            {/* Secondary Sign-In Link */}
            {!isReplayMode && (
              <Pressable
                onPress={handleSignIn}
                style={({ pressed }) => [styles.signInLinkBtn, pressed && styles.pressed]}
                hitSlop={{ top: 10, bottom: 12, left: 16, right: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Already have an account? Sign in"
                accessibilityHint="Completes the tour and navigates to the sign-in screen"
              >
                <Text style={styles.signInMutedText}>
                  Already have an account?{' '}
                  <Text style={styles.signInTealText}>Sign In →</Text>
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (100% Theme-Token Aligned)
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  pressed: {
    opacity: 0.72,
  },

  /* Top Brand Header */
  topHeader: {
    paddingBottom: 12,
    backgroundColor: BG,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  brandTitleText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: INK,
  },
  skipPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  skipPillText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: MUTED,
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 30,
  },

  /* 4-Segment Progress Bar */
  segmentedProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  progressSegment: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
  },
  progressSegmentFilled: {
    backgroundColor: TEAL,
  },
  progressSegmentUnfilled: {
    backgroundColor: '#E2E8F0',
  },

  /* Horizontal Carousel */
  carouselScrollView: {
    flex: 1,
  },
  slidePage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideScrollView: {
    width: '100%',
  },
  slideScrollContent: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* Badge & Narrative */
  badgeWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  badgePill: {
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: Radii.full,
  },
  badgePillText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  headlineText: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
    marginBottom: 6,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  subtitleText: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    marginBottom: 16,
    textAlign: 'justify',
    alignSelf: 'stretch',
  },
  heroWrapper: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },

  /* Universal Preview Card Base */
  previewCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    shadowColor: '#12343B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 280,
  },

  /* ─── Hero 1: Records & AI ─── */
  recordsGroup: {
    gap: 10,
  },
  recordsCardsStack: {
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: Radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
  },
  chipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: TEAL,
    letterSpacing: 0.5,
  },
  statusBadgeTeal: {
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  statusBadgeTextTeal: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9.5,
    color: TEAL,
  },
  statusBadgeBlue: {
    backgroundColor: BLUE_LIGHT,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  statusBadgeTextBlue: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9.5,
    color: BLUE,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconAsset: {
    width: 20,
    height: 20,
  },
  recordContent: {
    flex: 1,
    gap: 2,
  },
  recordTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13,
    color: INK,
  },
  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calendarIcon: {
    width: 12,
    height: 12,
    tintColor: MUTED,
  },
  recordDateText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },

  aiInsightsCard: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    padding: 10,
    gap: 4,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiIconAsset: {
    width: 15,
    height: 15,
  },
  aiTitleText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11.5,
    color: BLUE,
  },
  aiModelBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  aiModelBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 9,
    color: BLUE,
  },
  aiBodyText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: INK,
    lineHeight: 15.5,
    textAlign: 'justify',
  },

  /* ─── Hero 2: Doctor QR Sharing ─── */
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: Radii.full,
  },
  livePulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: TEAL,
  },
  liveBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: TEAL,
  },
  shareDoctorName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: INK,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
    paddingVertical: 6,
  },
  qrInnerBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  qrTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clockIcon: {
    width: 13,
    height: 13,
    tintColor: TEAL,
  },
  qrTimerText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12,
    color: TEAL,
  },
  revokeCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED_BORDER,
    borderRadius: 10,
    paddingVertical: 7,
  },
  revokeBannerText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: RED,
  },
  shareSecurityFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  shareSecurityText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: MUTED,
  },

  /* ─── Hero 3: Emergency ID ─── */
  emergencyBodyGroup: {
    gap: 8,
  },
  emergencyHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 8,
  },
  emergencyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emergencyIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyHeaderText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    color: RED,
    letterSpacing: 0.5,
  },
  bloodTypePill: {
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED_BORDER,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: Radii.full,
  },
  bloodTypePillText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    color: RED,
  },
  allergyAlertBox: {
    backgroundColor: RED_LIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED_BORDER,
    padding: 8,
    gap: 2,
  },
  allergyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allergyLabelText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9.5,
    color: RED,
    letterSpacing: 0.5,
  },
  allergyValueText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: INK,
  },
  emergencyGridRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
  },
  emergencyGridCol: {
    flex: 1,
    gap: 2,
  },
  emergencyGridDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginHorizontal: 8,
  },
  gridLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9,
    color: MUTED,
    letterSpacing: 0.4,
  },
  gridValue: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: INK,
  },
  emergencyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
  },
  iceAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iceContent: {
    flex: 1,
  },
  iceLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 9.5,
    color: MUTED,
  },
  iceName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: INK,
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
  },
  offlineNoticeText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: MUTED,
  },

  /* ─── Hero 4: Patient-First Privacy ─── */
  privacyEmblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 8,
  },
  padlockEmblemBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padlockAsset: {
    width: 18,
    height: 18,
    tintColor: TEAL,
  },
  privacyEmblemTextCol: {
    flex: 1,
  },
  privacyEmblemTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13,
    color: INK,
  },
  privacyEmblemSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  privacyPillarsContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    gap: 8,
  },
  privacyPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillarIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTextCol: {
    flex: 1,
  },
  pillarTitleText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: INK,
  },
  pillarDescText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: MUTED,
    lineHeight: 14,
    textAlign: 'justify',
  },
  pillarDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginTop: 8,
  },
  complianceSealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 5,
  },
  complianceSealText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 9.5,
    color: MUTED,
  },

  /* ─── Bottom Navigation Controls ─── */
  bottomControlsRoot: {
    backgroundColor: BG,
    paddingTop: 8,
  },
  carouselNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  navSideSlot: {
    width: 76,
    alignItems: 'flex-start',
  },
  navSideSlotRight: {
    width: 90,
    alignItems: 'flex-end',
  },
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backNavText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: MUTED,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorBase: {
    height: 7,
    borderRadius: 3.5,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: TEAL,
  },
  indicatorInactive: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  nextNavBtn: {
    height: 44,
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  nextNavText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  arrowIconNext: {
    width: 15,
    height: 15,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },

  /* Slide 4 Final Conversion CTA */
  finalCtaColumn: {
    gap: 8,
  },
  primaryCtaBtn: {
    height: 52,
    backgroundColor: TEAL,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCtaText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  arrowIconCta: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  signInLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  signInMutedText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  signInTealText: {
    fontFamily: 'LexendDeca-Bold',
    color: TEAL,
  },
});
