import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors } from '../../constants/theme';
import { PrivateModal } from '../security/PrivateModal';

export function InsightSheet({ insight, onClose }: { insight: { title: string; text: string } | null; onClose: () => void }) {
  const { insets, isTablet } = useResponsive();
  return <PrivateModal visible={!!insight} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.scrim, isTablet && { justifyContent: 'center' }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close summary" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]} accessibilityViewIsModal>
        <View style={styles.header}><View style={styles.heading}><Ionicons name="sparkles-outline" size={22} color={Colors.blue} /><Text style={styles.title} accessibilityRole="header">{insight?.title}</Text></View><Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close summary"><Ionicons name="close" size={22} color={Colors.ink} /></Pressable></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><Text selectable style={styles.body}>{insight?.text}</Text><View style={styles.note}><Ionicons name="information-circle-outline" size={18} color={Colors.muted} /><Text style={styles.noteText}>An AI overview can miss details. Check the original records with your clinician before making health decisions.</Text></View></ScrollView>
      </View>
    </View>
  </PrivateModal>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 64 },
  sheet: { width: '100%', maxWidth: 680, maxHeight: '90%', alignSelf: 'center', backgroundColor: Colors.surface, borderRadius: 28, padding: 24, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  heading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontFamily: 'LexendDeca-Bold', fontSize: 20, lineHeight: 28, color: Colors.ink },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: Colors.bg },
  content: { gap: 24, paddingBottom: 8 },
  body: { fontFamily: 'LexendDeca-Regular', fontSize: 15, lineHeight: 25, color: Colors.ink },
  note: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: Colors.border, paddingTop: 18 },
  noteText: { flex: 1, fontFamily: 'LexendDeca-Regular', fontSize: 12, lineHeight: 20, color: Colors.muted },
});
