import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { SideMenuModal } from '../../components/menu/SideMenuModal';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { useNotifications } from '../../context/NotificationContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { DragHandle } from '../../components/ui/DragHandle';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  consultation: 'people-outline',
  diagnosis: 'medkit-outline',
  lab: 'flask-outline',
  prescription: 'document-text-outline',
  medication: 'medical-outline',
  appointment: 'calendar-outline',
  other: 'folder-outline',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type SharedRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
};

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SharedRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SharedRecord | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const { unreadCount, refreshNotifications } = useNotifications();
  const insets = useSafeAreaInsets();

  const handleScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const result = await api.getSharedRecords(data);
      setRecords(result.records);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message);
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
  };

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenHeader
          title="Scan Doctor QR"
          subtitle="Scan temporary patient records"
          onPressMenu={() => setMenuVisible(true)}
          onPressNotifications={() => {
            refreshNotifications();
            setNotificationsVisible(true);
          }}
          unreadCount={unreadCount}
        />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconBox}>
            <Ionicons name="camera-outline" size={36} color={Colors.teal} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionSub}>
            To scan a patient's QR code, MedRec needs permission to use your camera.
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
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={records || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, 20) + Spacing.tabBarClearance },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={40} color={Colors.muted} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyText}>No records in this share session</Text>
            </View>
          }
          renderItem={({ item }) => (
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
                <View style={styles.recordIconBox}>
                  <Ionicons
                    name={TYPE_ICONS[item.type] || 'document-outline'}
                    size={20}
                    color={Colors.teal}
                  />
                </View>
                <View style={styles.recordContent}>
                  <Text style={styles.recordTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.recordMetaRow}>
                    <Text style={styles.typePillText}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.recordMetaDate}>{formatDate(item.date)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
              </View>
            </Pressable>
          )}
        />

        {/* Bottom Floating Scan Another Action */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) + 70 },
          ]}
        >
          <Button
            label="Scan Another QR"
            onPress={reset}
            leftIcon={<Ionicons name="qr-code-outline" size={18} color={Colors.white} />}
            style={styles.scanAnotherBtn}
          />
        </View>

        {/* Record Detail Modal */}
        <Modal
          visible={selectedRecord !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedRecord(null)}
        >
          {selectedRecord && (
            <View style={styles.modalRoot}>
              <View style={styles.modalHeader}>
                <DragHandle />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeaderTitle}>Record Details</Text>
                  <Pressable
                    onPress={() => setSelectedRecord(null)}
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
                <View style={styles.modalHeroCard}>
                  <View style={styles.modalIconBox}>
                    <Ionicons
                      name={TYPE_ICONS[selectedRecord.type] || 'document-outline'}
                      size={28}
                      color={Colors.teal}
                    />
                  </View>
                  <Text style={styles.modalTitle}>{selectedRecord.title}</Text>
                  <View style={styles.modalMetaChips}>
                    <View style={styles.metaChip}>
                      <Ionicons name="pricetag-outline" size={12} color={Colors.teal} />
                      <Text style={styles.metaChipText}>
                        {selectedRecord.type.charAt(0).toUpperCase() + selectedRecord.type.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.teal} />
                      <Text style={styles.metaChipText}>{formatDate(selectedRecord.date)}</Text>
                    </View>
                  </View>
                </View>

                {/* Description / Clinical Notes */}
                {selectedRecord.description ? (
                  <View style={styles.notesCard}>
                    <Text style={styles.notesSectionLabel}>CLINICAL NOTES</Text>
                    <Text style={styles.notesText}>{selectedRecord.description}</Text>
                  </View>
                ) : null}

                {/* Read Only Notice */}
                <View style={styles.readOnlyNotice}>
                  <Ionicons name="lock-closed-outline" size={16} color={Colors.teal} />
                  <Text style={styles.readOnlyText}>
                    This record is shared read-only by the patient. It cannot be edited or permanently saved.
                  </Text>
                </View>
              </ScrollView>
            </View>
          )}
        </Modal>

        {/* Side Menu Drawer */}
        <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />

        {/* Notification Center Modal */}
        <NotificationCenterModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScanned}
      />

      {/* Top Floating Controls */}
      <View style={[styles.cameraTopBar, { paddingTop: insets.top + 10 }]}>
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
        <Pressable
          onPress={() => {
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

      {/* Scanner Target Frame */}
      <View style={styles.scanOverlay}>
        <View style={styles.scanHeaderBox}>
          <Text style={styles.scanTitle}>Scan Patient QR Code</Text>
          <Text style={styles.scanSub}>
            Align the doctor access QR code inside the frame
          </Text>
        </View>

        <View style={styles.viewfinder}>
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

      {/* Side Menu Drawer */}
      <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* Notification Center Modal */}
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
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  permissionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    ...Typography.title1,
    textAlign: 'center',
  },
  permissionSub: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 12,
  },
  grantBtn: {
    width: '100%',
    maxWidth: 280,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.redLight,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: Radii.card,
    padding: Spacing.cardPadding,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.red,
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 10,
  },
  recordCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.8,
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordContent: {
    flex: 1,
    gap: 3,
  },
  recordTitle: {
    ...Typography.cardTitle,
    color: Colors.ink,
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePillText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11,
    color: Colors.teal,
  },
  metaDot: {
    fontSize: 10,
    color: Colors.muted,
  },
  recordMetaDate: {
    ...Typography.caption,
    color: Colors.muted,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.muted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screenPadding,
    alignItems: 'center',
  },
  scanAnotherBtn: {
    width: '100%',
    maxWidth: 280,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  /* MODAL */
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  modalHeader: {
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: Spacing.screenPadding,
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
    padding: Spacing.screenPadding,
    gap: 16,
  },
  modalHeroCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    ...Typography.title2,
    textAlign: 'center',
    color: Colors.ink,
  },
  modalMetaChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.tealLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.md,
  },
  metaChipText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11.5,
    color: Colors.teal,
  },
  notesCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.cardPadding,
    gap: 8,
  },
  notesSectionLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.6,
  },
  notesText: {
    ...Typography.body,
    color: Colors.ink,
    lineHeight: 20,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.tealLight,
    padding: 12,
    borderRadius: Radii.md,
  },
  readOnlyText: {
    ...Typography.caption,
    color: Colors.tealDark,
    flex: 1,
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
    paddingHorizontal: Spacing.screenPadding,
    zIndex: 10,
  },
  cameraIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraToolbarIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  cameraNotificationDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.teal,
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
    paddingHorizontal: Spacing.screenPadding,
  },
  scanTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 19,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewfinder: {
    width: 240,
    height: 240,
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
});
