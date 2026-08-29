import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '../../lib/api';

// Design Tokens matching MedRec standard palette
const TEAL = '#159A83';
const INK = '#12343B';
const GREEN_LIGHT = '#DDF5EE';
const BG = '#F4FAF9';
const BORDER = '#E5F0EE';
const MUTED = '#64748B';
const CARD_BG = '#FFFFFF';

const BLUE = '#1976D2';
const BLUE_LIGHT = '#EBF3FB';
const BLUE_BORDER = '#D4E5F9';

const RED = '#D92D20';
const RED_LIGHT = '#FEF3F2';
const RED_BORDER = '#FECDCA';

const TYPE_ASSETS: Record<string, any> = {
  consultation: require('../../assets/icons/consultation.png'),
  diagnosis: require('../../assets/icons/diagnosis.png'),
  lab: require('../../assets/icons/lab.png'),
  prescription: require('../../assets/icons/prescription.png'),
  medication: require('../../assets/icons/prescription.png'),
  appointment: require('../../assets/icons/calendar.png'),
  other: require('../../assets/icons/folder.png'),
};

const TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  diagnosis: 'Diagnosis',
  lab: 'Lab Result',
  prescription: 'Prescription',
  medication: 'Medication',
  appointment: 'Appointment',
  other: 'General Record',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Not specified';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}


