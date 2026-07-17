import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../lib/api';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

type Share = {
  id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ShareScreen() {
  const [shares, setShares] = useState<Share[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeExpiry, setActiveExpiry] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const loadShares = async () => {
    try {
      const data = await api.listShares();
      setShares(data.shares);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadShares();
    }, [])
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await api.createShare(60);
      setActiveToken(data.token);
      setActiveExpiry(data.expiresAt);
      await loadShares();
    } catch (err: any) {
      Alert.alert('Failed to create share', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.revokeShare(id);
      if (shares.find(s => s.id === id)?.token === activeToken) {
        setActiveToken(null);
        setActiveExpiry(null);
      }
      await loadShares();
    } catch (err: any) {
      Alert.alert('Failed to revoke', err.message);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={shares}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <Text style={styles.headerTitle}>Share Records</Text>
              <Text style={styles.headerSub}>
                Generate a temporary QR code for your doctor
              </Text>
            </View>

            {/* QR card or generate button */}
            {activeToken ? (
              <View style={styles.qrCard}>
                <QRCode
                  value={activeToken}
                  size={180}
                  color={GREEN_DARK}
                  backgroundColor="#fff"
                />
                <Text style={styles.qrLabel}>Show this to your doctor</Text>
                {activeExpiry && (
                  <View style={styles.expiryRow}>
                    <Ionicons name="time-outline" size={13} color={GREEN_MID} />
                    <Text style={styles.expiryText}>
                      Expires {new Date(activeExpiry).toLocaleString()}
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() => { setActiveToken(null); setActiveExpiry(null); }}
                  style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.dismissBtnText}>Dismiss</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleCreate}
                disabled={creating}
                style={({ pressed }) => [styles.generateBtn, pressed && { opacity: 0.85 }]}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Share QR (60 min)</Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Section header */}
            {shares.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Share History</Text>
                <Text style={styles.sectionCount}>
                  {shares.length} link{shares.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="qr-code-outline" size={52} color={GREEN_LIGHT} />
            <Text style={styles.emptyTitle}>No shares yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a QR code to share your records with a doctor
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const expired = new Date(item.expires_at) < new Date();
          const revoked = !!item.revoked_at;
          const active = !expired && !revoked;
          const isRevoking = revoking === item.id;

          return (
            <View style={styles.shareCard}>
              {/* Status badge */}
              <View style={[
                styles.statusBadge,
                active ? styles.statusBadgeActive :
                revoked ? styles.statusBadgeRevoked :
                styles.statusBadgeExpired
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  active ? styles.statusBadgeTextActive :
                  revoked ? styles.statusBadgeTextRevoked :
                  styles.statusBadgeTextExpired
                ]}>
                  {revoked ? 'Revoked' : expired ? 'Expired' : 'Active'}
                </Text>
              </View>

              <View style={styles.shareBody}>
                <View style={styles.shareRow}>
                  <View style={styles.shareIconBox}>
                    <Ionicons
                      name="qr-code-outline"
                      size={22}
                      color={active ? GREEN : '#aaa'}
                    />
                  </View>
                  <View style={styles.shareInfo}>
                    <Text style={styles.shareInfoLabel}>Expires</Text>
                    <View style={styles.shareDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={GREEN_MID} />
                      <Text style={styles.shareDateText}>
                        {formatDate(item.expires_at)}
                      </Text>
                    </View>
                  </View>
                  {active && (
                    <Pressable
                      onPress={() => handleRevoke(item.id)}
                      disabled={isRevoking}
                      style={({ pressed }) => [
                        styles.revokeBtn,
                        pressed && { opacity: 0.7 },
                        isRevoking && { opacity: 0.5 },
                      ]}
                    >
                      {isRevoking ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <Text style={styles.revokeBtnText}>Revoke</Text>
                      )}
                    </Pressable>
                  )}
                </View>

                <View style={styles.shareFooter}>
                  <Ionicons name="folder-open-outline" size={12} color="#aaa" />
                  <Text style={styles.shareFooterText}>
                    {revoked ? 'Revoked · ' : expired ? 'Expired · ' : 'Active · '}
                    {formatDate(item.expires_at)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  listContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  qrCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GREEN_DARK,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
    color: GREEN_MID,
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    marginTop: 4,
  },
  dismissBtnText: {
    fontSize: 13,
    color: GREEN_MID,
    fontWeight: '500',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GREEN,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: GREEN_DARK,
  },
  sectionCount: {
    fontSize: 13,
    color: GREEN_MID,
  },
  shareCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    margin: 14,
    marginBottom: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#e8f5f0',
  },
  statusBadgeExpired: {
    backgroundColor: '#f5f5f5',
  },
  statusBadgeRevoked: {
    backgroundColor: '#fff5f5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeTextActive: {
    color: GREEN,
  },
  statusBadgeTextExpired: {
    color: '#aaa',
  },
  statusBadgeTextRevoked: {
    color: '#FF3B30',
  },
  shareBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareInfo: {
    flex: 1,
    gap: 4,
  },
  shareInfoLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: GREEN_DARK,
  },
  shareDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shareDateText: {
    fontSize: 12,
    color: GREEN_MID,
  },
  revokeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
    backgroundColor: '#fff5f5',
    minWidth: 64,
    alignItems: 'center',
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF3B30',
  },
  shareFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  shareFooterText: {
    fontSize: 12,
    color: '#aaa',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GREEN_DARK,
  },
  emptySubtitle: {
    fontSize: 14,
    color: GREEN_MID,
    textAlign: 'center',
    lineHeight: 20,
  },
});