import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet, Alert, AccessibilityInfo, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useMotionPreferences } from '../hooks/useMotionPreferences';
import { Colors } from '../constants/theme';
import { ONBOARDING_SLIDES } from '../constants/onboarding';
import { FeaturePreview } from '../components/onboarding/FeaturePreview';
import { Button } from '../components/ui/Button';

function ProgressDot({ active, onPress, label, motion }: { active: boolean; onPress: () => void; label: string; motion: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => { progress.value = withTiming(active ? 1 : 0, { duration: motion ? 220 : 0 }); }, [active, motion, progress]);
  const style = useAnimatedStyle(() => ({ width: 8 + progress.value * 20, opacity: 0.35 + progress.value * 0.65 }));
  return <Pressable onPress={onPress} style={styles.dotTarget} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }}><Animated.View style={[styles.dot, style]} /></Pressable>;
}

function Slide({ index, active, motion, width, split }: { index: number; active: boolean; motion: boolean; width: number; split: boolean }) {
  const slide = ONBOARDING_SLIDES[index];
  const entrance = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(entrance);
    entrance.value = active && motion ? 0 : 1;
    if (active && motion) entrance.value = withSpring(1, { stiffness: 140, damping: 24 });
    return () => cancelAnimation(entrance);
  }, [active, motion, entrance]);
  const copyStyle = useAnimatedStyle(() => ({ opacity: entrance.value, transform: [{ translateY: (1 - entrance.value) * 16 }] }));
  return <View style={{ width, flex: 1 }} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} aria-hidden={!active}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.slideContent, split && styles.slideSplit]}>
      <Animated.View style={[styles.copy, split && styles.splitCopy, copyStyle]}>
        <Text style={[styles.eyebrow, { color: slide.badgeColor }]}>{slide.badge}</Text>
        <Text style={[styles.headline, split && styles.largeHeadline]} accessibilityRole="header">{slide.headline}</Text>
        <Text style={styles.description}>{slide.subtitle}</Text>
      </Animated.View>
      <View style={[styles.preview, split && styles.splitPreview]}><FeaturePreview type={slide.heroType} active={active} motion={motion} /></View>
    </ScrollView>
  </View>;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { token, completeOnboarding } = useAuth();
  const { width, height, insets, isTablet } = useResponsive();
  const { reducedMotion, foreground } = useMotionPreferences();
  const focused = useIsFocused();
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const carousel = useRef<ScrollView>(null);
  const previousWidth = useRef(width);
  const replay = !!token;
  const split = isTablet && width > height;
  const motion = !reducedMotion && !paused && foreground && focused;
  const final = activeIndex === ONBOARDING_SLIDES.length - 1;

  useEffect(() => {
    if (previousWidth.current !== width) {
      carousel.current?.scrollTo({ x: activeIndex * width, animated: false });
      previousWidth.current = width;
    }
  }, [width, activeIndex]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= ONBOARDING_SLIDES.length) return;
    carousel.current?.scrollTo({ x: index * width, animated: motion });
    setActiveIndex(index);
    Haptics.selectionAsync().catch(() => {});
  }, [width, motion]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index >= 0 && index < ONBOARDING_SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const finish = async (destination: '/login' | '/register') => {
    if (finishing) return;
    setFinishing(true);
    try {
      if (replay) {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/profile');
      } else {
        await completeOnboarding();
        router.replace(destination);
      }
    } catch { Alert.alert('Couldn’t finish the tour', 'Please try again.'); }
    finally { setFinishing(false); }
  };

  useEffect(() => { AccessibilityInfo.announceForAccessibility(`Step ${activeIndex + 1} of 4. ${ONBOARDING_SLIDES[activeIndex].headline.replace(/\n/g, ' ')}`); }, [activeIndex]);

  return <View style={styles.root}>
    <StatusBar style="dark" />
    <View style={[styles.header, { paddingTop: insets.top + 16, paddingHorizontal: Math.max(insets.left, insets.right, 24) }]}>
      <View style={styles.brand}><Image source={require('../assets/logo/logo.png')} style={styles.logo} /><Text style={styles.brandName}>MedRec</Text></View>
      <View style={styles.headerActions}>
        {!reducedMotion && <Pressable onPress={() => setPaused(value => !value)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={paused ? 'Play animations' : 'Pause animations'} accessibilityState={{ selected: paused }}><Ionicons name={paused ? 'play-outline' : 'pause-outline'} size={18} color={Colors.muted} /></Pressable>}
        <Pressable onPress={() => finish('/login')} disabled={finishing} style={styles.skip} accessibilityRole="button"><Text style={styles.skipText}>{replay ? 'Close' : 'Skip'}</Text></Pressable>
      </View>
    </View>
    <ScrollView ref={carousel} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} onScrollEndDrag={onScrollEnd} keyboardShouldPersistTaps="handled" style={styles.carousel}>
      {ONBOARDING_SLIDES.map((slide, index) => <Slide key={slide.id} index={index} active={index === activeIndex} motion={motion} width={width} split={split} />)}
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 24 }]}>
      <View style={styles.footerContent}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>0{activeIndex + 1} <Text style={styles.progressMuted}>/ 04</Text></Text>
          <View style={styles.dots}>{ONBOARDING_SLIDES.map((slide, index) => <ProgressDot key={slide.id} active={index === activeIndex} onPress={() => goTo(index)} label={`Step ${index + 1}: ${slide.badge.toLowerCase()}`} motion={motion} />)}</View>
          <Pressable onPress={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Previous step" accessibilityState={{ disabled: activeIndex === 0 }}><Ionicons name="arrow-back" size={20} color={activeIndex === 0 ? Colors.border : Colors.ink} /></Pressable>
        </View>
        <Button label={final ? replay ? 'Back to MedRec' : 'Create my account' : 'Continue'} onPress={final ? () => finish('/register') : () => goTo(activeIndex + 1)} loading={finishing} rightIcon={<Ionicons name="arrow-forward" size={19} color={Colors.white} />} style={styles.continue} />
        {!replay && <Pressable onPress={() => finish('/login')} disabled={finishing} style={styles.signIn} accessibilityRole="button"><Text style={styles.signInText}>Already have an account? <Text style={styles.signInLink}>Sign in</Text></Text></Pressable>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 30, height: 30, resizeMode: 'contain' },
  brandName: { fontFamily: 'LexendDeca-Bold', fontSize: 21, color: Colors.ink },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skip: { minWidth: 52, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontFamily: 'LexendDeca-SemiBold', fontSize: 13, color: Colors.muted },
  carousel: { flex: 1 },
  slideContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 28, maxWidth: 580, width: '100%', alignSelf: 'center' },
  slideSplit: { flexDirection: 'row', alignItems: 'center', gap: 64, maxWidth: 1120, paddingHorizontal: 48 },
  copy: { gap: 16 },
  splitCopy: { flex: 1 },
  eyebrow: { fontFamily: 'LexendDeca-SemiBold', fontSize: 10, letterSpacing: 1.1, lineHeight: 16 },
  headline: { fontFamily: 'LexendDeca-Bold', fontSize: 32, lineHeight: 40, letterSpacing: -0.9, color: Colors.ink },
  largeHeadline: { fontSize: 44, lineHeight: 54, letterSpacing: -1.2 },
  description: { fontFamily: 'LexendDeca-Regular', fontSize: 14, lineHeight: 23, color: Colors.muted, maxWidth: 430 },
  preview: { width: '100%' },
  splitPreview: { flex: 1 },
  footer: { borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, paddingTop: 8 },
  footerContent: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontFamily: 'LexendDeca-SemiBold', fontSize: 12, color: Colors.ink },
  progressMuted: { color: Colors.muted },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 7, borderRadius: 4, backgroundColor: Colors.teal },
  backButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  continue: { minHeight: 54, borderRadius: 16 },
  signIn: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  signInText: { fontFamily: 'LexendDeca-Regular', fontSize: 12, lineHeight: 18, color: Colors.muted },
  signInLink: { fontFamily: 'LexendDeca-SemiBold', color: Colors.teal },
});
