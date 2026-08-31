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
import { StatusBar } from 'expo-status-bar';
import { api } from '../../lib/api';

import { Colors, Radii, Typography, ResponsiveLimits } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

// Design Tokens matching MedRec standard palette
const TEAL = Colors.teal;
const INK = Colors.ink;
const GREEN_LIGHT = Colors.tealLight;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;

const BLUE = Colors.blue;
import { MedicalRecord } from '../../types/record';
import { RECORD_TYPE_ASSETS, RECORD_TYPE_LABELS } from '../../constants/records';
import { formatDateLong } from '../../utils/dateUtils';

const RED = Colors.red;
const RED_LIGHT = Colors.redLight;
const RED_BORDER = Colors.redBorder;

const TYPE_ASSETS = RECORD_TYPE_ASSETS;
const TYPE_LABELS = RECORD_TYPE_LABELS;
const formatDate = (dateStr?: string | null) => formatDateLong(dateStr, 'Not specified', undefined);

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    isTablet,
    screenPadding,
    insets,
    scaleFont,
  } = useResponsive();

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

  // Overview Card Content
  const overviewCard = (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.typeBadge}>
          <Image source={typeAsset} style={styles.typeBadgeIcon} />
          <Text style={styles.typeBadgeText} maxFontSizeMultiplier={1.35}>
            {typeLabel}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.recordTitle,
          { fontSize: scaleFont(21, 18, 24), lineHeight: scaleFont(27, 24, 30) },
        ]}
        maxFontSizeMultiplier={1.35}
      >
        {record.title}
      </Text>

      <View style={styles.divider} />

      <View style={styles.metadataRow}>
        <View style={styles.metaCol}>
          <View style={styles.metaHeader}>
            <Image
              source={require('../../assets/icons/calendar.png')}
              style={styles.metaIcon}
            />
            <Text style={styles.metaLabel} maxFontSizeMultiplier={1.35}>
              Date of Event
            </Text>
          </View>
          <Text
            style={[
              styles.metaValue,
              { fontSize: scaleFont(13, 11.5, 14.5) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            {formatDate(record.date)}
          </Text>
        </View>

        <View style={styles.metaDivider} />

        <View style={styles.metaCol}>
          <View style={styles.metaHeader}>
            <Image
              source={require('../../assets/icons/clock.png')}
              style={styles.metaIcon}
            />
            <Text style={styles.metaLabel} maxFontSizeMultiplier={1.35}>
              Logged in MedRec
            </Text>
          </View>
          <Text
            style={[
              styles.metaValue,
              { fontSize: scaleFont(13, 11.5, 14.5) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            {formatDate(record.created_at || record.date)}
          </Text>
        </View>
      </View>
    </View>
  );

  // Attached Document / Scanned Photo Card
  const attachmentUri = record.attachment_url || record.attachmentUrl;
  const attachmentCard = attachmentUri ? (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderIconBox}>
          <Ionicons name="document-attach-outline" size={18} color={TEAL} />
        </View>
        <Text style={styles.sectionHeaderTitle} maxFontSizeMultiplier={1.35}>
          Attached Document / Photo
        </Text>
      </View>
      <View style={styles.attachmentBox}>
        <Image
          source={{ uri: attachmentUri }}
          style={styles.attachmentImage}
          resizeMode="cover"
        />
      </View>
    </View>
  ) : null;

  // Clinical Notes Content
  const clinicalNotesCard = (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderIconBox}>
          <Image
            source={require('../../assets/icons/open-folder.png')}
            style={styles.sectionHeaderIcon}
          />
        </View>
        <Text style={styles.sectionHeaderTitle} maxFontSizeMultiplier={1.35}>
          Clinical Notes & Observations
        </Text>
      </View>

      {record.description && record.description.trim() ? (
        <View style={styles.notesContainer}>
          <Text
            style={[
              styles.notesText,
              { fontSize: scaleFont(14, 13, 15.5) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            {record.description}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyNotesContainer}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color={MUTED}
            style={{ opacity: 0.6 }}
          />
          <Text style={styles.emptyNotesText} maxFontSizeMultiplier={1.35}>
            No additional clinical notes or observations recorded for this entry.
          </Text>
        </View>
      )}
    </View>
  );

  // AI Medical Insights Card
  const aiInsightsCard = (
    <View style={styles.aiCard}>
      <View style={styles.aiCardHeader}>
        <View style={styles.aiIconBox}>
          <Image
            source={require('../../assets/icons/AI.png')}
            style={styles.aiIcon}
          />
        </View>
        <View style={styles.aiHeaderTextContainer}>
          <Text
            style={[
              styles.aiTitle,
              { fontSize: scaleFont(16, 14.5, 18) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            AI Medical Insights
          </Text>
          <Text
            style={[
              styles.aiSubtitle,
              { fontSize: scaleFont(11, 10.5, 12.5) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            Translate clinical terms into simple language
          </Text>
        </View>
      </View>

      {explanation ? (
        <View style={styles.aiResultWrapper}>
          <View style={styles.aiResultContainer}>
            <Text
              style={[
                styles.aiResultText,
                { fontSize: scaleFont(13, 12, 14.5) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              {explanation}
            </Text>
          </View>

          <View style={styles.aiFooter}>
            <Text style={styles.aiDisclaimer} maxFontSizeMultiplier={1.35}>
              AI insights are for reference only. Always consult your doctor.
            </Text>
            <Pressable
              onPress={handleExplain}
              disabled={explaining}
              style={({ pressed }) => [
                styles.aiReExplainBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Regenerate AI explanation"
            >
              {explaining ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={13} color="#FFFFFF" />
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
          accessibilityRole="button"
          accessibilityLabel="Explain this medical record with AI"
        >
          {explaining ? (
            <>
              <ActivityIndicator size="small" color={BLUE} />
              <Text style={styles.aiActionBtnText}>Analyzing record...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color={BLUE} />
              <Text style={styles.aiActionBtnText}>Explain with AI</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );

  // Delete Action Button
  const deleteActionBtn = (
    <Pressable
      onPress={handleDelete}
      style={({ pressed }) => [
        styles.deleteSecondaryBtn,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Delete this record"
    >
      <Ionicons name="trash-outline" size={17} color={RED} />
      <Text style={styles.deleteSecondaryText}>Delete this record</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Navigation Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            paddingLeft: Math.max(insets.left, screenPadding),
            paddingRight: Math.max(insets.right, screenPadding),
          },
        ]}
      >
        <View
          style={[
            styles.headerInner,
            isTablet && {
              maxWidth: ResponsiveLimits.maxDetailWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
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
            accessibilityRole="button"
            accessibilityLabel="Delete record"
          >
            <Ionicons name="trash-outline" size={18} color={RED} />
          </Pressable>
        </View>
      </View>

      {/* Content Scroll View */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: screenPadding,
            paddingBottom: Math.max(insets.bottom, 20) + 32,
          },
        ]}
      >
        <View
          style={[
            styles.contentContainer,
            isTablet && [
              styles.tabletSplitContainer,
              {
                maxWidth: ResponsiveLimits.maxDetailWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ],
          ]}
        >
          {isTablet ? (
            <>
              {/* Tablet Left Column: Overview + Attached Photo + Delete CTA */}
              <View style={styles.tabletColLeft}>
                {overviewCard}
                {attachmentCard}
                {deleteActionBtn}
              </View>

              {/* Tablet Right Column: Notes + AI Insights */}
              <View style={styles.tabletColRight}>
                {clinicalNotesCard}
                {aiInsightsCard}
              </View>
            </>
          ) : (
            <>
              {/* Phone Stacked Layout */}
              {overviewCard}
              {attachmentCard}
              {clinicalNotesCard}
              {aiInsightsCard}
              {deleteActionBtn}
            </>
          )}
        </View>
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

  /* Header */
  header: {
    backgroundColor: BG,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  /* Scroll Content & Layout */
  scrollContent: {
    paddingTop: 16,
  },
  contentContainer: {
    gap: 16,
  },
  tabletSplitContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  tabletColLeft: {
    flex: 1,
    gap: 16,
  },
  tabletColRight: {
    flex: 1.25,
    gap: 16,
  },

  /* Cards Common */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
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
    color: INK,
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
    color: INK,
  },

  /* Notes */
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

  /* AI Explanation Card */
  aiCard: {
    backgroundColor: BLUE,
    borderRadius: Radii.card,
    padding: 16,
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  aiHeaderTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: '#FFFFFF',
  },
  aiSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
    marginTop: 1,
  },
  aiActionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  aiActionBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13,
    color: '#111827',
    letterSpacing: 0.3,
  },
  aiResultWrapper: {
    gap: 10,
  },
  aiResultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  aiResultText: {
    fontFamily: 'LexendDeca-Regular',
    color: INK,
    lineHeight: 21,
  },
  aiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  aiDisclaimer: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 14,
  },
  aiReExplainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  aiReExplainText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* Delete CTA */
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
  },
  deleteSecondaryText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: RED,
  },
  attachmentBox: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FCFB',
  },
  attachmentImage: {
    width: '100%',
    height: 220,
    borderRadius: Radii.md,
  },
});