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

export default function ShareScreen() {
  const [shares, setShares] = useState<Share[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeExpiry, setActiveExpiry] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null); // tracks which share is being revoked

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
      // If the revoked share is the one currently displayed, clear the QR
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share Records</Text>
        <Text style={styles.headerSub}>Generate a temporary QR code for your doctor</Text>
      </View>

      {/* QR display or generate button */}
      {activeToken ? (
        <View style={styles.qrCard}>
          <QRCode value={activeToken} size={180} color={GREEN_DARK} backgroundColor="#fff" />
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

      {/* Share history */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Share History</Text>
      </View>

      <FlatList
        data={shares}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="qr-code-outline" size={40} color={GREEN_LIGHT} />
            <Text style={styles.emptyText}>No shares yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const expired = new Date(item.expires_at) < new Date();
          const revoked = !!item.revoked_at;
          const active = !expired && !revoked;
          const isRevoking = revoking === item.id;

          return (
            <View style={styles.shareCard}>
              <View style={[styles.statusDot, { backgroundColor: active ? GREEN : '#ccc' }]} />
              <View style={styles.shareInfo}>
                <Text style={styles.shareStatus}>
                  {revoked ? 'Revoked' : expired ? 'Expired' : 'Active'}
                </Text>
                <Text style={styles.shareExpiry}>
                  {new Date(item.expires_at).toLocaleString()}
                </Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: GREEN_DARK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: GREEN_MID,
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
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  historyHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GREEN_MID,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: 14,
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shareInfo: {
    flex: 1,
    gap: 2,
  },
  shareStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: GREEN_DARK,
  },
  shareExpiry: {
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
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: GREEN_MID,
  },
});
