import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { PRIVACY_PILLARS, type IoniconName, type OnboardingSlide } from '../../constants/onboarding';

function Reveal({ children, index, active, motion }: { children: React.ReactNode; index: number; active: boolean; motion: boolean }) {
  const entrance = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(entrance);
    if (active && motion) {
      entrance.value = 0;
      entrance.value = withDelay(index * 90, withSpring(1, { damping: 22, stiffness: 160 }));
    } else entrance.value = 1;
    return () => cancelAnimation(entrance);
  }, [active, motion, index, entrance]);
  const style = useAnimatedStyle(() => ({ opacity: entrance.value, transform: [{ translateX: (1 - entrance.value) * 24 }, { translateY: (1 - entrance.value) * 8 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function PreviewRow({ icon, title, detail, color = Colors.teal }: { icon: IoniconName; title: string; detail: string; color?: string }) {
  return <View style={styles.row}><View style={[styles.iconBox, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={23} color={color} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><Ionicons name="checkmark-circle" size={18} color={color} /></View>;
}

export function FeaturePreview({ type, active, motion }: { type: OnboardingSlide['heroType']; active: boolean; motion: boolean }) {
  const pulse = useSharedValue(0);
  const scan = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(pulse); cancelAnimation(scan);
    pulse.value = 0; scan.value = 0;
    if (active && motion) {
      if (type !== 'records') pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
      if (type === 'sharing') scan.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }), -1, true);
    }
    return () => { cancelAnimation(pulse); cancelAnimation(scan); };
  }, [active, motion, type, pulse, scan]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.12 + pulse.value * 0.1, transform: [{ scale: 1 + pulse.value * 0.16 }] }));
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: scan.value * 120 }] }));
  const heartbeat = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.05 }] }));

  return <View style={styles.stage} accessible accessibilityLabel={`Example ${type} preview. Sample information only.`}>
    <View style={styles.stageHeader}><View style={styles.dot} /><Text style={styles.stageLabel}>{type === 'records' ? 'YOUR RECORDS, ORGANIZED' : type === 'sharing' ? 'A SIMPLE HANDOFF' : type === 'emergency' ? 'YOUR MEDICAL ID' : 'ACCESS YOU CONTROL'}</Text><Text style={styles.sample}>PREVIEW</Text></View>
    {type === 'records' && <View style={styles.stack}>
      <Reveal index={0} active={active} motion={motion}><PreviewRow icon="flask-outline" title="Blood test results" detail="Lab result · Oct 12" /></Reveal>
      <Reveal index={1} active={active} motion={motion}><PreviewRow icon="document-text-outline" title="Your prescription" detail="Prescription · Oct 8" color={Colors.blue} /></Reveal>
      <Reveal index={2} active={active} motion={motion}><PreviewRow icon="medkit-outline" title="Annual checkup" detail="Consultation · Sep 28" /></Reveal>
      <Reveal index={3} active={active} motion={motion}><View style={styles.insight}><Ionicons name="sparkles-outline" size={18} color={Colors.blue} /><Text style={styles.insightText}>Need a little clarity? Ask for a plain-language explanation.</Text></View></Reveal>
    </View>}
    {type === 'sharing' && <View style={styles.sharing}>
      <View style={styles.qrStage}><Animated.View style={[styles.halo, halo]} /><View style={styles.qrCard}>
        <View style={styles.qrGrid}>{Array.from({ length: 81 }, (_, i) => <View key={i} style={[styles.qrCell, { backgroundColor: ((i * 7 + Math.floor(i / 9) * 3) % 5 < 3) ? Colors.ink : Colors.white }]} />)}</View>
        <Animated.View style={[styles.scanLine, line]} />
      </View></View>
      <Reveal index={1} active={active} motion={motion}><View style={styles.accessPill}><Ionicons name="timer-outline" size={16} color={Colors.teal} /><Text style={styles.accessText}>Temporary, read-only access</Text></View></Reveal>
      <Text style={styles.previewNote}>A preview of sharing. This code doesn’t open records.</Text>
    </View>}
    {type === 'emergency' && <View style={styles.stack}>
      <View style={styles.idHeader}><Animated.View style={[styles.heart, heartbeat]}><Ionicons name="heart" size={25} color={Colors.danger} /></Animated.View><View><Text style={styles.idTitle}>Medical ID</Text><Text style={styles.rowDetail}>Essentials at a glance</Text></View></View>
      <Reveal index={0} active={active} motion={motion}><View style={styles.idGrid}><View style={styles.idStat}><Text style={styles.statLabel}>BLOOD TYPE</Text><Text style={styles.blood}>O+</Text></View><View style={[styles.idStat, styles.allergy]}><Text style={styles.statLabel}>ALLERGIES</Text><Text style={styles.allergyText}>Penicillin</Text></View></View></Reveal>
      <Reveal index={1} active={active} motion={motion}><PreviewRow icon="call-outline" title="Emergency contact" detail="Alex · Family" color={Colors.danger} /></Reveal>
      <Text style={styles.previewNote}>Set up your own details from Profile.</Text>
    </View>}
    {type === 'privacy' && <View style={styles.stack}>
      <View style={styles.lockStage}><Animated.View style={[styles.lock, heartbeat]}><Ionicons name="shield-checkmark-outline" size={40} color={Colors.teal} /></Animated.View><Text style={styles.idTitle}>You’re in control</Text></View>
      {PRIVACY_PILLARS.map((pillar, index) => <Reveal key={pillar.title} index={index} active={active} motion={motion}><View style={styles.pillar}><Ionicons name={pillar.icon} size={19} color={Colors.teal} /><View style={styles.rowText}><Text style={styles.rowTitle}>{pillar.title}</Text><Text style={styles.rowDetail}>{pillar.description}</Text></View></View></Reveal>)}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  stage: { width: '100%', backgroundColor: Colors.surface, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 3 },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal },
  stageLabel: { flex: 1, fontFamily: 'LexendDeca-SemiBold', fontSize: 9, letterSpacing: 0.8, color: Colors.muted },
  sample: { fontFamily: 'LexendDeca-Regular', fontSize: 9, color: Colors.muted },
  stack: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: 'LexendDeca-SemiBold', fontSize: 13, lineHeight: 19, color: Colors.ink },
  rowDetail: { fontFamily: 'LexendDeca-Regular', fontSize: 11, lineHeight: 17, color: Colors.muted },
  insight: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: Colors.blueLight, borderRadius: 14 },
  insightText: { flex: 1, fontFamily: 'LexendDeca-Regular', fontSize: 11, lineHeight: 18, color: Colors.ink },
  sharing: { alignItems: 'center', gap: 18 },
  qrStage: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  halo: { position: 'absolute', width: 190, height: 190, borderRadius: 50, backgroundColor: Colors.teal },
  qrCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  qrGrid: { width: 135, height: 135, flexDirection: 'row', flexWrap: 'wrap' },
  qrCell: { width: 15, height: 15, borderWidth: 1, borderColor: Colors.white },
  scanLine: { position: 'absolute', top: 16, left: 16, right: 16, height: 2, backgroundColor: Colors.teal },
  accessPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.tealLight, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
  accessText: { fontFamily: 'LexendDeca-SemiBold', fontSize: 11, color: Colors.teal },
  previewNote: { fontFamily: 'LexendDeca-Regular', fontSize: 10, lineHeight: 17, color: Colors.muted, textAlign: 'center' },
  idHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heart: { backgroundColor: Colors.dangerLight, width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  idTitle: { fontFamily: 'LexendDeca-Bold', fontSize: 18, color: Colors.ink },
  idGrid: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  idStat: { flex: 1, backgroundColor: Colors.bg, borderRadius: 16, padding: 16, gap: 10 },
  statLabel: { fontFamily: 'LexendDeca-SemiBold', fontSize: 9, color: Colors.muted, letterSpacing: 0.8 },
  blood: { fontFamily: 'LexendDeca-Bold', fontSize: 28, color: Colors.ink },
  allergy: { backgroundColor: Colors.dangerLight },
  allergyText: { fontFamily: 'LexendDeca-SemiBold', fontSize: 15, color: Colors.danger },
  lockStage: { alignItems: 'center', gap: 12, marginBottom: 8 },
  lock: { width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  pillar: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
});
