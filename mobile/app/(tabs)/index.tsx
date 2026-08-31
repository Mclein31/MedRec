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
import { Colors, Radii, Typography, ResponsiveLimits } from '../../constants/theme';
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

  // Selection Mode State for QR Sharing
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  // Navigation Modals
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

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
    isCompactPhone,
  } = useResponsive();

  const loadRecords = async () => {
    try {
      const data = await api.getRecords();
      setRecords(data.records || []);
    } catch (err: any) {
      Alert.alert('Error loading records', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRecords().finally(() => setLoading(false));
      refreshNotifications();
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

  // ─── Selection Mode Handlers ──────────────────────────────────────────────
  const toggleSelectMode = () => {
    Haptics.selectionAsync();
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    } else {
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
    setSelectedIds(new Set(records.map((r) => r.id)));
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

    return (
      <View style={[styles.root, { paddingLeft: 260, backgroundColor: Colors.bg }]}>
        <StatusBar style="dark" />

        {/* Master-Detail Container */}
        <View style={styles.masterDetailRoot}>
          {/* 1. Left Master Column */}
          <View style={styles.masterColumn}>
            {/* Top Toolbar in Master Column */}
            <View style={[styles.masterHeader, { paddingTop: insets.top + 10 }]}>
              <View style={styles.masterHeaderLeft}>
                <Text style={styles.masterHeaderTitle}>My Records</Text>
                <Text style={styles.masterHeaderCount}>{records.length} items</Text>
              </View>

              <View style={styles.masterHeaderActions}>
                {selectionMode ? (
                  <Pressable
                    onPress={toggleSelectMode}
                    hitSlop={8}
                    style={styles.cancelBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel selection mode"
                  >
                    <Text style={styles.cancelBtnText}>Done</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={toggleSelectMode}
                    hitSlop={8}
                    style={styles.selectBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Enter selection mode"
                  >
                    <Text style={styles.selectBtnText}>Select</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setNotificationsVisible(true);
                  }}
                  hitSlop={8}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Notifications, ${unreadCount} unread`}
                >
                  <Image
                    source={require('../../assets/icons/notification-bell.png')}
                    style={styles.bellIcon}
                  />
                  {unreadCount > 0 && <View style={styles.notifDot} />}
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

            {/* Category Filter Chips */}
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

            {/* Selection Banner in Master Column */}
            {selectionMode && (
              <View style={styles.masterSelectionBanner}>
                <Text style={styles.masterSelectionText}>
                  {selectedIds.size} record{selectedIds.size === 1 ? '' : 's'} selected
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={selectAllRecords} hitSlop={6}>
                    <Text style={styles.selectAllLink}>All</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShareSelected}
                    disabled={sharing || selectedIds.size === 0}
                    style={[
                      styles.sharePillBtn,
                      (sharing || selectedIds.size === 0) && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={styles.sharePillText}>
                      {sharing ? 'Generating...' : 'Share QR'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Master Records List */}
            <FlatList
              data={sortedRecords}
              keyExtractor={recordKeyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.masterListContent,
                { paddingBottom: Math.max(insets.bottom, 24) },
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

          {/* 2. Right Detail Workspace */}
          <View style={styles.detailColumn}>
            {activeDetailRecord ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.detailScrollContent,
                  {
                    paddingTop: insets.top + 16,
                    paddingBottom: Math.max(insets.bottom, 24) + 20,
                  },
                ]}
              >
                {/* Detail Overview Card */}
                <View style={styles.detailOverviewCard}>
                  <View style={styles.detailHeaderTopRow}>
                    <View style={styles.detailBadge}>
                      <Image source={activeTypeAsset} style={styles.detailBadgeIcon} />
                      <Text style={styles.detailBadgeText}>{activeTypeLabel}</Text>
                    </View>

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

                {/* Attached Document Card (if attached) */}
                {(activeDetailRecord.attachment_url || activeDetailRecord.attachmentUrl) && (
                  <View style={styles.detailAttachmentCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="document-attach-outline" size={17} color={Colors.teal} />
                      <Text style={styles.detailCardTitle}>Attached Medical Document</Text>
                    </View>

                    <Pressable
                      onPress={() =>
                        setInspectPhotoUri(
                          (activeDetailRecord.attachment_url || activeDetailRecord.attachmentUrl)!
                        )
                      }
                      style={styles.detailAttachmentPreview}
                    >
                      <Image
                        source={{
                          uri:
                            (activeDetailRecord.attachment_url || activeDetailRecord.attachmentUrl)!,
                        }}
                        style={styles.detailAttachmentImg}
                        resizeMode="cover"
                      />
                      <View style={styles.detailZoomOverlay}>
                        <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.detailZoomText}>Tap to Inspect Full Size</Text>
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* Clinical Notes & Observations Card */}
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
              </ScrollView>
            ) : (
              <View style={styles.detailNoSelection}>
                <Ionicons name="medical-outline" size={48} color={Colors.muted} />
                <Text style={styles.detailNoSelectionTitle}>Select a Medical Record</Text>
                <Text style={styles.detailNoSelectionSub}>
                  Choose a record from the list to view its complete clinical summary, document scans, and AI insights.
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

        {/* Notifications Modal */}
        <NotificationCenterModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </View>
    );
  }

  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'there';

  // ─── PHONE VIEW & TABLET PORTRAIT VIEW ────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ────────────────────────────────────────────────────────
          MAIN RECORDS FLATLIST WITH ADAPTIVE BENTO GRID ON TABLETS
      ──────────────────────────────────────────────────────── */}
      <FlatList
        key={isTablet ? 'tablet-grid-2' : 'phone-list-1'}
        data={sortedRecords}
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
            paddingBottom: Math.max(insets.bottom, 20) + tabBarClearance,
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
            {/* Top Toolbar */}
            <View
              style={[
                styles.toolbar,
                {
                  paddingTop: insets.top + 12,
                  paddingLeft: Math.max(insets.left, screenPadding),
                  paddingRight: Math.max(insets.right, screenPadding),
                },
              ]}
            >
              {selectionMode ? (
                <Pressable
                  onPress={toggleSelectMode}
                  hitSlop={8}
                  style={styles.cancelBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel selection mode"
                >
                  <Text style={styles.cancelBtnText}>Done</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMenuVisible(true);
                  }}
                  hitSlop={10}
                  style={styles.menuIconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Open navigation menu"
                >
                  <Image
                    source={require('../../assets/icons/burger-menu.png')}
                    style={styles.toolbarIcon}
                  />
                </Pressable>
              )}

              <View style={styles.toolbarRight}>
                {records.length > 0 && !selectionMode && (
                  <Pressable
                    onPress={toggleSelectMode}
                    hitSlop={8}
                    style={styles.selectHeaderBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Enter multi-record selection mode"
                  >
                    <Text style={styles.selectHeaderText}>Select</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    refreshNotifications();
                    setNotificationsVisible(true);
                  }}
                  hitSlop={10}
                  style={styles.bellBtn}
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

            {/* Screen Greeting */}
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
                Here's your health overview
              </Text>
            </View>

            {/* Multi-Selection Info Banner */}
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
                <Pressable onPress={selectAllRecords} hitSlop={6}>
                  <Text style={styles.selectAllText} maxFontSizeMultiplier={1.35}>
                    Select all
                  </Text>
                </Pressable>
              </View>
            )}

            {/* AI Health Summary Banner (Hidden during Selection Mode) */}
            {!selectionMode && (
              <Pressable
                onPress={handleSummarize}
                disabled={summarizing}
                style={({ pressed }) => [
                  styles.aiBanner,
                  { marginHorizontal: screenPadding },
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
                    {summarizing ? 'Generating summary...' : 'Generate AI Health Summary'}
                  </Text>
                  <Text
                    style={[
                      styles.aiSubtitle,
                      { fontSize: scaleFont(11, 10.5, 12) },
                    ]}
                    maxFontSizeMultiplier={1.35}
                  >
                    Get clinical insights and a summary of your records
                  </Text>
                </View>
                {summarizing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.75)" />
                )}
              </Pressable>
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
              accessibilityLabel={`${item.type}: ${item.title}, ${formatDate(item.date)}`}
            >
              {/* Selection Checkbox */}
              {selectionMode && (
                <View style={styles.checkboxArea}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color={Colors.white} />}
                  </View>
                </View>
              )}

              {/* Record Type Badge */}
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText} maxFontSizeMultiplier={1.35}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
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

      {/* ────────────────────────────────────────────────────────
          FLOATING SHARE SELECTED CTA BUTTON (Selection Mode)
      ──────────────────────────────────────────────────────── */}
      {selectionMode && selectedIds.size > 0 && (
        <View
          style={[
            styles.floatingBar,
            {
              paddingBottom: Math.max(insets.bottom, 12) + (isTablet ? 90 : 70),
            },
          ]}
        >
          <Pressable
            onPress={handleShareSelected}
            disabled={sharing}
            style={({ pressed }) => [styles.shareFloatingBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Share ${selectedIds.size} selected records with Doctor`}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="qr-code-outline" size={18} color={Colors.white} />
                <Text style={styles.shareFloatingText}>
                  Share {selectedIds.size} Record{selectedIds.size !== 1 ? 's' : ''} via QR
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  menuIconBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  bellBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  selectHeaderText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: Colors.teal,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.tealLight,
    minHeight: 32,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
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

  /* Record Type Badge */
  typeBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 14,
    marginBottom: 2,
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

  /* Floating Share Button */
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  shareFloatingBtn: {
    width: '100%',
    maxWidth: 340,
    height: 50,
    borderRadius: Radii.button,
    backgroundColor: Colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareFloatingText: {
    ...Typography.button,
    color: Colors.white,
  },
  btnPressed: {
    opacity: 0.8,
  },

  /* ────────────────────────────────────────────────────────
     TABLET LANDSCAPE MASTER-DETAIL WORKSPACE STYLES
  ──────────────────────────────────────────────────────── */
  masterDetailRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  masterColumn: {
    width: 380,
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
  selectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F7F6',
  },
  selectBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: Colors.teal,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FCFB',
    position: 'relative',
  },
  bellIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.teal,
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
  masterSelectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.tealLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
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
  sharePillBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sharePillText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11,
    color: '#FFFFFF',
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
    paddingHorizontal: 28,
    gap: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
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