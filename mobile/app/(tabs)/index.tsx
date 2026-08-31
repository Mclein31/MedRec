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

export type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  created_at?: string;
};

const TYPE_ASSETS: Record<string, any> = {
  consultation: require('../../assets/icons/consultation.png'),
  diagnosis: require('../../assets/icons/diagnosis.png'),
  lab: require('../../assets/icons/lab.png'),
  prescription: require('../../assets/icons/prescription.png'),
  medication: require('../../assets/icons/prescription.png'),
  appointment: require('../../assets/icons/calendar.png'),
  other: require('../../assets/icons/folder.png'),
};

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'lab', label: 'Labs' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'consultation', label: 'Consultations' },
  { key: 'diagnosis', label: 'Diagnoses' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'medication', label: 'Medications' },
  { key: 'other', label: 'Other' },
];

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 24) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  return `${Math.floor(diffMonths / 12)} years ago`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Not specified';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

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

  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const {
    isTablet,
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

  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'there';

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={Colors.teal} />
        <Text style={styles.loadingText}>Loading health records...</Text>
      </View>
    );
  }

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
        keyExtractor={(item) => item.id}
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
});