import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { api } from '../../lib/api';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  consultation: 'people-outline',
  diagnosis: 'medkit-outline',
  lab: 'flask-outline',
  prescription: 'document-text-outline',
  medication: 'medical-outline',
  appointment: 'calendar-outline',
  other: 'ellipsis-horizontal-outline',
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
  const insets = useSafeAreaInsets();

  const handleScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    setError(null);
    try {
      const result = await api.getSharedRecords(data);
      setRecords(result.records);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setScanned(false);
    setRecords(null);
    setError(null);
  };

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionRoot}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={36} color={GREEN} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSub}>
          To scan a patient's QR code, this app needs access to your camera.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.grantBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.grantBtnText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  if (records || error) {
    return (
      <View style={styles.root}>
        {/* Header with safe area */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>
            {error ? 'Could not load records' : 'Shared Records'}
          </Text>
          {!error && (
            <Text style={styles.headerSub}>
              {records?.length} record{records?.length !== 1 ? 's' : ''} shared
            </Text>
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={records || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={40} color={GREEN_LIGHT} />
              <Text style={styles.emptyText}>No records shared</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              {/* Type badge — matches Share Records style */}
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>

              <View style={styles.recordBody}>
                <View style={styles.recordRow}>
                  <View style={styles.recordIconBox}>
                    <Ionicons
                      name={TYPE_ICONS[item.type] || 'document-outline'}
                      size={22}
                      color={GREEN}
                    />
                  </View>
                  <View style={styles.recordContent}>
                    <Text style={styles.recordTitle}>{item.title}</Text>
                    <View style={styles.recordDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={GREEN_MID} />
                      <Text style={styles.recordMeta}>{formatDate(item.date)}</Text>
                    </View>
                  </View>
                </View>

                {/* Description + footer */}
                {item.description && (
                  <Text style={styles.recordDesc}>{item.description}</Text>
                )}

                <View style={styles.recordFooter}>
                  <Ionicons name="folder-open-outline" size={12} color="#aaa" />
                  <Text style={styles.recordFooterText}>Read-only · Shared by patient</Text>
                </View>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <Pressable
            onPress={reset}
            style={({ pressed }) => [styles.scanAgainBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.scanAgainText}>Scan Another</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScanned}
      />

      <View style={styles.scanOverlay}>
        <Text style={styles.scanTitle}>Scan Patient QR Code</Text>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.scanHint}>
          Point your camera at the patient's share QR code
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: GREEN_DARK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: GREEN_MID,
    marginTop: 2,
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: GREEN_DARK,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 14,
    color: GREEN_MID,
    textAlign: 'center',
    lineHeight: 20,
  },
  grantBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  grantBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb3b3',
    padding: 14,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 180,
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    margin: 14,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREEN,
  },
  recordBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordContent: {
    flex: 1,
    gap: 5,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GREEN_DARK,
    lineHeight: 22,
  },
  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recordMeta: {
    fontSize: 12,
    color: GREEN_MID,
  },
  recordDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  recordFooterText: {
    fontSize: 12,
    color: '#aaa',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: GREEN_MID,
  },
  footer: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 16,
  },
  scanAgainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  viewfinder: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: GREEN,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 4 },
  scanHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});