type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
};

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getRecord(id)
      .then((data) => setRecord(data.record))
      .catch((err: any) => {
        Alert.alert('Error loading record', err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleExplain = async () => {
    if (!record) return;

    setExplaining(true);

    try {
      const promptText = `${record.title}: ${record.description || 'No notes provided'}`;
      const data = await api.explain(promptText);
      setExplanation(data.explanation);
    } catch (err: any) {
      Alert.alert('Explain failed', err.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete record?',
      'Are you sure you want to delete this medical record? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRecord(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Delete failed', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Loading record details...</Text>
        </View>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <View style={styles.notFoundIconBox}>
            <Image
              source={require('../../assets/icons/folder.png')}
              style={styles.notFoundAsset}
            />
          </View>

          <Text style={styles.notFoundTitle}>Record not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This record may have been removed or is inaccessible.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.notFoundBackBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.notFoundBackText}>Back to Records</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const typeKey = (record.type || 'other').toLowerCase();
  const typeLabel = TYPE_LABELS[typeKey] || record.type.charAt(0).toUpperCase() + record.type.slice(1);
  const typeAsset = TYPE_ASSETS[typeKey] || require('../../assets/icons/folder.png');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ─────────────────────────────
          SAFE-AREA NAVIGATION HEADER
      ───────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={INK} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Record Details
        </Text>

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.headerDeleteBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Delete record"
        >
          <Ionicons name="trash-outline" size={18} color={RED} />
        </Pressable>
      </View>

      {/* ─────────────────────────────
          CONTENT SCROLL VIEW
      ───────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* 1. MAIN RECORD OVERVIEW CARD */}
        <View style={styles.card}>
          {/* Top Row: Type Badge */}
          <View style={styles.cardTopRow}>
            <View style={styles.typeBadge}>
              <Image source={typeAsset} style={styles.typeBadgeIcon} />
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          </View>

          {/* Record Title */}
          <Text style={styles.recordTitle}>{record.title}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Compact Metadata Row */}
          <View style={styles.metadataRow}>
            {/* Event Date */}
            <View style={styles.metaCol}>
              <View style={styles.metaHeader}>
                <Image
                  source={require('../../assets/icons/calendar.png')}
                  style={styles.metaIcon}
                />
                <Text style={styles.metaLabel}>Date of Event</Text>
              </View>
              <Text style={styles.metaValue}>{formatDate(record.date)}</Text>
            </View>

            <View style={styles.metaDivider} />

            {/* Created / Logged Date */}
            <View style={styles.metaCol}>
              <View style={styles.metaHeader}>
                <Image
                  source={require('../../assets/icons/clock.png')}
                  style={styles.metaIcon}
                />
                <Text style={styles.metaLabel}>Logged in MedRec</Text>
              </View>
              <Text style={styles.metaValue}>
                {formatDate(record.created_at || record.date)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. CLINICAL NOTES & OBSERVATIONS CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIconBox}>
              <Image
                source={require('../../assets/icons/open-folder.png')}
                style={styles.sectionHeaderIcon}
              />
            </View>
            <Text style={styles.sectionHeaderTitle}>
              Clinical Notes & Observations
            </Text>
          </View>

          {record.description && record.description.trim() ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{record.description}</Text>
            </View>
          ) : (
            <View style={styles.emptyNotesContainer}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={MUTED}
                style={{ opacity: 0.6 }}
              />
              <Text style={styles.emptyNotesText}>
                No additional clinical notes or observations recorded for this entry.
              </Text>
            </View>
          )}
        </View>

        {/* 3. AI EXPLANATION SECTION */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiIconBox}>
              <Image
                source={require('../../assets/icons/AI.png')}
                style={styles.aiIcon}
              />
            </View>
            <View style={styles.aiHeaderTextContainer}>
              <Text style={styles.aiTitle}>AI Medical Insights</Text>
              <Text style={styles.aiSubtitle}>
                Translate clinical terms into simple language
              </Text>
            </View>
          </View>

          {explanation ? (
            <View style={styles.aiResultWrapper}>
              <View style={styles.aiResultContainer}>
                <Text style={styles.aiResultText}>{explanation}</Text>
              </View>

              <View style={styles.aiFooter}>
                <Text style={styles.aiDisclaimer}>
                  AI insights are for reference only. Always consult your doctor.
                </Text>
                <Pressable
                  onPress={handleExplain}
                  disabled={explaining}
                  style={({ pressed }) => [
                    styles.aiReExplainBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  {explaining ? (
                    <ActivityIndicator size="small" color={BLUE} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={13} color={BLUE} />
                      <Text style={styles.aiReExplainText}>Regenerate</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleExplain}
              disabled={explaining}
              style={({ pressed }) => [
                styles.aiActionBtn,
                pressed && styles.pressed,
                explaining && styles.disabledBtn,
              ]}
            >
              {explaining ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.aiActionBtnText}>Analyzing record...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.aiActionBtnText}>Explain with AI</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* 4. SECONDARY DELETE ACTION */}
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteSecondaryBtn,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={17} color={RED} />
          <Text style={styles.deleteSecondaryText}>Delete this record</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },

  loadingText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: MUTED,
    marginTop: 8,
  },

  notFoundIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  notFoundAsset: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    tintColor: TEAL,
  },

  notFoundTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: INK,
    textAlign: 'center',
  },

  notFoundSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },

  notFoundBackBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  notFoundBackText: {
    fontFamily: 'LexendDeca-SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
  },

  /* ─────────────────────────────
     HEADER
  ───────────────────────────── */
  header: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  backButtonText: {
    fontFamily: 'LexendDeca-SemiBold',
    color: INK,
    fontSize: 13,
  },

  headerTitle: {
    flex: 1,
    fontFamily: 'LexendDeca-Bold',
    fontSize: 17,
    color: INK,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  headerDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  pressed: {
    opacity: 0.75,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  /* ─────────────────────────────
     SCROLL CONTENT
  ───────────────────────────── */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },

  /* ─────────────────────────────
     CARDS COMMON
  ───────────────────────────── */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  /* ─────────────────────────────
     OVERVIEW CARD DETAILS
  ───────────────────────────── */
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  typeBadgeIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    tintColor: TEAL,
  },

  typeBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },

  recordTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 21,
    color: INK,
    lineHeight: 27,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },

  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },

  metaCol: {
    flex: 1,
    gap: 3,
  },

  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER,
    marginHorizontal: 12,
  },

  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    tintColor: MUTED,
  },

  metaLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },

  metaValue: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },

  /* ─────────────────────────────
     CLINICAL NOTES CARD
  ───────────────────────────── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionHeaderIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    tintColor: TEAL,
  },

  sectionHeaderTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },

  notesContainer: {
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBF4F1',
  },

  notesText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: '#2D3E40',
    lineHeight: 22,
  },

  emptyNotesContainer: {
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBF4F1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  emptyNotesText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ─────────────────────────────
     AI EXPLANATION CARD
  ───────────────────────────── */
  aiCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
    padding: 18,
    gap: 14,
    shadowColor: BLUE,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  aiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },

  aiHeaderTextContainer: {
    flex: 1,
  },

  aiTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: BLUE,
  },

  aiSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },

  aiActionBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  aiActionBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  aiResultWrapper: {
    gap: 10,
  },

  aiResultContainer: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
  },

  aiResultText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 21,
  },

  aiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  aiDisclaimer: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10,
    color: MUTED,
    lineHeight: 14,
  },

  aiReExplainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: BLUE_LIGHT,
  },

  aiReExplainText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: BLUE,
  },

  /* ─────────────────────────────
     SECONDARY DELETE ACTION
  ───────────────────────────── */
  deleteSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED_BORDER,
    marginTop: 4,
  },

  deleteSecondaryText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: RED,
  },
});