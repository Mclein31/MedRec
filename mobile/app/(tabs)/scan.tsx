import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import { PrivateModal as Modal } from '../../components/security/PrivateModal';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../lib/api';
import { SideMenuModal } from '../../components/menu/SideMenuModal';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { useNotifications } from '../../context/NotificationContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { DragHandle } from '../../components/ui/DragHandle';
import { Button } from '../../components/ui/Button';
import { Colors, Radii, Typography, ResponsiveLimits, LandscapeTokens } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { RECORD_TYPE_ASSETS, RECORD_TYPE_LABELS } from '../../constants/records';
import { formatDateLong } from '../../utils/dateUtils';

const formatDate = (dateStr: string) => formatDateLong(dateStr, dateStr, 'UTC');

const scanRecordKeyExtractor = (item: { id: string }) => item.id;

export type SharedRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  attachment_url?: string | null;
  attachmentUrl?: string | null;
  created_at?: string | null;
};

type SummaryData = {
  summary: string;
  currentMedications: string[];
  diagnoses: string[];
  keyNotes: string[];
};

/**
 * Direct file download helper that saves files to local device storage / opens native save sheet
 * with zero browser redirects.
 */
async function downloadFileDirectly(
  url: string,
  filename: string = 'medical-document',
  forcedExt?: string,
  forcedMime?: string
) {
  try {
    const ext = forcedExt || (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase().slice(0, 4);

    if (Platform.OS === 'web') {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`The download is unavailable (${response.status}). The sharing session may have expired.`);
      }
      const blob = await response.blob();
      const blobUrl = (window as any).URL.createObjectURL(blob);
      const a = (document as any).createElement('a');
      a.href = blobUrl;
      a.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      (window as any).URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      return;
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localUri = `${FileSystem.documentDirectory}${cleanFilename}_${Date.now()}.${ext}`;

    const downloadRes = await FileSystem.downloadAsync(url, localUri);
    if (downloadRes.status !== 200) {
      throw new Error(`Download failed with status ${downloadRes.status}`);
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      let mimeType = forcedMime;
      if (!mimeType) {
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'zip') mimeType = 'application/zip';
        else mimeType = 'image/jpeg';
      }

      let uti = 'public.jpeg';
      if (ext === 'pdf') uti = 'com.adobe.pdf';
      else if (ext === 'zip') uti = 'public.zip-archive';

      await Sharing.shareAsync(downloadRes.uri, {
        dialogTitle: `Save ${filename}`,
        mimeType,
        UTI: uti,
      });
    } else {
      Alert.alert('Download Complete', 'File saved to application documents.');
    }
  } catch (err: any) {
    console.error('Direct download error:', err);
    Alert.alert('Download Failed', err.message || 'Could not download file directly to phone.');
  }
}

