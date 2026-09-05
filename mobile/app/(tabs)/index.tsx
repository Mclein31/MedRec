import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { SideMenuModal } from '../../components/menu/SideMenuModal';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { RecordSearchBar } from '../../components/records/RecordSearchBar';
import { RecordEditModal } from '../../components/records/RecordEditModal';
import { Colors, Radii, Typography, ResponsiveLimits, LandscapeTokens } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { MedicalRecord } from '../../types/record';
import { RECORD_TYPE_ASSETS, RECORD_TYPE_LABELS, CATEGORY_FILTERS } from '../../constants/records';
import { formatDateLong, formatDateShort, formatTimeAgo } from '../../utils/dateUtils';

export type { MedicalRecord };

const TYPE_ASSETS = RECORD_TYPE_ASSETS;
const timeAgo = formatTimeAgo;
const formatDate = (dateStr?: string | null) => formatDateLong(dateStr, 'Not specified', 'UTC');

const recordKeyExtractor = (item: MedicalRecord) => item.id;

export default function RecordsScreen() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  // Search & Category Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selection Mode State for QR Sharing & AI Summarization
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [summarizingSelected, setSummarizingSelected] = useState(false);

  // Navigation & Edit Modals
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);

  // Landscape Tablet Master-Detail Selection & Explain State
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [detailExplaining, setDetailExplaining] = useState(false);
  const [detailExplanation, setDetailExplanation] = useState<string | null>(null);
  const [inspectPhotoUri, setInspectPhotoUri] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const {
    isTablet,
    isLandscape,
    screenPadding,
    tabBarClearance,
    insets,
    scaleFont,
  } = useResponsive();

  const loadRecords = async () => {
    try {
      const data = await api.getRecords();
      const fetchedRecords = data.records || [];
      setRecords(fetchedRecords);
      if (fetchedRecords.length === 0) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      } else {
        // Reconcile selection with fresh records (purge deleted or stale records)
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev;
          const validIds = new Set(fetchedRecords.map((r: MedicalRecord) => r.id));
          const filtered = new Set([...prev].filter((id) => validIds.has(id)));
          return filtered.size === prev.size ? prev : filtered;
        });
      }
    } catch (err: any) {
      Alert.alert('Error loading records', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRecords().finally(() => setLoading(false));
      refreshNotifications();

      return () => {
        // Automatically exit selection mode on tab blur
        setSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, [refreshNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const data = await api.summarize();
      Alert.alert('AI Health Summary', data.summary);
    } catch (err: any) {
      Alert.alert('AI summary failed', err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleDetailExplain = async (targetRecord: MedicalRecord) => {
    if (!targetRecord) return;
    setDetailExplaining(true);
    try {
      const promptText = `${targetRecord.title}: ${targetRecord.description || 'No notes provided'}`;
      const data = await api.explain(promptText);
      setDetailExplanation(data.explanation);
    } catch (err: any) {
      Alert.alert('Explain failed', err.message);
    } finally {
      setDetailExplaining(false);
    }
  };

  const handleDetailDelete = (targetRecord: MedicalRecord) => {
    Alert.alert(
      'Delete record?',
      'Are you sure you want to delete this medical record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRecord(targetRecord.id);
              await loadRecords();
              setSelectedRecordId(null);
            } catch (err: any) {
              Alert.alert('Delete failed', err.message);
            }
          },
        },
      ]
    );
  };

  // ─── Category Counts Calculation ──────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: records.length };
    records.forEach((r) => {
      const typeKey = (r.type || 'other').toLowerCase();
      counts[typeKey] = (counts[typeKey] || 0) + 1;
    });
    return counts;
  }, [records]);

  // ─── Filtered & Sorted Records List (Newest first) ────────────────────────
  const sortedRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = records.filter((r) => {
      const matchesCategory =
        selectedCategory === 'all' || (r.type || 'other').toLowerCase() === selectedCategory;
      if (!matchesCategory) return false;

      if (!query) return true;
      const titleMatch = (r.title || '').toLowerCase().includes(query);
      const descMatch = (r.description || '').toLowerCase().includes(query);
      const typeMatch = (r.type || '').toLowerCase().includes(query);
      return titleMatch || descMatch || typeMatch;
    });

    return filtered.sort((a, b) => {
      return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
    });
  }, [records, selectedCategory, searchQuery]);

  // ─── Selection Mode Handlers ──────────────────────────────────────────────
  const toggleSelectMode = () => {
    Haptics.selectionAsync();
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      if (records.length === 0) return;
      setSelectionMode(true);
    }
  };

  const enterSelectionMode = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleRecordSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllRecords = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const visibleIds = sortedRecords.map((r) => r.id);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allVisibleSelected) {
        // Toggle off: deselect all currently visible records
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      // Add visible records to selection
      return new Set([...prev, ...visibleIds]);
    });
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No records selected', 'Please select at least one record to share.');
      return;
    }
    setSharing(true);
    try {
      const data = await api.createShare(60, Array.from(selectedIds));
      setSelectionMode(false);
      setSelectedIds(new Set());
      router.push({
        pathname: '/(tabs)/share',
        params: { pendingToken: data.token, pendingExpiry: data.expiresAt },
      });
    } catch (err: any) {
      Alert.alert('Failed to create share', err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleSummarizeSelected = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No records selected', 'Please select at least one record to generate an AI summary.');
      return;
    }
    setSummarizingSelected(true);
    try {
      const selectedArray = Array.from(selectedIds);
      const data = await api.summarize({ recordIds: selectedArray });
      const recordCount = selectedArray.length;
      const countLabel = `${recordCount} Selected Record${recordCount === 1 ? '' : 's'}`;
      Alert.alert(
        `AI Health Summary (${countLabel})`,
        `${data.summary}\n\nNotice: This is an informational summary of your selected medical records only. It does not provide medical advice or a clinical diagnosis.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (err: any) {
      Alert.alert('AI summary failed', err.message || 'Unable to generate summary for selected records.');
    } finally {
      setSummarizingSelected(false);
    }
  };

  const activeDetailRecord = useMemo(() => {
    return sortedRecords.find((r) => r.id === selectedRecordId) || sortedRecords[0] || null;
  }, [sortedRecords, selectedRecordId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={Colors.teal} />
        <Text style={styles.loadingText}>Loading health records...</Text>
      </View>
    );
  }

  // ─── TABLET LANDSCAPE VIEW: MASTER-DETAIL WORKSPACE ──────────────────────
  if (isTablet && isLandscape) {
    const activeTypeKey = (activeDetailRecord?.type || 'other').toLowerCase();
    const activeTypeAsset = RECORD_TYPE_ASSETS[activeTypeKey] || RECORD_TYPE_ASSETS.other;
    const activeTypeLabel = RECORD_TYPE_LABELS[activeTypeKey] || 'Record';
    const activeAttachment = activeDetailRecord?.attachment_url || activeDetailRecord?.attachmentUrl;

    return (
      <View style={[styles.root, { paddingLeft: LandscapeTokens.navRailWidth, backgroundColor: Colors.bg }]}>
        <StatusBar style="dark" />

        {/* Global Navigation Toolbar (Landscape: Single Notification on right, Burger in sidebar rail) */}
        <View
          style={[
            styles.topToolbar,
            {
              paddingTop: insets.top + 12,
              paddingLeft: Math.max(insets.left, screenPadding),
              paddingRight: Math.max(insets.right, screenPadding),
              justifyContent: 'flex-end',
            },
          ]}
        >
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

        {/* Master-Detail Workspace Row */}
        <View style={styles.masterDetailRoot}>
          {/* 1. Left Master Column (360pt Browser Pane) */}
          <View style={styles.masterColumn}>
            {/* Top Toolbar in Master Column */}
            <View style={styles.masterHeader}>
              <View style={styles.masterHeaderLeft}>
                <Text style={styles.masterHeaderTitle}>My Records</Text>
                <Text style={styles.masterHeaderCount}>{records.length} records</Text>
              </View>

              <View style={styles.masterHeaderActions}>
                {(records.length > 0 || selectionMode) && (
                  <Pressable
                    onPress={toggleSelectMode}
                    hitSlop={8}
                    style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
                  >
                    <Text style={styles.selectBtnText}>{selectionMode ? 'Done' : 'Select'}</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => router.push('/record/add')}
                  hitSlop={8}
                  style={styles.masterAddBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Add record"
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Search Bar in Master Column */}
            <View style={styles.masterSearchWrapper}>
              <RecordSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search records..."
                style={{ marginBottom: 0, paddingHorizontal: 0 }}
              />
            </View>

            {/* Category Filter Chips Carousel */}
            <View style={styles.masterCategoriesWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.masterCategoriesScroll}
              >
                {CATEGORY_FILTERS.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  const count = categoryCounts[cat.key] || 0;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCategory(cat.key);
                      }}
                      style={[
                        styles.catChip,
                        isSelected && styles.catChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          isSelected && styles.catChipTextActive,
                        ]}
                      >
                        {cat.label} ({count})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selection Mode Banner in Master Column */}
            {selectionMode && (
              <View style={styles.masterSelectionContainer}>
                <View style={styles.masterSelectionBanner}>
                  <Text style={styles.masterSelectionText}>
                    {selectedIds.size === 0
                      ? 'Select records below'
                      : `${selectedIds.size} record${selectedIds.size !== 1 ? 's' : ''} selected`}
                  </Text>
                  <Pressable
                    onPress={selectAllRecords}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={
                      sortedRecords.length > 0 && sortedRecords.every((r) => selectedIds.has(r.id))
                        ? 'Deselect all visible records'
                        : 'Select all visible records'
                    }
                  >
                    <Text style={styles.selectAllLink}>
                      {sortedRecords.length > 0 && sortedRecords.every((r) => selectedIds.has(r.id))
                        ? 'Deselect'
                        : 'All'}
                    </Text>
                  </Pressable>
                </View>

                {/* Generate AI Health Summary for Tablet Landscape */}
                <Pressable
                  onPress={handleSummarizeSelected}
                  disabled={summarizingSelected || selectedIds.size === 0}
                  style={({ pressed }) => [
                    styles.tabletMasterAiBtn,
                    pressed && styles.aiBannerPressed,
                    (summarizingSelected || selectedIds.size === 0) && styles.aiBannerDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Generate AI Health Summary"
                >
                  {summarizingSelected ? (
                    <View style={styles.tabletBtnContentRow}>
                      <ActivityIndicator size="small" color={Colors.white} />
                      <Text style={styles.tabletMasterAiText}>Generating summary...</Text>
                    </View>
                  ) : (
                    <Text style={styles.tabletMasterAiText}>Generate AI Health Summary</Text>
                  )}
                </Pressable>

                {/* Share Selected Records for Tablet Landscape (Always mounted in selection mode) */}
                <Pressable
                  onPress={handleShareSelected}
                  disabled={sharing || selectedIds.size === 0}
                  style={({ pressed }) => [
                    styles.shareSecondaryBtn,
                    { marginHorizontal: 0, marginTop: 0, height: 36, marginBottom: 0 },
                    pressed && styles.shareSecondaryBtnPressed,
                    (sharing || selectedIds.size === 0) && styles.shareSecondaryBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Share Selected Records"
                >
                  {sharing ? (
                    <ActivityIndicator size="small" color={Colors.teal} />
                  ) : (
                    <Text
                      style={[
                        styles.shareSecondaryBtnText,
                        { fontSize: 12 },
                        selectedIds.size === 0 && styles.shareSecondaryBtnTextDisabled,
                      ]}
                    >
                      Share Selected Records
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Master Records FlatList */}
            <FlatList
              data={sortedRecords}
              extraData={[selectedIds, selectionMode, selectedRecordId]}
              keyExtractor={recordKeyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.masterListContent,
                { paddingBottom: Math.max(insets.bottom, 24) + 16 },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={Colors.teal}
                />
              }
              ListEmptyComponent={
                <View style={styles.masterEmpty}>
                  <Ionicons name="folder-open-outline" size={32} color={Colors.muted} />
                  <Text style={styles.masterEmptyText}>No matching records found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelectedForDetail = activeDetailRecord?.id === item.id;
                const isChecked = selectedIds.has(item.id);
                const itemTypeKey = (item.type || 'other').toLowerCase();
                const itemAsset = RECORD_TYPE_ASSETS[itemTypeKey] || RECORD_TYPE_ASSETS.other;
                const formattedDate = formatDateShort(item.date, '', false, 'UTC');

                return (
                  <Pressable
                    onPress={() => {
                      if (selectionMode) {
                        Haptics.selectionAsync();
                        toggleRecordSelection(item.id);
                      } else {
                        Haptics.selectionAsync();
                        if (selectedRecordId !== item.id) {
                          setSelectedRecordId(item.id);
                          setDetailExplanation(null);
                        }
                      }
                    }}
                    onLongPress={() => {
                      if (!selectionMode) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        enterSelectionMode(item.id);
                      }
                    }}
                    style={[
                      styles.masterRowCard,
                      isSelectedForDetail && !selectionMode && styles.masterRowCardActive,
                      isChecked && styles.masterRowCardChecked,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isChecked }}
                    accessibilityLabel={`${item.type}: ${item.title}, ${formattedDate}${selectionMode ? (isChecked ? ', selected' : ', not selected') : ''}`}
                  >
                    {selectionMode && (
                      <View
                        style={[
                          styles.checkbox,
                          isChecked && styles.checkboxActive,
                        ]}
                      >
                        {isChecked && (
                          <Ionicons name="checkmark" size={13} color={Colors.white} />
                        )}
                      </View>
                    )}

                    <View style={styles.masterIconBox}>
                      <Image source={itemAsset} style={styles.masterIconImg} />
                    </View>

                    <View style={styles.masterRowContent}>
                      <Text style={styles.masterRowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.masterRowSub} numberOfLines={1}>
                        {item.type} {item.description ? `• ${item.description}` : ''}
                      </Text>
                    </View>

                    <Text style={styles.masterRowDate}>{formattedDate}</Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* 2. Right Detail Clinical Workspace (Flex 1) */}
          <View style={styles.detailColumn}>
            {activeDetailRecord ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.detailScrollContent,
                  {
                    paddingTop: 0,
                    paddingBottom: Math.max(insets.bottom, 24) + 20,
                  },
                ]}
              >
                {/* Detail Overview Header Card */}
                <View style={styles.detailOverviewCard}>
                  <View style={styles.detailHeaderTopRow}>
                    <View style={styles.detailBadge}>
                      <Image source={activeTypeAsset} style={styles.detailBadgeIcon} />
                      <Text style={styles.detailBadgeText}>{activeTypeLabel}</Text>
                    </View>

                    <View style={styles.detailHeaderActionsGroup}>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setEditingRecord(activeDetailRecord);
                        }}
                        style={styles.detailEditBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Edit record metadata"
                      >
                        <Ionicons name="pencil-outline" size={13} color={Colors.teal} />
                        <Text style={styles.detailEditText}>Edit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => router.push(`/record/${activeDetailRecord.id}`)}
                        style={styles.detailOpenFullBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Open record in full detail page"
                      >
                        <Text style={styles.detailOpenFullText}>Full Page</Text>
                        <Ionicons name="open-outline" size={14} color={Colors.teal} />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.detailMainTitle}>{activeDetailRecord.title}</Text>

                  {/* Metadata Row */}
                  <View style={styles.detailMetaGrid}>
                    <View style={styles.detailMetaBox}>
                      <Text style={styles.detailMetaLabel}>DATE OF EVENT</Text>
                      <Text style={styles.detailMetaValue}>
                        {formatDateShort(activeDetailRecord.date, '', false, 'UTC')}
                      </Text>
                    </View>
                    <View style={styles.detailMetaBox}>
                      <Text style={styles.detailMetaLabel}>LOGGED IN MEDREC</Text>
                      <Text style={styles.detailMetaValue}>
                        {formatDateShort(activeDetailRecord.created_at || activeDetailRecord.date, '', false, 'UTC')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Clinical Content: Side-by-Side Split if Attachment Exists */}
                {activeAttachment ? (
                  <View style={styles.detailSplitRow}>
                    {/* Left Split Column: Document Attachment & Delete CTA */}
                    <View style={styles.detailSplitLeft}>
                      <View style={styles.detailAttachmentCard}>
                        <View style={styles.detailCardHeader}>
                          <Ionicons name="document-attach-outline" size={17} color={Colors.blue} />
                          <Text style={styles.detailCardTitle}>Scanned Document</Text>
                        </View>

                        <Pressable
                          onPress={() => setInspectPhotoUri(activeAttachment)}
                          style={styles.detailAttachmentPreview}
                          accessibilityRole="button"
                          accessibilityLabel="Inspect document photo full screen"
                        >
                          <Image
                            source={{ uri: activeAttachment }}
                            style={styles.detailAttachmentImg}
                            resizeMode="cover"
                          />
                          <View style={styles.detailZoomOverlay}>
                            <Ionicons name="scan-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.detailZoomText}>Tap to Inspect Photo</Text>
                          </View>
                        </Pressable>
                      </View>

                      {/* Destructive Delete Button */}
                      <Pressable
                        onPress={() => handleDetailDelete(activeDetailRecord)}
                        style={({ pressed }) => [
                          styles.detailDeleteBtn,
                          pressed && { opacity: 0.75 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Delete this medical record"
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.red} />
                        <Text style={styles.detailDeleteBtnText}>Delete Record</Text>
                      </Pressable>
                    </View>

                    {/* Right Split Column: Clinical Notes & AI Insights */}
                    <View style={styles.detailSplitRight}>
                      {/* Clinical Notes & Observations */}
                      <View style={styles.detailNotesCard}>
                        <View style={styles.detailCardHeader}>
                          <Ionicons name="clipboard-outline" size={17} color={Colors.ink} />
                          <Text style={styles.detailCardTitle}>Clinical Notes &amp; Observations</Text>
                        </View>
                        <Text style={styles.detailNotesBody}>
                          {activeDetailRecord.description || 'No additional clinical notes recorded.'}
                        </Text>
                      </View>

                      {/* AI Medical Insights Card */}
                      <View style={styles.detailAiCard}>
                        <View style={styles.detailAiHeader}>
                          <View style={styles.detailAiTitleGroup}>
                            <Image
                              source={require('../../assets/icons/AI.png')}
                              style={styles.detailAiIcon}
                            />
                            <Text style={styles.detailAiTitle}>AI Medical Insights</Text>
                          </View>

                          <Pressable
                            onPress={() => handleDetailExplain(activeDetailRecord)}
                            disabled={detailExplaining}
                            style={({ pressed }) => [
                              styles.detailAiRegenerateBtn,
                              pressed && { opacity: 0.7 },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Regenerate AI medical explanation"
                          >
                            {detailExplaining ? (
                              <ActivityIndicator size="small" color={Colors.blue} />
                            ) : (
                              <>
                                <Ionicons name="sparkles" size={13} color={Colors.blue} />
                                <Text style={styles.detailAiRegenerateText}>
                                  {detailExplanation ? 'Regenerate' : 'Analyze'}
                                </Text>
                              </>
                            )}
                          </Pressable>
                        </View>

                        <Text style={styles.detailAiBody}>
                          {detailExplanation ||
                            'Get an instant, plain-language clinical explanation of medical terms, lab biomarkers, and diagnoses in this record.'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Single Wide Flow when No Attachment */
                  <View style={{ gap: 16 }}>
                    {/* Clinical Notes & Observations */}
                    <View style={styles.detailNotesCard}>
                      <View style={styles.detailCardHeader}>
                        <Ionicons name="clipboard-outline" size={17} color={Colors.ink} />
                        <Text style={styles.detailCardTitle}>Clinical Notes &amp; Observations</Text>
                      </View>
                      <Text style={styles.detailNotesBody}>
                        {activeDetailRecord.description || 'No additional clinical notes recorded.'}
                      </Text>
                    </View>

                    {/* AI Medical Insights Card */}
                    <View style={styles.detailAiCard}>
                      <View style={styles.detailAiHeader}>
                        <View style={styles.detailAiTitleGroup}>
                          <Image
                            source={require('../../assets/icons/AI.png')}
                            style={styles.detailAiIcon}
                          />
                          <Text style={styles.detailAiTitle}>AI Medical Insights</Text>
                        </View>

                        <Pressable
                          onPress={() => handleDetailExplain(activeDetailRecord)}
                          disabled={detailExplaining}
                          style={({ pressed }) => [
                            styles.detailAiRegenerateBtn,
                            pressed && { opacity: 0.7 },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Regenerate AI medical explanation"
                        >
                          {detailExplaining ? (
                            <ActivityIndicator size="small" color={Colors.blue} />
                          ) : (
                            <>
                              <Ionicons name="sparkles" size={13} color={Colors.blue} />
                              <Text style={styles.detailAiRegenerateText}>
                                {detailExplanation ? 'Regenerate' : 'Analyze'}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>

                      <Text style={styles.detailAiBody}>
                        {detailExplanation ||
                          'Get an instant, plain-language clinical explanation of medical terms, lab biomarkers, and diagnoses in this record.'}
                      </Text>
                    </View>

                    {/* Destructive Delete Button */}
                    <Pressable
                      onPress={() => handleDetailDelete(activeDetailRecord)}
                      style={({ pressed }) => [
                        styles.detailDeleteBtn,
                        pressed && { opacity: 0.75 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Delete this medical record"
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.red} />
                      <Text style={styles.detailDeleteBtnText}>Delete Record</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.detailNoSelection}>
                <Ionicons name="medical-outline" size={54} color={Colors.teal} style={{ opacity: 0.6 }} />
                <Text style={styles.detailNoSelectionTitle}>No Health Record Selected</Text>
                <Text style={styles.detailNoSelectionSub}>
                  Choose a record from the browser on the left or tap &apos;+ Record&apos; to scan a new clinical document.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Inspect Photo Zoom Modal */}
        <Modal
          visible={!!inspectPhotoUri}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectPhotoUri(null)}
        >
          <View style={styles.zoomModalRoot}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setInspectPhotoUri(null)}
            />
            <View style={styles.zoomModalCard}>
              <View style={styles.zoomModalHeader}>
                <Text style={styles.zoomModalTitle}>Document Inspection</Text>
                <Pressable
                  onPress={() => setInspectPhotoUri(null)}
                  style={styles.zoomModalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={Colors.ink} />
                </Pressable>
              </View>
              {inspectPhotoUri && (
                <Image
                  source={{ uri: inspectPhotoUri }}
                  style={styles.zoomModalImg}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Side Navigation Menu Drawer Modal */}
        <SideMenuModal
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onOpenAiSummary={handleSummarize}
        />

        {/* Notifications Modal */}
        <NotificationCenterModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          onOpenAiSummary={handleSummarize}
        />

        {/* Record Metadata Edit Modal */}
        <RecordEditModal
          visible={!!editingRecord}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      </View>
    );
  }

  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'there';

  // ─── PHONE VIEW & TABLET PORTRAIT VIEW ────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Global Navigation Toolbar (matching Profile screen exact reference) */}
      <View
        style={[
          styles.topToolbar,
          {
            paddingTop: insets.top + 12,
            paddingLeft: Math.max(insets.left, screenPadding),
            paddingRight: Math.max(insets.right, screenPadding),
          },
        ]}
      >
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

        <View style={styles.toolbarRight}>
          {(records.length > 0 || selectionMode) && (
            <Pressable
              onPress={toggleSelectMode}
              hitSlop={8}
              style={({ pressed }) => [styles.selectHeaderBtn, pressed && styles.selectHeaderBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={selectionMode ? 'Exit selection mode' : 'Enter multi-record selection mode'}
            >
              <Text style={styles.selectHeaderText}>{selectionMode ? 'Done' : 'Select'}</Text>
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
      </View>

      {/* ────────────────────────────────────────────────────────
          MAIN RECORDS FLATLIST WITH ADAPTIVE BENTO GRID ON TABLETS
      ──────────────────────────────────────────────────────── */}
      <FlatList
        key={isTablet ? 'tablet-grid-2' : 'phone-list-1'}
        data={sortedRecords}
        extraData={[selectedIds, selectionMode]}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={
          isTablet
            ? [
                styles.columnWrapper,
                {
                  gap: 12,
                  paddingHorizontal: screenPadding,
                  maxWidth: ResponsiveLimits.maxContentWidth,
                  alignSelf: 'center',
                  width: '100%',
                },
              ]
            : undefined
        }
        keyExtractor={recordKeyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              Math.max(insets.bottom, 20) +
              tabBarClearance,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.teal}
          />
        }
        ListHeaderComponent={
          <View
            style={[
              styles.headerContainer,
              isTablet && {
                maxWidth: ResponsiveLimits.maxContentWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
          >

            {/* Screen Greeting (Normal Mode only - hidden in Selection Mode) */}
            {!selectionMode && (
              <View
                style={[
                  styles.greetingBox,
                  {
                    paddingLeft: Math.max(insets.left, screenPadding),
                    paddingRight: Math.max(insets.right, screenPadding),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.greetingTitle,
                    { fontSize: scaleFont(28, 24, 32), lineHeight: scaleFont(34, 30, 38) },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.35}
                >
                  Hello, {firstName} 👋🏼
                </Text>
                <Text
                  style={[
                    styles.greetingSub,
                    { fontSize: scaleFont(12, 11, 13.5) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  Here&apos;s your health overview
                </Text>
              </View>
            )}

            {/* Position 1: AI Health Summary Banner */}
            <Pressable
              onPress={selectionMode ? handleSummarizeSelected : handleSummarize}
              disabled={selectionMode ? (summarizingSelected || selectedIds.size === 0) : summarizing}
              style={({ pressed }) => [
                styles.aiBanner,
                { marginHorizontal: screenPadding },
                selectionMode && selectedIds.size === 0 && styles.aiBannerDisabled,
                pressed && styles.aiBannerPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Generate AI Health Summary"
            >
              <View style={styles.aiIconBox}>
                <Image source={require('../../assets/icons/AI.png')} style={styles.aiAsset} />
              </View>
              <View style={styles.aiTextBox}>
                <Text
                  style={[
                    styles.aiTitle,
                    { fontSize: scaleFont(14.5, 13.5, 16) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  {(selectionMode ? summarizingSelected : summarizing)
                    ? 'Generating summary...'
                    : 'Generate AI Health Summary'}
                </Text>
                <Text
                  style={[
                    styles.aiSubtitle,
                    { fontSize: scaleFont(11, 10.5, 12) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  {selectionMode
                    ? 'Get clinical insights for selected records'
                    : 'Get clinical insights and a summary of your records'}
                </Text>
              </View>
              {(selectionMode ? summarizingSelected : summarizing) ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.75)" />
              )}
            </Pressable>

            {/* Position 2: Share Selected Records (Selection Mode only) */}
            {selectionMode && (
              <Pressable
                onPress={handleShareSelected}
                disabled={sharing || selectedIds.size === 0}
                style={({ pressed }) => [
                  styles.shareSecondaryBtn,
                  { marginHorizontal: screenPadding },
                  pressed && styles.shareSecondaryBtnPressed,
                  (sharing || selectedIds.size === 0) && styles.shareSecondaryBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share Selected Records"
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={Colors.teal} />
                ) : (
                  <Text
                    style={[
                      styles.shareSecondaryBtnText,
                      selectedIds.size === 0 && styles.shareSecondaryBtnTextDisabled,
                    ]}
                  >
                    Share Selected Records
                  </Text>
                )}
              </Pressable>
            )}

            {/* Position 3: Multi-Selection Info Banner (Selection Mode only) */}
            {selectionMode && (
              <View
                style={[
                  styles.selectionBanner,
                  {
                    marginHorizontal: screenPadding,
                  },
                ]}
              >
                <View style={styles.selectionBannerLeft}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />
                  <Text style={styles.selectionBannerText} maxFontSizeMultiplier={1.35}>
                    {selectedIds.size === 0
                      ? 'Tap records to select'
                      : `${selectedIds.size} record${selectedIds.size !== 1 ? 's' : ''} selected`}
                  </Text>
                </View>
                <Pressable
                  onPress={selectAllRecords}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    sortedRecords.length > 0 && sortedRecords.every((r) => selectedIds.has(r.id))
                      ? 'Deselect all visible records'
                      : 'Select all visible records'
                  }
                >
                  <Text style={styles.selectAllText} maxFontSizeMultiplier={1.35}>
                    {sortedRecords.length > 0 && sortedRecords.every((r) => selectedIds.has(r.id))
                      ? 'Deselect all'
                      : 'Select all'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Clean Full-Width Search Bar */}
            <RecordSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Category Quick Filter Chips Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.chipRow,
                {
                  paddingLeft: Math.max(insets.left, screenPadding),
                  paddingRight: Math.max(insets.right, screenPadding),
                },
              ]}
            >
              {CATEGORY_FILTERS.map((cat) => {
                const count = categoryCounts[cat.key] || 0;
                const isActive = selectedCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedCategory(cat.key);
                    }}
                    style={[styles.chip, isActive && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label}, ${count} records`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                        { fontSize: scaleFont(12, 11, 13) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      {cat.label} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Records Section Counter Header */}
            <View
              style={[
                styles.recordsSectionHeader,
                {
                  paddingLeft: Math.max(insets.left, screenPadding),
                  paddingRight: Math.max(insets.right, screenPadding),
                },
              ]}
            >
              <Text
                style={[
                  styles.recordsSectionTitle,
                  { fontSize: scaleFont(18, 16, 20) },
                ]}
                maxFontSizeMultiplier={1.35}
              >
                My Records
              </Text>
              <Text
                style={[
                  styles.recordsCountText,
                  { fontSize: scaleFont(12, 11, 13) },
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {sortedRecords.length} Record{sortedRecords.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          const typeKey = (item.type || 'other').toLowerCase();
          const typeAsset = TYPE_ASSETS[typeKey] || TYPE_ASSETS.other;

          return (
            <Pressable
              onPress={() => {
                if (selectionMode) {
                  Haptics.selectionAsync();
                  toggleRecordSelection(item.id);
                } else {
                  router.push(`/record/${item.id}`);
                }
              }}
              onLongPress={() => {
                if (!selectionMode) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  enterSelectionMode(item.id);
                }
              }}
              style={({ pressed }) => [
                styles.recordCard,
                isTablet
                  ? styles.recordCardTablet
                  : { marginHorizontal: screenPadding },
                pressed && styles.cardPressed,
                isSelected && styles.cardSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.type}: ${item.title}, ${formatDate(item.date)}${selectionMode ? (isSelected ? ', selected' : ', not selected') : ''}`}
            >
              {/* Selection Checkbox */}
              {selectionMode && (
                <View style={styles.checkboxArea}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color={Colors.white} />}
                  </View>
                </View>
              )}

              {/* Top Row: Record Type Badge */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText} maxFontSizeMultiplier={1.35}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.recordBody}>
                {/* Icon + Content Row */}
                <View style={styles.recordRow}>
                  <View style={styles.recordIconBox}>
                    <Image source={typeAsset} style={styles.recordAsset} />
                  </View>

                  <View style={styles.recordContent}>
                    <Text
                      style={[
                        styles.recordTitle,
                        { fontSize: scaleFont(15, 13.5, 16.5) },
                      ]}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.35}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.recordDateRow}>
                      <Image
                        source={require('../../assets/icons/calendar.png')}
                        style={styles.dateAsset}
                      />
                      <Text
                        style={[
                          styles.recordDateText,
                          { fontSize: scaleFont(11.5, 10.5, 12.5) },
                        ]}
                        maxFontSizeMultiplier={1.35}
                      >
                        {formatDate(item.date)}
                      </Text>
                    </View>
                  </View>

                  {!selectionMode && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.muted}
                      style={styles.chevronArrow}
                    />
                  )}
                </View>

                {/* Added ago Footer */}
                <View style={styles.recordFooter}>
                  <Image
                    source={require('../../assets/icons/open-folder.png')}
                    style={styles.footerAsset}
                  />
                  <Text
                    style={[
                      styles.recordFooterText,
                      { fontSize: scaleFont(11, 10.5, 12) },
                    ]}
                    maxFontSizeMultiplier={1.35}
                  >
                    Added {item.created_at ? timeAgo(item.created_at) : timeAgo(item.date)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={searchQuery || selectedCategory !== 'all' ? 'search-outline' : 'document-text-outline'}
              size={48}
              color={Colors.tealLight}
            />
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedCategory !== 'all' ? 'No matching records' : 'No records yet'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search keywords or filter category.'
                : 'Tap the + button on the navigation bar to add your first health record.'}
            </Text>
          </View>
        }
      />

      {/* Side Menu Drawer */}
      <SideMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onOpenAiSummary={handleSummarize}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onOpenAiSummary={handleSummarize}
      />

      {/* Record Metadata Edit Modal */}
      <RecordEditModal
        visible={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSaved={(updated) => {
          setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: 12,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.muted,
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingBottom: 4,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbarIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 10,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.teal,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  selectHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 32,
    justifyContent: 'center',
  },
  selectHeaderBtnPressed: {
    opacity: 0.75,
    backgroundColor: Colors.divider,
  },
  selectHeaderText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: Colors.teal,
  },
  greetingBox: {
    marginBottom: 14,
  },
  greetingTitle: {
    ...Typography.display,
    color: Colors.ink,
  },
  greetingSub: {
    ...Typography.subtitle,
    color: Colors.muted,
    marginTop: 2,
  },

  /* Selection Banner */
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.tealLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionBannerText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: Colors.ink,
  },
  selectAllText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: Colors.teal,
  },

  /* AI Health Summary Banner */
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue,
    borderRadius: Radii.card,
    paddingVertical: 13,
    paddingHorizontal: 15,
    gap: 12,
    marginBottom: 12,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  aiBannerPressed: {
    opacity: 0.9,
  },
  aiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAsset: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    tintColor: Colors.white,
  },
  aiTextBox: {
    flex: 1,
    gap: 2,
  },
  aiTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.white,
  },
  aiSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: 'rgba(255, 255, 255, 0.88)',
  },
  aiBannerDisabled: {
    opacity: 0.55,
  },

  /* Share Selected Records Secondary Button */
  shareSecondaryBtn: {
    height: 44,
    borderRadius: Radii.card,
    backgroundColor: Colors.cardBg,
    borderWidth: 1.5,
    borderColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  shareSecondaryBtnPressed: {
    backgroundColor: Colors.tealLight,
    opacity: 0.85,
  },
  shareSecondaryBtnDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
    opacity: 0.5,
  },
  shareSecondaryBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: Colors.teal,
    textAlign: 'center',
  },
  shareSecondaryBtnTextDisabled: {
    color: Colors.muted,
  },
  tabletMasterAiBtn: {
    height: 36,
    borderRadius: Radii.card,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tabletMasterAiText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
  },
  tabletBtnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  /* Quick Category Chips */
  chipRow: {
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  chipText: {
    fontFamily: 'LexendDeca-Medium',
    color: Colors.muted,
  },
  chipTextActive: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.teal,
  },

  /* Records Section Header */
  recordsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  recordsSectionTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.ink,
  },
  recordsCountText: {
    fontFamily: 'LexendDeca-Medium',
    color: Colors.teal,
  },

  /* Record Card */
  recordCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  recordCardTablet: {
    flex: 1,
    marginHorizontal: 0,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.teal,
  },
  checkboxArea: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.tealLight,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },

  /* Record Type Badge & Edit Button Header Row */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginHorizontal: 14,
    marginBottom: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11,
    color: Colors.teal,
  },

  /* Record Body */
  recordBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordAsset: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: Colors.teal,
  },
  recordContent: {
    flex: 1,
    gap: 4,
  },
  recordTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.ink,
    lineHeight: 20,
  },
  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateAsset: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    tintColor: Colors.muted,
  },
  recordDateText: {
    fontFamily: 'LexendDeca-Regular',
    color: Colors.muted,
  },
  chevronArrow: {
    opacity: 0.6,
    marginLeft: 4,
  },

  /* Record Footer */
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  footerAsset: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    tintColor: Colors.muted,
  },
  recordFooterText: {
    fontFamily: 'LexendDeca-Regular',
    color: Colors.muted,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    ...Typography.title2,
    color: Colors.ink,
    textAlign: 'center',
  },
  emptySub: {
    ...Typography.body,
    fontSize: 12.5,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ────────────────────────────────────────────────────────
     TABLET LANDSCAPE MASTER-DETAIL WORKSPACE STYLES
  ──────────────────────────────────────────────────────── */
  masterDetailRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  masterColumn: {
    width: LandscapeTokens.masterPaneWidth,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  masterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  masterHeaderLeft: {
    gap: 1,
  },
  masterHeaderTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: Colors.ink,
  },
  masterHeaderCount: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
  },
  masterHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  masterAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.divider,
  },
  selectBtnPressed: {
    opacity: 0.75,
  },
  selectBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: Colors.teal,
  },
  iconBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterSearchWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  masterCategoriesWrapper: {
    paddingVertical: 6,
  },
  masterCategoriesScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F4',
  },
  catChipActive: {
    backgroundColor: Colors.teal,
  },
  catChipText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12,
    color: Colors.ink,
  },
  catChipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  masterSelectionContainer: {
    marginHorizontal: 14,
    marginBottom: 8,
    gap: 6,
  },
  masterSelectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.tealLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  masterSelectionText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: Colors.teal,
  },
  selectAllLink: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12,
    color: Colors.teal,
    textDecorationLine: 'underline',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  masterListContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 6,
  },
  masterEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  masterEmptyText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: Colors.muted,
  },
  masterRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF3F2',
    padding: 10,
    gap: 10,
  },
  masterRowCardActive: {
    borderColor: Colors.teal,
    backgroundColor: '#F1FAF8',
    borderWidth: 1.5,
  },
  masterRowCardChecked: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  masterIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterIconImg: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  masterRowContent: {
    flex: 1,
    gap: 2,
  },
  masterRowTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: Colors.ink,
  },
  masterRowSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: Colors.muted,
  },
  masterRowDate: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: Colors.muted,
  },

  /* Right Detail Workspace Column */
  detailColumn: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  detailScrollContent: {
    paddingHorizontal: 24,
    gap: 16,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  detailSplitRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  detailSplitLeft: {
    flex: 0.46,
    gap: 14,
  },
  detailSplitRight: {
    flex: 0.54,
    gap: 14,
  },
  detailNoSelection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  detailNoSelectionTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: Colors.ink,
  },
  detailNoSelectionSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 420,
  },
  detailOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 12,
  },
  detailHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.tealLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  detailBadgeIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  detailBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: Colors.teal,
  },
  detailHeaderActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E8F5F2',
  },
  detailEditText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: Colors.teal,
  },
  detailOpenFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailOpenFullText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: Colors.teal,
  },
  detailMainTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: Colors.ink,
    lineHeight: 26,
  },
  detailMetaGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  detailMetaBox: {
    flex: 1,
    backgroundColor: '#F8FCFB',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  detailMetaLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9.5,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  detailMetaValue: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: Colors.ink,
  },
  detailAttachmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailCardTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14,
    color: Colors.ink,
  },
  detailAttachmentPreview: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0A1211',
  },
  detailAttachmentImg: {
    width: '100%',
    height: '100%',
  },
  detailZoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 52, 59, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  detailZoomText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: '#FFFFFF',
  },
  detailNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 10,
  },
  detailNotesBody: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13.5,
    color: Colors.ink,
    lineHeight: 21,
  },
  detailAiCard: {
    backgroundColor: Colors.blueLight,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D4E6F1',
    padding: 18,
    gap: 10,
  },
  detailAiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailAiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailAiIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  detailAiTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14,
    color: Colors.blue,
  },
  detailAiRegenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E6F1',
  },
  detailAiRegenerateText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: Colors.blue,
  },
  detailAiBody: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  detailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  detailDeleteBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: Colors.red,
  },
  zoomModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  zoomModalCard: {
    width: '100%',
    maxWidth: 720,
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
  },
  zoomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomModalTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: Colors.ink,
  },
  zoomModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomModalImg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});