import { View, Text, Pressable, FlatList, Alert, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../lib/api';
import { StatusBar } from 'expo-status-bar';

const TEAL = '#159A83';
const BLUE = '#1976D2';
const INK = '#12343B';
const MUTED = '#64748B';
const BG = '#F4FAF9';

type Share = { id: string; token: string; expires_at: string; revoked_at: string | null };

function formatExpiry(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function expiryStatus(dateStr: string) {
  const minutes = Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 60000));
  return minutes > 0 ? `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}` : 'Expired';
}

export default function ShareScreen() {
  const params = useLocalSearchParams<{ pendingToken?: string; pendingExpiry?: string }>();
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

  useFocusEffect(useCallback(() => {
    if (params.pendingToken && params.pendingToken !== activeToken) {
      setActiveToken(params.pendingToken);
      setActiveExpiry(params.pendingExpiry ?? null);
    }
    loadShares();
  }, [params.pendingToken, params.pendingExpiry, activeToken]));

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
      if (shares.find((share) => share.id === id)?.token === activeToken) {
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

  const activeShares = shares.filter((share) => !share.revoked_at && new Date(share.expires_at) >= new Date());
  const recentShares = shares.filter((share) => share.revoked_at || new Date(share.expires_at) < new Date());
  const isLoadingQr = !!params.pendingToken && params.pendingToken !== activeToken;

  const ShareCard = ({ share, active }: { share: Share; active: boolean }) => (
    <View style={styles.shareCard}>
      <View style={styles.cardTop}>
        <View style={styles.qrIconBox}><Image source={require('../../assets/icons/qr-white.png')} style={styles.qrAsset} /></View>
        <View style={styles.shareInfo}>
          <Text style={styles.shareName}>{"Doctor" + "'" + "s QR Access"}</Text>
          <Text style={styles.shareDetails}>All records · 60 minute access</Text>
        </View>
        {active ? (
          <Pressable onPress={() => { setActiveToken(share.token); setActiveExpiry(share.expires_at); }}><Text style={styles.viewQr}>View QR</Text></Pressable>
        ) : (
          <Text style={styles.revoked}>Revoked</Text>
        )}
      </View>
      <View style={styles.cardBottom}>
        {active ? (
          <>
            <View style={styles.expiryLine}><Image source={require('../../assets/icons/clock.png')} style={styles.clockAsset} /><Text style={styles.expiryText}>{expiryStatus(share.expires_at)}</Text></View>
            <Pressable onPress={() => handleRevoke(share.id)} disabled={revoking === share.id}>
              {revoking === share.id ? <ActivityIndicator size="small" color="#F04747" /> : <Text style={styles.revoke}>Revoke Access</Text>}
            </Pressable>
          </>
        ) : (
          <Text style={styles.revokedTime}>{share.revoked_at ? `Revoked at ${new Date(share.revoked_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : `Expired ${formatExpiry(share.expires_at)}`}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <FlatList
        data={recentShares}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
            <View style={styles.headerIcons}><Image source={require('../../assets/icons/burger-menu.png')} style={styles.headerAsset} /><View><Image source={require('../../assets/icons/notification-bell.png')} style={styles.headerAsset} /><View style={styles.notificationDot} /></View></View>
            <Text style={styles.title}>Share Records</Text>
            <Text style={styles.subtitle}>Share your health records in a limited time access</Text>
          </View>

          {activeToken ? (
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>{"Doctor" + "'" + "s QR Access"}</Text>
              <Text style={styles.qrSubtitle}>All records · 60 minute access</Text>
              <QRCode value={activeToken} size={142} color="#000" backgroundColor="#fff" />
              {activeExpiry && <Text style={styles.qrExpiry}>{expiryStatus(activeExpiry)}</Text>}
            </View>
          ) : isLoadingQr || creating ? (
            <View style={styles.loadingCard}><ActivityIndicator color={TEAL} /><Text style={styles.qrSubtitle}>Generating QR access...</Text></View>
          ) : (
            <Pressable onPress={handleCreate} style={({ pressed }) => [styles.generateCard, pressed && styles.pressed]}>
              <View style={styles.generateIcon}><Image source={require('../../assets/icons/qr-white.png')} style={styles.whiteQrAsset} /></View>
              <View><Text style={styles.generateTitle}>Share your records with your Doctor</Text><Text style={styles.generateSubtitle}>The QR code will automatically expire in 60 minutes</Text></View>
              <View style={styles.generateButton}><Text style={styles.generateButtonText}>GENERATE QR CODE</Text></View>
            </Pressable>
          )}

          {activeShares.length > 0 && <><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Active</Text><Text style={styles.sectionSubtitle}>Manage your health records</Text></View>{activeShares.map((share) => <ShareCard key={share.id} share={share} active />)}</>}
          {recentShares.length > 0 && <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Recents</Text><Text style={styles.sectionSubtitle}>Expired and Revoked QR codes are shown here</Text></View>}
        </>}
        ListEmptyComponent={activeShares.length === 0 && recentShares.length === 0 ? <View style={styles.empty}><Image source={require('../../assets/icons/qr-white.png')} style={styles.emptyQrAsset} /><Text style={styles.emptyTitle}>No shares yet</Text><Text style={styles.emptyText}>Generate a QR code to share your records with a doctor.</Text></View> : null}
        renderItem={({ item }) => <ShareCard share={item} active={false} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  list: { paddingBottom: 120 },
  header: { paddingHorizontal: 28, paddingBottom: 12 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  notificationDot: { position: 'absolute', right: 0, top: 0, width: 6, height: 6, borderRadius: 3, backgroundColor: TEAL },
  headerAsset: { width: 25, height: 25, resizeMode: 'contain' },
  title: { color: INK, fontFamily: 'LexendDeca-Bold', fontSize: 24 },
  subtitle: { color: MUTED, fontSize: 9, marginTop: 1 },
  generateCard: { marginHorizontal: 28, minHeight: 85, borderRadius: 11, backgroundColor: BLUE, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9, flexWrap: 'wrap', marginBottom: 14 },
  generateIcon: { paddingTop: 2 },
  whiteQrAsset: { width: 29, height: 29, resizeMode: 'contain' },
  generateTitle: { color: '#fff', fontSize: 10, fontWeight: '700', maxWidth: 205 },
  generateSubtitle: { color: '#E7F0FF', fontSize: 7, marginTop: 2 },
  generateButton: { backgroundColor: '#fff', borderRadius: 5, height: 23, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  generateButtonText: { color: '#111', fontSize: 8, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  qrCard: { backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 64, alignItems: 'center', paddingVertical: 10, marginBottom: 5 },
  qrTitle: { fontFamily: 'LexendDeca-Bold', fontSize: 12, color: INK },
  qrSubtitle: { color: MUTED, fontSize: 7.5, marginTop: 2, marginBottom: 7 },
  qrExpiry: { color: MUTED, fontSize: 8, marginTop: 6 },
  loadingCard: { marginHorizontal: 28, height: 110, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  sectionHead: { marginHorizontal: 28, marginTop: 1, marginBottom: 7 },
  sectionTitle: { fontFamily: 'LexendDeca-Bold', fontSize: 13, color: INK },
  sectionSubtitle: { fontSize: 8, color: MUTED, marginTop: 1 },
  shareCard: { marginHorizontal: 28, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10, paddingHorizontal: 10, paddingTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  qrIconBox: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center' },
  qrAsset: { width: 34, height: 34, resizeMode: 'contain', tintColor: TEAL },
  shareInfo: { flex: 1 },
  shareName: { color: INK, fontSize: 11, fontWeight: '700' },
  shareDetails: { color: MUTED, fontSize: 7.5, marginTop: 2 },
  viewQr: { color: BLUE, fontSize: 8, fontWeight: '700', alignSelf: 'flex-start' },
  revoked: { color: '#F04747', fontSize: 8 },
  cardBottom: { marginTop: 5, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#EEF1F2', minHeight: 23, justifyContent: 'center' },
  expiryLine: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 7 },
  clockAsset: { width: 11, height: 11, resizeMode: 'contain' },
  expiryText: { color: MUTED, fontSize: 7.5 },
  revoke: { color: '#F04747', fontSize: 8, marginBottom: 1 },
  revokedTime: { color: MUTED, fontSize: 7, paddingBottom: 2 },
  empty: { alignItems: 'center', paddingTop: 42, paddingHorizontal: 60 },
  emptyQrAsset: { width: 46, height: 46, resizeMode: 'contain', tintColor: '#DDF5EE' },
  emptyTitle: { marginTop: 9, color: INK, fontFamily: 'LexendDeca-Bold', fontSize: 15 },
  emptyText: { color: MUTED, textAlign: 'center', fontSize: 10, marginTop: 5 },
});