// ============================================================================
// Lightbox Overlay with Separate Backdrop Darkening & Pop-up Zoom Animations
// ============================================================================
function ImageLightboxOverlay({
  visible,
  uri,
  title,
  type,
  onClose,
  onDownload,
}: {
  visible: boolean;
  uri: string | null;
  title: string;
  type: string;
  onClose: () => void;
  onDownload?: (uri: string, title: string) => void;
}) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.82)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropOpacity.setValue(0);
      contentScale.setValue(0.96);
      contentOpacity.setValue(0);

      // Instant high-speed pop-up transitions
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 0.96,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted || !uri) return null;

  return (
    <View style={styles.lightboxOverlayRoot} pointerEvents="box-none">
      {/* 1. Dark Backdrop (Fades in smoothly to darken background) */}
      <Animated.View
        style={[
          styles.lightboxBackdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss fullscreen view"
        />
      </Animated.View>

      {/* 2. Top Header Toolbar */}
      <Animated.View
        style={[
          styles.lightboxHeader,
          { opacity: contentOpacity },
        ]}
      >
        <View style={styles.lightboxHeaderLeft}>
          <Text style={styles.lightboxTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.lightboxSubtitle}>{type}</Text>
        </View>

        <View style={styles.lightboxHeaderActions}>
          {onDownload && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onDownload(uri, title);
              }}
              style={({ pressed }) => [styles.lightboxActionBtn, pressed && styles.pressed]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Download document"
            >
              <Ionicons name="download-outline" size={19} color="#FFFFFF" />
            </Pressable>
          )}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.lightboxCloseBtn, pressed && styles.pressed]}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Close full screen view"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Animated.View>

      {/* 3. Pop-up Image Content (Springs into view bigger) */}
      <Animated.View
        style={[
          styles.lightboxBody,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={styles.lightboxImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 4. Footer Hint */}
      <Animated.View
        style={[
          styles.lightboxFooter,
          { opacity: contentOpacity },
        ]}
      >
        <Text style={styles.lightboxFooterText}>Tap anywhere outside to close</Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Shared Record Detail Presentation (Image First-Class & Clear Metadata)
// ============================================================================
function SharedRecordDetailCard({
  record,
  scaleFont,
  onPressExpandImage,
  onDownloadFile,
}: {
  record: SharedRecord;
  scaleFont: (compact: number, normal: number, tablet: number) => number;
  onPressExpandImage?: (uri: string, title: string, type: string) => void;
  onDownloadFile?: (uri: string, title: string) => void;
}) {
  const attachmentUri = record.attachment_url || record.attachmentUrl;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const typeKey = (record.type || 'other').toLowerCase();
  const typeLabel = RECORD_TYPE_LABELS[typeKey] || record.type.charAt(0).toUpperCase() + record.type.slice(1);
  const typeAsset = RECORD_TYPE_ASSETS[typeKey] || require('../../assets/icons/folder.png');

  const handleOpenExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (attachmentUri) {
      if (onPressExpandImage) {
        onPressExpandImage(attachmentUri, record.title, typeLabel);
      } else {
        setLightboxOpen(true);
      }
    }
  };

  return (
    <View style={styles.detailContainer}>
      {/* 1. Shared Record Header / Doctor Context Badge */}
      <View style={styles.sharedContextBadge}>
        <View style={styles.sharedContextLeft}>
          <Image
            source={require('../../assets/icons/padlock.png')}
            style={styles.padlockIcon}
          />
          <View style={styles.sharedContextTextCol}>
            <Text style={styles.sharedContextTitle}>PATIENT-SHARED RECORD</Text>
            <Text style={styles.sharedContextSub}>Authorized temporary read-only clinical session</Text>
          </View>
        </View>
        <View style={styles.readOnlyPill}>
          <Image
            source={require('../../assets/icons/padlock.png')}
            style={styles.pillPadlockIcon}
          />
          <Text style={styles.readOnlyPillText}>Read-Only</Text>
        </View>
      </View>

      {/* 2. Medical Record Image Preview Container (FIRST-CLASS) */}
      {attachmentUri ? (
        <View style={styles.docContainerCard}>
          <View style={styles.docHeaderRow}>
            <View style={styles.docHeaderLeft}>
              <Image
                source={require('../../assets/icons/open-folder.png')}
                style={styles.docHeaderIcon}
              />
              <Text style={styles.docHeaderTitle}>CLINICAL DOCUMENT / SCAN</Text>
            </View>
            <View style={styles.docHeaderActions}>
              {onDownloadFile && (
                <Pressable
                  onPress={async () => {
                    Haptics.selectionAsync();
                    setDownloading(true);
                    try {
                      await onDownloadFile(attachmentUri, record.title);
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  disabled={downloading}
                  style={({ pressed }) => [styles.downloadSmallBtn, pressed && styles.pressed]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Download attached document"
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={Colors.teal} />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={13} color={Colors.teal} />
                      <Text style={styles.downloadSmallBtnText}>Save</Text>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={handleOpenExpand}
                style={({ pressed }) => [styles.expandBadge, pressed && styles.pressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Expand full screen document"
              >
                <Ionicons name="expand-outline" size={13} color={Colors.teal} />
                <Text style={styles.expandBadgeText}>Expand</Text>
              </Pressable>
            </View>
          </View>

          {/* Clean Image Preview: Tappable to Expand, NO overlay pill */}
          <Pressable
            onPress={handleOpenExpand}
            style={({ pressed }) => [styles.docImageBox, pressed && styles.docImageBoxPressed]}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Attached document for ${record.title}. Tap to expand.`}
          >
            {imageLoading && !imageError && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="small" color={Colors.teal} />
                <Text style={styles.imageLoadingText}>Loading medical scan...</Text>
              </View>
            )}

            {imageError ? (
              <View style={styles.imageErrorContainer}>
                <Ionicons name="alert-circle-outline" size={32} color={Colors.red} />
                <Text style={styles.imageErrorText}>Unable to load document preview</Text>
                <Text style={styles.imageErrorSub}>Check network connection or try reloading</Text>
              </View>
            ) : (
              <Image
                source={{ uri: attachmentUri }}
                style={styles.docImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.noDocCard}>
          <Image
            source={require('../../assets/icons/folder.png')}
            style={styles.noDocIcon}
          />
          <View style={styles.noDocTextCol}>
            <Text style={styles.noDocTitle}>No Document Scan Attached</Text>
            <Text style={styles.noDocSub}>
              This entry contains clinical notes and metadata without an attached image file.
            </Text>
          </View>
        </View>
      )}

      {/* 3. Record Metadata Overview Card */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewTopRow}>
          <View style={styles.typeBadge}>
            <Image source={typeAsset} style={styles.typeBadgeIcon} />
            <Text style={styles.typeBadgeText} maxFontSizeMultiplier={1.35}>
              {typeLabel}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.recordTitleText,
            { fontSize: scaleFont(20, 18, 22), lineHeight: scaleFont(26, 24, 28) },
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
                { fontSize: scaleFont(13, 12, 14.5) },
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
                Session Status
              </Text>
            </View>
            <Text
              style={[
                styles.metaValue,
                { fontSize: scaleFont(13, 12, 14.5) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Patient Verified
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Clinical Notes & Observations */}
      <View style={styles.notesCard}>
        <View style={styles.notesHeaderRow}>
          <Image
            source={require('../../assets/icons/open-folder.png')}
            style={styles.notesHeaderIcon}
          />
          <Text style={styles.notesSectionLabel}>CLINICAL NOTES & OBSERVATIONS</Text>
        </View>
        {record.description && record.description.trim() ? (
          <Text
            style={[
              styles.notesText,
              { fontSize: scaleFont(14, 13, 15.5) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            {record.description}
          </Text>
        ) : (
          <View style={styles.emptyNotesBox}>
            <Text style={styles.emptyNotesText}>No additional clinical notes recorded for this entry.</Text>
          </View>
        )}
      </View>

      {/* 5. Doctor Security & Read Only Notice */}
      <View style={styles.readOnlyNotice}>
        <Image
          source={require('../../assets/icons/padlock.png')}
          style={styles.readOnlyNoticeIcon}
        />
        <Text style={styles.readOnlyText} maxFontSizeMultiplier={1.35}>
          This medical record is shared with read-only access. It cannot be altered or permanently stored.
        </Text>
      </View>

      {/* Standalone Lightbox Overlay if rendered inline */}
      <ImageLightboxOverlay
        visible={lightboxOpen}
        uri={attachmentUri || null}
        title={record.title}
        type={typeLabel}
        onClose={() => setLightboxOpen(false)}
        onDownload={onDownloadFile}
      />
    </View>
  );
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SharedRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SharedRecord | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ uri: string; title: string; type: string } | null>(null);

  // Shared Records States
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [shareMetadata, setShareMetadata] = useState<{
    patientName?: string;
    sharedOn?: string;
    expiresAt?: string;
  } | null>(null);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [terminating, setTerminating] = useState(false);

  useEffect(() => {
    if (!activeShareToken || !shareMetadata?.expiresAt) return;
    const expiresAt = new Date(shareMetadata.expiresAt).getTime();
    const expire = () => {
      if (Date.now() < expiresAt) return;
      setRecords(null);
      setSelectedRecord(null);
      setLightboxImage(null);
      setActiveShareToken(null);
      setShareMetadata(null);
      setSummaryData(null);
      setSummaryModalVisible(false);
      setDownloadModalVisible(false);
      setScanned(false);
      setError('This sharing session has expired. Ask for a new QR code to continue.');
    };
    const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') expire(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [activeShareToken, shareMetadata?.expiresAt]);

  const { unreadCount, refreshNotifications } = useNotifications();
  const {
    isTablet,
    isLandscape,
    width,
    height,
    screenPadding,
    insets,
    scaleFont,
    tabBarClearance,
  } = useResponsive();

  const handleScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const trimmed = (data || '').trim();

    // 1. Check if payload is an offline Emergency Medical ID JSON placard
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.service === 'MedRec Emergency Medical ID') {
          const emergencyRecord: SharedRecord = {
            id: 'offline-emergency-id',
            type: 'consultation',
            title: `Emergency ID: ${parsed.name || 'Patient'}`,
            description: [
              `Age/DOB: ${parsed.age || 'Unknown'} (${parsed.dob || 'Unknown'})`,
              `Blood Type: ${parsed.bloodType || 'Unknown'}`,
              `Allergies: ${parsed.allergies || 'None reported'}`,
              `Conditions: ${parsed.conditions || 'None reported'}`,
              `Medications: ${parsed.medications || 'None reported'}`,
              `Organ Donor: ${parsed.organDonor || 'No'}`,
              `Emergency Contact: ${parsed.emergencyContact || 'None listed'}`,
            ].join('\n\n'),
            date: new Date().toISOString().split('T')[0],
          };
          setRecords([emergencyRecord]);
          setActiveShareToken(null);
          setShareMetadata({
            patientName: parsed.name || 'Emergency Patient',
            sharedOn: 'Offline Emergency ID',
          });
          setSelectedRecord(emergencyRecord);
          return;
        }
      }
    } catch {
      // Not JSON, continue to online token validation
    }

    // 2. Validate online share token format
    const tokenRegex = /^[A-Za-z0-9_-]{20,128}$/;
    if (!tokenRegex.test(trimmed)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Unrecognized QR code. Please align a valid MedRec Doctor Share QR or Emergency Medical ID.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.getSharedRecords(trimmed);
      setRecords(result.records);
      setActiveShareToken(trimmed);
      setShareMetadata({
        patientName: result.patient?.name || 'Patient',
        sharedOn: result.createdAt ? formatDateLong(result.createdAt, result.createdAt, 'UTC') : 'Today',
        expiresAt: result.expiresAt,
      });
      setSummaryData(null);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || 'Could not load records from QR code');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScanned(false);
    setRecords(null);
    setError(null);
    setSelectedRecord(null);
    setLightboxImage(null);
    setActiveShareToken(null);
    setShareMetadata(null);
    setSummaryData(null);
    setSummaryModalVisible(false);
    setDownloadModalVisible(false);
  };

  // ─── 1. SUMMARIZE SHARED RECORDS (BLUE AI BUTTON) ──────────────────────────
  const handleSummarize = async () => {
    if (!activeShareToken) {
      if (records && records.length > 0) {
        setSummaryData({
          summary: `Offline Emergency Medical Placard for ${shareMetadata?.patientName || 'Patient'}. Instant field triage record containing vital emergency contact and clinical indicators.`,
          currentMedications: [],
          diagnoses: [],
          keyNotes: [records[0].description || ''],
        });
        setSummaryModalVisible(true);
      }
      return;
    }

    setSummaryModalVisible(true);
    if (summaryData) return;

    setSummaryLoading(true);
    try {
      const data = await api.summarizeShared(activeShareToken);
      setSummaryData(data);
    } catch (err: any) {
      Alert.alert('Summary Error', err.message || 'Unable to generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // ─── 2. DIRECT DOWNLOAD TO PHONE (NO REDIRECTS) ───────────────────────────
  const handleDownloadFile = async (fileUri: string, title?: string) => {
    try {
      const record = records?.find(item => (item.attachment_url || item.attachmentUrl) === fileUri);
      if (!record || !activeShareToken) throw new Error('Open a valid sharing session before downloading.');
      const fresh = await api.downloadSharedRecord(activeShareToken, record.id);
      await downloadFileDirectly(fresh.downloadUrl, title || record.title || 'medical_record');
    } catch (error) {
      Alert.alert('Download unavailable', error instanceof Error ? error.message : 'Please scan an active QR code and try again.');
    }
  };

  const handleDownloadAllZip = async () => {
    if (!activeShareToken) return;
    setDownloadingZip(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const zipUrl = api.getSharedZipUrl(activeShareToken);
      const safePatient = (shareMetadata?.patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadFileDirectly(
        zipUrl,
        `MedRec_Records_${safePatient}`,
        'zip',
        'application/zip'
      );
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Unable to download records ZIP archive.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadAll = () => {
    if (!records || records.length === 0) return;
    setDownloadModalVisible(true);
  };

  // ─── 3. DONE — TERMINATE ACCESS ───────────────────────────────────────────
  const handleTerminate = () => {
    Alert.alert(
      'End Shared Access?',
      'You are about to end your access to the medical records shared with you. You will no longer be able to view or download these records unless the patient shares them with you again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Access',
          style: 'destructive',
          onPress: async () => {
            if (!activeShareToken) {
              reset();
              return;
            }
            setTerminating(true);
            try {
              await api.terminateShared(activeShareToken);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Access Terminated',
                'Your temporary access to these medical records has been successfully closed and revoked.'
              );
            } catch (err: any) {
              console.error('Termination error:', err);
            } finally {
              setTerminating(false);
              reset();
            }
          },
        },
      ]
    );
  };

  const viewfinderSize = Math.round(
    isLandscape
      ? Math.min(height * 0.5, 240)
      : Math.min(width * 0.68, height * 0.42, 280)
  );

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.root,
          isTablet && isLandscape && { paddingLeft: LandscapeTokens.navRailWidth },
        ]}
      >
        <StatusBar style="dark" />
        <ScreenHeader
          title="Scan Doctor QR"
          subtitle="Scan temporary patient records"
          onPressMenu={!(isTablet && isLandscape) ? () => setMenuVisible(true) : undefined}
          onPressNotifications={() => {
            refreshNotifications();
            setNotificationsVisible(true);
          }}
          unreadCount={unreadCount}
        />
        <View style={[styles.permissionContainer, { paddingHorizontal: screenPadding }]}>
          <Image
            source={require('../../assets/icons/scan-active.png')}
            style={styles.permissionIcon}
          />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionSub}>
            To scan a patient&apos;s QR code, MedRec needs permission to use your camera.
          </Text>
          <Button
            label="Grant Camera Access"
            onPress={requestPermission}
            style={styles.grantBtn}
          />
        </View>

        <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
        <NotificationCenterModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </View>
    );
  }

  if (records || error) {
    const activeTabletRecord = selectedRecord || (records && records.length > 0 ? records[0] : null);

    // ─── TABLET MASTER-DETAIL WORKSPACE (Shared Records) ───────────────────
    if (isTablet) {
      return (
        <View
          style={[
            styles.root,
            isLandscape && { paddingLeft: LandscapeTokens.navRailWidth },
          ]}
        >
          <StatusBar style="dark" />

          {/* Global Navigation Toolbar */}
          <View
            style={[
              styles.topToolbar,
              {
                paddingTop: insets.top + 12,
                paddingLeft: Math.max(insets.left, screenPadding),
                paddingRight: Math.max(insets.right, screenPadding),
              },
              isLandscape && { justifyContent: 'flex-end' },
            ]}
          >
            {!isLandscape && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setMenuVisible(true);
                }}
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
              >
                <Image
                  source={require('../../assets/icons/burger-menu.png')}
                  style={styles.toolbarIcon}
                />
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                refreshNotifications();
                setNotificationsVisible(true);
              }}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
            >
              <Image
                source={require('../../assets/icons/notification-bell.png')}
                style={styles.toolbarIcon}
              />
              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </Pressable>
          </View>

          <ScreenHeader
            title={error ? 'Scan Error' : 'Shared Records'}
            subtitle={
              error
                ? 'Could not load records from QR code'
                : `${records?.length || 0} record${records?.length !== 1 ? 's' : ''} shared by patient`
            }
            hideToolbar={true}
          />

          {error && (
            <View
              style={[
                styles.errorCard,
                { marginHorizontal: screenPadding, maxWidth: 920, alignSelf: 'center', width: '100%' },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={20} color={Colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Session Overview Header with BLUE AI Summarize button */}
          {!error && (
            <View
              style={[
                styles.sessionHeaderCard,
                { marginHorizontal: screenPadding, maxWidth: 920, alignSelf: 'center', width: '100%', marginBottom: 16 },
              ]}
            >
              <View style={styles.sessionHeaderTop}>
                <Image
                  source={require('../../assets/icons/person.png')}
                  style={styles.patientAvatarIcon}
                />
                <View style={styles.sessionPatientCol}>
                  <Text style={styles.sessionPatientName} numberOfLines={1}>
                    Shared by: <Text style={styles.boldInk}>{shareMetadata?.patientName || 'Patient'}</Text>
                  </Text>
                  <Text style={styles.sessionSharedDate}>
                    Shared on: {shareMetadata?.sharedOn || 'Active Session'}
                  </Text>
                </View>
                <View style={styles.activeStatusBadge}>
                  <View style={styles.activeStatusDot} />
                  <Text style={styles.activeStatusText}>Active</Text>
                </View>
              </View>

              <View style={styles.sessionActionsRow}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleSummarize();
                  }}
                  style={({ pressed }) => [styles.actionBtnAi, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Summarize all shared records with AI"
                >
                  <Image
                    source={require('../../assets/icons/AI.png')}
                    style={styles.actionAiIcon}
                  />
                  <Text style={styles.actionBtnAiText}>Summarize Records</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    handleDownloadAll();
                  }}
                  style={({ pressed }) => [styles.actionBtnSecondary, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Download all records as zip"
                >
                  <Ionicons name="cloud-download-outline" size={15} color={Colors.tealDark} />
                  <Text style={styles.actionBtnSecondaryText}>Download (.ZIP)</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.tabletScanContainer}>
            {/* Left Master Column: Shared Records List */}
            <View style={styles.tabletScanColLeft}>
              <Text style={styles.sectionTitle}>
                Authorized Patient Records ({records?.length || 0})
              </Text>

              <FlatList
                data={records || []}
                keyExtractor={scanRecordKeyExtractor}
                contentContainerStyle={[
                  styles.tabletScanListContent,
                  { paddingBottom: Math.max(insets.bottom, 24) + 120 },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Image
                      source={require('../../assets/icons/folder.png')}
                      style={[styles.noDocIcon, { opacity: 0.5 }]}
                    />
                    <Text style={styles.emptyText}>No records in this share session</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = activeTabletRecord?.id === item.id;
                  const itemHasDoc = Boolean(item.attachment_url || item.attachmentUrl);
                  const itemAsset = RECORD_TYPE_ASSETS[item.type.toLowerCase()] || require('../../assets/icons/folder.png');
                  return (
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedRecord(item);
                      }}
                      style={[
                        styles.recordCard,
                        isActive && styles.recordCardActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}, ${item.type}, ${formatDate(item.date)}`}
                    >
                      <View style={styles.recordTopRow}>
                        <Image
                          source={itemAsset}
                          style={styles.recordItemAssetIcon}
                        />
                        <View style={styles.recordContent}>
                          <Text
                            style={[
                              styles.recordTitle,
                              { fontSize: scaleFont(14, 13, 15.5) },
                            ]}
                            numberOfLines={2}
                            maxFontSizeMultiplier={1.35}
                          >
                            {item.title}
                          </Text>
                          <View style={styles.recordMetaRow}>
                            <Text style={styles.typePillText}>
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.recordMetaDate}>{formatDate(item.date)}</Text>
                            {itemHasDoc && (
                              <>
                                <Text style={styles.metaDot}>•</Text>
                                <Ionicons name="document-attach" size={12} color={Colors.teal} />
                              </>
                            )}
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={isActive ? Colors.teal : Colors.muted}
                        />
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>

            {/* Right Detail Column: Selected Record Inline View */}
            <View style={styles.tabletScanColRight}>
              {activeTabletRecord ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.tabletScanDetailScroll,
                    { paddingBottom: Math.max(insets.bottom, 24) + 120 },
                  ]}
                >
                  <SharedRecordDetailCard
                    record={activeTabletRecord}
                    scaleFont={scaleFont}
                    onPressExpandImage={(uri, title, type) => setLightboxImage({ uri, title, type })}
                    onDownloadFile={handleDownloadFile}
                  />
                </ScrollView>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Select a record to view details</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Floating Bar: Done - Terminate Access */}
          <View
            style={[
              styles.bottomSessionBar,
              {
                paddingBottom: Math.max(insets.bottom, 16) + (isLandscape ? 16 : 80),
                paddingHorizontal: screenPadding,
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={handleTerminate}
              style={({ pressed }) => [styles.terminateBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Done - Terminate Access"
            >
              {terminating ? (
                <ActivityIndicator size="small" color={Colors.red} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={Colors.red} />
                  <Text style={styles.terminateBtnText}>Done — Terminate Access</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Lightbox Overlay */}
          <ImageLightboxOverlay
            visible={lightboxImage !== null}
            uri={lightboxImage?.uri || null}
            title={lightboxImage?.title || ''}
            type={lightboxImage?.type || ''}
            onClose={() => setLightboxImage(null)}
            onDownload={handleDownloadFile}
          />

          {/* Summary Modal */}
          <Modal
            visible={summaryModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSummaryModalVisible(false)}
          >
            <View style={styles.modalRoot}>
              <View style={styles.modalHeader}>
                <DragHandle />
                <View style={styles.modalHeaderRow}>
                  <View style={styles.summaryTitleRow}>
                    <Image
                      source={require('../../assets/icons/AI.png')}
                      style={styles.summaryTitleIcon}
                    />
                    <Text style={styles.modalHeaderTitle}>Clinical Summary</Text>
                  </View>
                  <Pressable
                    onPress={() => setSummaryModalVisible(false)}
                    hitSlop={10}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.ink} />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={[
                  styles.modalScroll,
                  { paddingBottom: Math.max(insets.bottom, 24) + 20 },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {summaryLoading ? (
                  <View style={styles.summaryLoadingBox}>
                    <ActivityIndicator size="large" color={Colors.blue} />
                    <Text style={styles.summaryLoadingTitle}>Synthesizing Records...</Text>
                    <Text style={styles.summaryLoadingSub}>
                      Analyzing all shared clinical records, lab results, and consultations.
                    </Text>
                  </View>
                ) : summaryData ? (
                  <View style={styles.summaryContentWrapper}>
                    <View style={styles.summarySectionCard}>
                      <Text style={styles.summarySectionHeader}>RECORD SET OVERVIEW</Text>
                      <Text style={styles.summaryOverviewText}>{summaryData.summary}</Text>
                    </View>

                    {summaryData.currentMedications && summaryData.currentMedications.length > 0 && (
                      <View style={styles.summarySectionCard}>
                        <View style={styles.summarySectionTitleRow}>
                          <Image
                            source={require('../../assets/icons/prescription.png')}
                            style={styles.sectionAssetIcon}
                          />
                          <Text style={styles.summarySectionHeader}>MEDICATIONS MENTIONED</Text>
                        </View>
                        {summaryData.currentMedications.map((med, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{med}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {summaryData.diagnoses && summaryData.diagnoses.length > 0 && (
                      <View style={styles.summarySectionCard}>
                        <View style={styles.summarySectionTitleRow}>
                          <Image
                            source={require('../../assets/icons/diagnosis.png')}
                            style={styles.sectionAssetIcon}
                          />
                          <Text style={styles.summarySectionHeader}>DIAGNOSES & FINDINGS</Text>
                        </View>
                        {summaryData.diagnoses.map((diag, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{diag}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {summaryData.keyNotes && summaryData.keyNotes.length > 0 && (
                      <View style={styles.summarySectionCard}>
                        <View style={styles.summarySectionTitleRow}>
                          <Image
                            source={require('../../assets/icons/open-folder.png')}
                            style={styles.sectionAssetIcon}
                          />
                          <Text style={styles.summarySectionHeader}>KEY TIMELINE & NOTES</Text>
                        </View>
                        {summaryData.keyNotes.map((note, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{note}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.summaryDisclaimerCard}>
                      <Ionicons name="information-circle-outline" size={18} color={Colors.muted} />
                      <Text style={styles.summaryDisclaimerText}>
                        This summary is synthesized directly from authorized patient records for organizational reference and does not constitute medical advice or a clinical diagnosis.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>No summary available.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Modal>

          {/* Download Records Modal */}
          <Modal
            visible={downloadModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setDownloadModalVisible(false)}
          >
            <View style={styles.modalRoot}>
              <View style={styles.modalHeader}>
                <DragHandle />
                <View style={styles.modalHeaderRow}>
                  <View style={styles.summaryTitleRow}>
                    <Image
                      source={require('../../assets/icons/open-folder.png')}
                      style={styles.summaryTitleIcon}
                    />
                    <Text style={styles.modalHeaderTitle}>Download Shared Records</Text>
                  </View>
                  <Pressable
                    onPress={() => setDownloadModalVisible(false)}
                    hitSlop={10}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.ink} />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={[
                  styles.modalScroll,
                  { paddingBottom: Math.max(insets.bottom, 24) + 20 },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Primary Zip Archive Download Banner */}
                <View style={styles.zipBundleCard}>
                  <View style={styles.zipBundleHeader}>
                    <View style={styles.zipIconBox}>
                      <Ionicons name="folder-open" size={22} color={Colors.teal} />
                    </View>
                    <View style={styles.zipHeaderTextGroup}>
                      <Text style={styles.zipCardTitle}>Download All as ZIP Archive</Text>
                      <Text style={styles.zipCardSubtitle}>
                        Complete clinical package with summary report &amp; {records?.length || 0} medical records
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleDownloadAllZip}
                    disabled={downloadingZip}
                    style={({ pressed }) => [
                      styles.zipDownloadBtn,
                      pressed && styles.pressed,
                      downloadingZip && { opacity: 0.75 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Download all shared records as zip archive"
                  >
                    {downloadingZip ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.zipDownloadBtnText}>Download All Records (.ZIP)</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {/* Section Divider & Individual Files */}
                {records && records.some((r) => r.attachment_url || r.attachmentUrl) && (
                  <>
                    <View style={styles.downloadDividerRow}>
                      <View style={styles.downloadDividerLine} />
                      <Text style={styles.downloadDividerText}>OR SAVE INDIVIDUAL DOCUMENTS</Text>
                      <View style={styles.downloadDividerLine} />
                    </View>

                    {records
                      .filter((r) => r.attachment_url || r.attachmentUrl)
                      .map((rec) => {
                        const itemAsset = RECORD_TYPE_ASSETS[rec.type.toLowerCase()] || require('../../assets/icons/folder.png');
                        return (
                          <View key={rec.id} style={styles.downloadItemCard}>
                            <View style={styles.downloadItemLeft}>
                              <Image
                                source={itemAsset}
                                style={styles.downloadItemAssetIcon}
                              />
                              <View style={styles.downloadItemTextCol}>
                                <Text style={styles.downloadItemTitle} numberOfLines={1}>
                                  {rec.title}
                                </Text>
                                <Text style={styles.downloadItemSub}>
                                  {rec.type.toUpperCase()} • {formatDate(rec.date)}
                                </Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() => handleDownloadFile((rec.attachment_url || rec.attachmentUrl)!, rec.title)}
                              style={({ pressed }) => [styles.downloadActionBtn, pressed && styles.pressed]}
                              hitSlop={8}
                            >
                              <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                              <Text style={styles.downloadActionBtnText}>Save File</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                  </>
                )}
              </ScrollView>
            </View>
          </Modal>

          <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
          <NotificationCenterModal
            visible={notificationsVisible}
            onClose={() => setNotificationsVisible(false)}
          />
        </View>
      );
    }

    // ─── PHONE VIEW (Shared Records & Redesigned Detail Modal) ───────────────
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenHeader
          title={error ? 'Scan Error' : 'Shared Records'}
          subtitle={
            error
              ? 'Could not load records from QR code'
              : `${records?.length || 0} record${records?.length !== 1 ? 's' : ''} shared by patient`
          }
          onPressMenu={() => setMenuVisible(true)}
          onPressNotifications={() => {
            refreshNotifications();
            setNotificationsVisible(true);
          }}
          unreadCount={unreadCount}
        />

        {error && (
          <View
            style={[
              styles.errorCard,
              { marginHorizontal: screenPadding },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={20} color={Colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={records || []}
          keyExtractor={scanRecordKeyExtractor}
          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal: screenPadding,
              paddingBottom: Math.max(insets.bottom, 20) + tabBarClearance + 90,
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !error ? (
              <View style={styles.sessionHeaderCard}>
                <View style={styles.sessionHeaderTop}>
                  <Image
                    source={require('../../assets/icons/person.png')}
                    style={styles.patientAvatarIcon}
                  />
                  <View style={styles.sessionPatientCol}>
                    <Text style={styles.sessionPatientName} numberOfLines={1}>
                      Shared by: <Text style={styles.boldInk}>{shareMetadata?.patientName || 'Patient'}</Text>
                    </Text>
                    <Text style={styles.sessionSharedDate}>
                      Shared on: {shareMetadata?.sharedOn || 'Active Session'}
                    </Text>
                  </View>
                  <View style={styles.activeStatusBadge}>
                    <View style={styles.activeStatusDot} />
                    <Text style={styles.activeStatusText}>Active</Text>
                  </View>
                </View>

                {/* Top Action Buttons: BLUE Summarize Records & Download Records */}
                <View style={styles.sessionActionsRow}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleSummarize();
                    }}
                    style={({ pressed }) => [styles.actionBtnAi, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Summarize all shared records with AI"
                  >
                    <Image
                      source={require('../../assets/icons/AI.png')}
                      style={styles.actionAiIcon}
                    />
                    <Text style={styles.actionBtnAiText}>Summarize Records</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleDownloadAll();
                    }}
                    style={({ pressed }) => [styles.actionBtnSecondary, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Download all records as zip"
                  >
                    <Ionicons name="cloud-download-outline" size={15} color={Colors.tealDark} />
                    <Text style={styles.actionBtnSecondaryText}>Download (.ZIP)</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Image
                source={require('../../assets/icons/folder.png')}
                style={[styles.noDocIcon, { opacity: 0.5 }]}
              />
              <Text style={styles.emptyText}>No records in this share session</Text>
            </View>
          }
          renderItem={({ item }) => {
            const itemHasDoc = Boolean(item.attachment_url || item.attachmentUrl);
            const itemAsset = RECORD_TYPE_ASSETS[item.type.toLowerCase()] || require('../../assets/icons/folder.png');
            return (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedRecord(item);
                }}
                style={({ pressed }) => [styles.recordCard, pressed && styles.cardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.type}, ${formatDate(item.date)}`}
              >
                <View style={styles.recordTopRow}>
                  <Image
                    source={itemAsset}
                    style={styles.recordItemAssetIcon}
                  />
                  <View style={styles.recordContent}>
                    <Text
                      style={[
                        styles.recordTitle,
                        { fontSize: scaleFont(14.5, 13.5, 16) },
                      ]}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.35}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.recordMetaRow}>
                      <Text style={styles.typePillText}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.recordMetaDate}>{formatDate(item.date)}</Text>
                      {itemHasDoc && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Ionicons name="document-attach" size={13} color={Colors.teal} />
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
                </View>
              </Pressable>
            );
          }}
        />

        {/* Bottom Floating Bar: Done - Terminate Access */}
        <View
          style={[
            styles.bottomSessionBar,
            {
              paddingBottom: Math.max(insets.bottom, 12) + (isTablet ? 90 : 70),
              paddingHorizontal: screenPadding,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleTerminate}
            style={({ pressed }) => [styles.terminateBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Done - Terminate Access"
          >
            {terminating ? (
              <ActivityIndicator size="small" color={Colors.red} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={Colors.red} />
                <Text style={styles.terminateBtnText}>Done — Terminate Access</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Record Detail Modal */}
        <Modal
          visible={selectedRecord !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setLightboxImage(null);
            setSelectedRecord(null);
          }}
        >
          {selectedRecord && (
            <View style={styles.modalRoot}>
              <View style={styles.modalContentWrapper}>
                <View style={styles.modalHeader}>
                  <DragHandle />
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalHeaderTitle}>Shared Record Details</Text>
                    <Pressable
                      onPress={() => {
                        setLightboxImage(null);
                        setSelectedRecord(null);
                      }}
                      hitSlop={10}
                      style={styles.modalCloseBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Close record modal"
                    >
                      <Ionicons name="close" size={20} color={Colors.ink} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView
                  contentContainerStyle={[
                    styles.modalScroll,
                    { paddingBottom: Math.max(insets.bottom, 20) + 24 },
                  ]}
                  showsVerticalScrollIndicator={false}
                >
                  <SharedRecordDetailCard
                    record={selectedRecord}
                    scaleFont={scaleFont}
                    onPressExpandImage={(uri, title, type) => setLightboxImage({ uri, title, type })}
                    onDownloadFile={handleDownloadFile}
                  />
                </ScrollView>

                {/* Lightbox Pop-up Overlay inside pageSheet modal */}
                <ImageLightboxOverlay
                  visible={lightboxImage !== null}
                  uri={lightboxImage?.uri || null}
                  title={lightboxImage?.title || ''}
                  type={lightboxImage?.type || ''}
                  onClose={() => setLightboxImage(null)}
                  onDownload={handleDownloadFile}
                />
              </View>
            </View>
          )}
        </Modal>

        {/* Summary Modal */}
        <Modal
          visible={summaryModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSummaryModalVisible(false)}
        >
          <View style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <DragHandle />
              <View style={styles.modalHeaderRow}>
                <View style={styles.summaryTitleRow}>
                  <Image
                    source={require('../../assets/icons/AI.png')}
                    style={styles.summaryTitleIcon}
                  />
                  <Text style={styles.modalHeaderTitle}>Clinical Summary</Text>
                </View>
                <Pressable
                  onPress={() => setSummaryModalVisible(false)}
                  hitSlop={10}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={Colors.ink} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.modalScroll,
                { paddingBottom: Math.max(insets.bottom, 24) + 20 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {summaryLoading ? (
                <View style={styles.summaryLoadingBox}>
                  <ActivityIndicator size="large" color={Colors.blue} />
                  <Text style={styles.summaryLoadingTitle}>Synthesizing Records...</Text>
                  <Text style={styles.summaryLoadingSub}>
                    Analyzing all shared clinical records, lab results, and consultations.
                  </Text>
                </View>
              ) : summaryData ? (
                <View style={styles.summaryContentWrapper}>
                  <View style={styles.summarySectionCard}>
                    <Text style={styles.summarySectionHeader}>RECORD SET OVERVIEW</Text>
                    <Text style={styles.summaryOverviewText}>{summaryData.summary}</Text>
                  </View>

                  {summaryData.currentMedications && summaryData.currentMedications.length > 0 && (
                    <View style={styles.summarySectionCard}>
                      <View style={styles.summarySectionTitleRow}>
                        <Image
                          source={require('../../assets/icons/prescription.png')}
                          style={styles.sectionAssetIcon}
                        />
                        <Text style={styles.summarySectionHeader}>MEDICATIONS MENTIONED</Text>
                      </View>
                      {summaryData.currentMedications.map((med, idx) => (
                        <View key={idx} style={styles.bulletItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{med}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {summaryData.diagnoses && summaryData.diagnoses.length > 0 && (
                    <View style={styles.summarySectionCard}>
                      <View style={styles.summarySectionTitleRow}>
                        <Image
                          source={require('../../assets/icons/diagnosis.png')}
                          style={styles.sectionAssetIcon}
                        />
                        <Text style={styles.summarySectionHeader}>DIAGNOSES & FINDINGS</Text>
                      </View>
                      {summaryData.diagnoses.map((diag, idx) => (
                        <View key={idx} style={styles.bulletItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{diag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {summaryData.keyNotes && summaryData.keyNotes.length > 0 && (
                    <View style={styles.summarySectionCard}>
                      <View style={styles.summarySectionTitleRow}>
                        <Image
                          source={require('../../assets/icons/open-folder.png')}
                          style={styles.sectionAssetIcon}
                        />
                        <Text style={styles.summarySectionHeader}>KEY TIMELINE & NOTES</Text>
                      </View>
                      {summaryData.keyNotes.map((note, idx) => (
                        <View key={idx} style={styles.bulletItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{note}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.summaryDisclaimerCard}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.muted} />
                    <Text style={styles.summaryDisclaimerText}>
                      This summary is synthesized directly from authorized patient records for organizational reference and does not constitute medical advice or a clinical diagnosis.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No summary available.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Download Records Modal */}
        <Modal
          visible={downloadModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setDownloadModalVisible(false)}
        >
          <View style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <DragHandle />
              <View style={styles.modalHeaderRow}>
                <View style={styles.summaryTitleRow}>
                  <Image
                    source={require('../../assets/icons/open-folder.png')}
                    style={styles.summaryTitleIcon}
                  />
                  <Text style={styles.modalHeaderTitle}>Download Shared Records</Text>
                </View>
                <Pressable
                  onPress={() => setDownloadModalVisible(false)}
                  hitSlop={10}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={Colors.ink} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.modalScroll,
                { paddingBottom: Math.max(insets.bottom, 24) + 20 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Primary Zip Archive Download Banner */}
              <View style={styles.zipBundleCard}>
                <View style={styles.zipBundleHeader}>
                  <View style={styles.zipIconBox}>
                    <Ionicons name="folder-open" size={22} color={Colors.teal} />
                  </View>
                  <View style={styles.zipHeaderTextGroup}>
                    <Text style={styles.zipCardTitle}>Download All as ZIP Archive</Text>
                    <Text style={styles.zipCardSubtitle}>
                      Complete clinical package with summary report &amp; {records?.length || 0} medical records
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleDownloadAllZip}
                  disabled={downloadingZip}
                  style={({ pressed }) => [
                    styles.zipDownloadBtn,
                    pressed && styles.pressed,
                    downloadingZip && { opacity: 0.75 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Download all shared records as zip archive"
                >
                  {downloadingZip ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={17} color="#FFFFFF" />
                      <Text style={styles.zipDownloadBtnText}>Download All Records (.ZIP)</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Section Divider & Individual Files */}
              {records && records.some((r) => r.attachment_url || r.attachmentUrl) && (
                <>
                  <View style={styles.downloadDividerRow}>
                    <View style={styles.downloadDividerLine} />
                    <Text style={styles.downloadDividerText}>OR SAVE INDIVIDUAL DOCUMENTS</Text>
                    <View style={styles.downloadDividerLine} />
                  </View>

                  {records
                    .filter((r) => r.attachment_url || r.attachmentUrl)
                    .map((rec) => {
                      const itemAsset = RECORD_TYPE_ASSETS[rec.type.toLowerCase()] || require('../../assets/icons/folder.png');
                      return (
                        <View key={rec.id} style={styles.downloadItemCard}>
                          <View style={styles.downloadItemLeft}>
                            <Image
                              source={itemAsset}
                              style={styles.downloadItemAssetIcon}
                            />
                            <View style={styles.downloadItemTextCol}>
                              <Text style={styles.downloadItemTitle} numberOfLines={1}>
                                {rec.title}
                              </Text>
                              <Text style={styles.downloadItemSub}>
                                {rec.type.toUpperCase()} • {formatDate(rec.date)}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => handleDownloadFile((rec.attachment_url || rec.attachmentUrl)!, rec.title)}
                            style={({ pressed }) => [styles.downloadActionBtn, pressed && styles.pressed]}
                            hitSlop={8}
                          >
                            <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.downloadActionBtnText}>Save File</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                </>
              )}
            </ScrollView>
          </View>
        </Modal>

        <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
        <NotificationCenterModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.cameraRoot,
        isTablet && isLandscape && { paddingLeft: LandscapeTokens.navRailWidth },
      ]}
    >
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScanned}
      />

      {/* Top Floating Controls */}
      <View
        style={[
          styles.cameraTopBar,
          {
            paddingTop: insets.top + 12,
            paddingLeft: Math.max(insets.left, screenPadding),
            paddingRight: Math.max(insets.right, screenPadding),
          },
          isTablet && isLandscape && { justifyContent: 'flex-end' },
        ]}
      >
        {!(isTablet && isLandscape) && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setMenuVisible(true);
            }}
            hitSlop={10}
            style={styles.cameraIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <Image
              source={require('../../assets/icons/burger-menu.png')}
              style={styles.cameraToolbarIcon}
            />
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            refreshNotifications();
            setNotificationsVisible(true);
          }}
          hitSlop={10}
          style={styles.cameraIconBtn}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
        >
          <Image
            source={require('../../assets/icons/notification-bell.png')}
            style={styles.cameraToolbarIcon}
          />
          {unreadCount > 0 && <View style={styles.cameraNotificationDot} />}
        </Pressable>
      </View>

      {/* Center Viewfinder & Instructions */}
      <View style={styles.scanOverlay}>
        <View style={styles.scanHeaderBox}>
          <Text
            style={[
              styles.scanTitle,
              { fontSize: scaleFont(19, 18, 22) },
            ]}
          >
            Scan Patient QR Code
          </Text>
          <Text
            style={[
              styles.scanSub,
              { fontSize: scaleFont(13, 12, 14.5), maxWidth: viewfinderSize * 1.15 },
            ]}
          >
            Align the QR code within the frame to access authorized medical records.
          </Text>
        </View>

        <View style={[styles.viewfinder, { width: viewfinderSize, height: viewfinderSize }]}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {loading && (
            <View style={styles.scanLoading}>
              <ActivityIndicator size="large" color={Colors.teal} />
              <Text style={styles.scanLoadingText}>Loading shared records...</Text>
            </View>
          )}
        </View>
      </View>

      <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
  },
  pressed: {
    opacity: 0.7,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
    tintColor: Colors.teal,
    marginBottom: 4,
  },
  permissionTitle: {
    ...Typography.title1,
    color: Colors.ink,
    textAlign: 'center',
  },
  permissionSub: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  grantBtn: {
    marginTop: 8,
    width: '100%',
    maxWidth: 280,
  },
  list: {
    paddingTop: 8,
    gap: 12,
  },
  recordCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardPressed: {
    backgroundColor: Colors.border,
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordItemAssetIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  recordContent: {
    flex: 1,
    gap: 3,
  },
  recordTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    color: Colors.ink,
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePillText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12,
    color: Colors.teal,
  },
  metaDot: {
    fontSize: 10,
    color: Colors.muted,
  },
  recordMetaDate: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: Colors.muted,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.muted,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.redLight,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.red,
    flex: 1,
  },

  /* ────────────────────────────────────────────────────────
     SESSION CONTEXT HEADER & TOP ACTIONS
  ──────────────────────────────────────────────────────── */
  sessionHeaderCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 4,
  },
  sessionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientAvatarIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  sessionPatientCol: {
    flex: 1,
    gap: 2,
  },
  sessionPatientName: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: Colors.muted,
  },
  boldInk: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.ink,
  },
  sessionSharedDate: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6F8F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C3EFE4',
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.teal,
  },
  activeStatusText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: Colors.tealDark,
  },
  sessionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  /* BLUE AI SUMMARIZE BUTTON (MATCHING OTHER TABS) */
  actionBtnAi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.blue,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  actionAiIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  actionBtnAiText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3FAF8',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBEBE3',
  },
  actionBtnSecondaryText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: Colors.tealDark,
  },

  /* BOTTOM SESSION BAR (TERMINATE ACCESS) */
  bottomSessionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    zIndex: 100,
  },
  terminateBtn: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD4D4',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  terminateBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13.5,
    color: Colors.red,
  },

  /* ────────────────────────────────────────────────────────
     SHARED RECORD REDESIGN & DETAIL VIEW STYLES
  ──────────────────────────────────────────────────────── */
  detailContainer: {
    gap: 16,
    position: 'relative',
  },
  sharedContextBadge: {
    backgroundColor: '#EDF8F5',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#CBEBE3',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sharedContextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  padlockIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  sharedContextTextCol: {
    flex: 1,
    gap: 2,
  },
  sharedContextTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11,
    color: Colors.tealDark,
    letterSpacing: 0.5,
  },
  sharedContextSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: Colors.muted,
  },
  readOnlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4ECE6',
  },
  pillPadlockIcon: {
    width: 11,
    height: 11,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  readOnlyPillText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 10.5,
    color: Colors.teal,
  },

  /* FIRST-CLASS DOCUMENT CONTAINER */
  docContainerCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docHeaderIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  docHeaderTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11.5,
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  docHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF7F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3EFE8',
  },
  downloadSmallBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: Colors.teal,
  },
  expandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF7F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: Colors.teal,
  },
  docImageBox: {
    height: 250,
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E6EFEF',
  },
  docImageBoxPressed: {
    opacity: 0.9,
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageLoadingText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: Colors.muted,
  },
  imageErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  imageErrorText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: Colors.red,
    textAlign: 'center',
  },
  imageErrorSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
    textAlign: 'center',
  },

  /* EMPTY DOCUMENT STATE */
  noDocCard: {
    backgroundColor: '#F9FCFB',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#E6ECEB',
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noDocIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: Colors.muted,
    opacity: 0.7,
  },
  noDocTextCol: {
    flex: 1,
    gap: 2,
  },
  noDocTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: Colors.ink,
  },
  noDocSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
    lineHeight: 16,
  },

  /* RECORD METADATA OVERVIEW */
  overviewCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDF8F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.md,
  },
  typeBadgeIcon: {
    width: 15,
    height: 15,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  typeBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12,
    color: Colors.teal,
  },
  recordTitleText: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCol: {
    flex: 1,
    gap: 4,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  metaLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
  },
  metaValue: {
    fontFamily: 'LexendDeca-SemiBold',
    color: Colors.ink,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },

  /* CLINICAL NOTES CARD */
  notesCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesHeaderIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  notesSectionLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11.5,
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  notesText: {
    ...Typography.body,
    color: Colors.ink,
    lineHeight: 21,
  },
  emptyNotesBox: {
    paddingVertical: 6,
  },
  emptyNotesText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12.5,
    color: Colors.muted,
    fontStyle: 'italic',
  },

  /* SECURITY NOTICE */
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1FAF8',
    padding: 14,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#D7EDE7',
  },
  readOnlyNoticeIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  readOnlyText: {
    ...Typography.caption,
    color: Colors.tealDark,
    flex: 1,
    lineHeight: 18,
  },

  /* LIGHTBOX OVERLAY (SEPARATE ANIMATIONS & DARK BACKDROP) */
  lightboxOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 15, 18, 0.94)',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 12,
    zIndex: 100,
  },
  lightboxHeaderLeft: {
    flex: 1,
    gap: 2,
    marginRight: 16,
  },
  lightboxTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  lightboxSubtitle: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  lightboxHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lightboxActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 50,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    zIndex: 10,
  },
  lightboxFooterText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  /* SUMMARY & DOWNLOAD MODAL STYLES */
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitleIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: Colors.blue,
  },
  summaryLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  summaryLoadingTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 17,
    color: Colors.ink,
  },
  summaryLoadingSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  summaryContentWrapper: {
    gap: 14,
  },
  summarySectionCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  summarySectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionAssetIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  summarySectionHeader: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11.5,
    color: Colors.tealDark,
    letterSpacing: 0.5,
  },
  summaryOverviewText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 22,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.teal,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13.5,
    color: Colors.ink,
    lineHeight: 20,
  },
  summaryDisclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FCFB',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#E2EFEA',
    padding: 14,
  },
  summaryDisclaimerText: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
    lineHeight: 17,
  },

  /* DOWNLOAD MODAL ITEMS & ZIP BUNDLE */
  zipBundleCard: {
    backgroundColor: '#F0F9F7',
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: '#C0E5DC',
    padding: 16,
    gap: 14,
    marginBottom: 8,
  },
  zipBundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zipIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4ECE6',
  },
  zipHeaderTextGroup: {
    flex: 1,
    gap: 2,
  },
  zipCardTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14.5,
    color: Colors.ink,
  },
  zipCardSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
    lineHeight: 16,
  },
  zipDownloadBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radii.button,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  zipDownloadBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  downloadDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  downloadDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4ECE9',
  },
  downloadDividerText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    color: Colors.muted,
    letterSpacing: 0.6,
  },
  downloadIntroText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
    marginBottom: 4,
  },
  downloadItemCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  downloadItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downloadItemAssetIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  downloadItemTextCol: {
    flex: 1,
    gap: 2,
  },
  downloadItemTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13.5,
    color: Colors.ink,
  },
  downloadItemSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
  },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  downloadActionBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },

  /* MODAL BASE */
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  modalContentWrapper: {
    flex: 1,
    position: 'relative',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBg,
    gap: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitle: {
    ...Typography.title1,
    color: Colors.ink,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
    gap: 14,
  },

  /* CAMERA VIEW */
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    zIndex: 10,
  },
  cameraIconBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraToolbarIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  cameraNotificationDot: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 10,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.teal,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  scanOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  scanHeaderBox: {
    alignItems: 'center',
    gap: 4,
  },
  scanTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanSub: {
    fontFamily: 'LexendDeca-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewfinder: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.teal,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 10,
  },
  scanLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: Radii.card,
    alignItems: 'center',
    gap: 8,
  },
  scanLoadingText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12.5,
    color: Colors.ink,
  },

  /* ────────────────────────────────────────────────────────
     TABLET MASTER-DETAIL STYLES
  ──────────────────────────────────────────────────────── */
  tabletScanContainer: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  tabletScanColLeft: {
    flex: 0.95,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 15,
    color: Colors.ink,
  },
  tabletScanColRight: {
    flex: 1.05,
  },
  tabletScanListContent: {
    gap: 10,
    paddingTop: 4,
  },
  tabletScanDetailScroll: {
    gap: 16,
    paddingTop: 4,
  },
  recordCardActive: {
    borderColor: Colors.teal,
    borderWidth: 1.5,
    backgroundColor: '#F1FAF8',
  },
});
