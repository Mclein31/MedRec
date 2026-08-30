import { View, Text, Pressable, FlatList, Alert, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../lib/api';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { SideMenuModal } from '../../components/menu/SideMenuModal';

const TEAL = '#159A83';
const BLUE = '#1976D2';
const INK = '#12343B';
const MUTED = '#64748B';
const BORDER = '#E5F0EE';
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
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const loadShares = async () => {
    try {
      const data = await api.listShares();
      setShares(data.shares);
    } catch (err: any) {
      Alert.alert('Error loading shares', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadShares();
      if (params.pendingToken) {
        setActiveToken(params.pendingToken);
        setActiveExpiry(params.pendingExpiry ?? null);
      }
    }, [params.pendingToken, params.pendingExpiry])
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

  const handleRevoke = (id: string) => {
    Alert.alert('Revoke access', 'Are you sure you want to revoke this QR code?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setRevoking(id);
          try {
            await api.revokeShare(id);
            if (activeToken && shares.find((s) => s.id === id)?.token === activeToken) {
              setActiveToken(null);
              setActiveExpiry(null);
            }
            await loadShares();
          } catch (err: any) {
            Alert.alert('Failed to revoke', err.message);
          } finally {
            setRevoking(null);
          }
        },
      },
    ]);
  };

  const activeShares = shares.filter((s) => !s.revoked_at && new Date(s.expires_at) > new Date());
  const recentShares = shares.filter((s) => s.revoked_at || new Date(s.expires_at) <= new Date());
  const isLoadingQr = Boolean(params.pendingToken) && !activeToken;

  const ShareCard = ({ share, active }: { share: Share; active: boolean }) => (
    <View style={[styles.shareCard, active && styles.activeShareCard]}>
      {/* TOP CONTENT */}
      <View style={styles.cardTop}>
        <View style={styles.qrIconBox}>
          <Image
            source={require('../../assets/icons/qr-white.png')}
            style={styles.qrAsset}
          />
        </View>

        <View style={styles.shareInfo}>
          <Text style={styles.shareName}>
            {"Doctor" + "'" + "s QR Access"}
          </Text>

          <Text style={styles.shareDetails}>
            All records · 60 minute access
          </Text>

          {active && (
            <View style={styles.expiryLine}>
              <Image
                source={require('../../assets/icons/clock.png')}
                style={styles.clockAsset}
              />
              <Text style={styles.expiryText}>
                {expiryStatus(share.expires_at)}
              </Text>
            </View>
          )}
        </View>

        {active ? (
          <Pressable
            onPress={() => {
              setActiveToken(share.token);
              setActiveExpiry(share.expires_at);
            }}
          >
            <Text style={styles.viewQr}>
              View QR
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.revoked}>
            Revoked
          </Text>
        )}
      </View>

      {/* BOTTOM ACTION */}
      {active ? (
        <View style={styles.revokeContainer}>
          <Pressable
            onPress={() => handleRevoke(share.id)}
            disabled={revoking === share.id}
          >
            {revoking === share.id ? (
              <ActivityIndicator size="small" color="#F04747" />
            ) : (
              <Text style={styles.revoke}>
                Revoke Access
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardBottom}>
          <Text style={styles.revokedTime}>
            {share.revoked_at
              ? `Revoked at ${new Date(share.revoked_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}`
              : `Expired ${formatExpiry(share.expires_at)}`}
          </Text>
        </View>
      )}
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
            <View style={styles.headerIcons}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setMenuVisible(true);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
              >
                <Image source={require('../../assets/icons/burger-menu.png')} style={styles.headerAsset} />
              </Pressable>
              <View>
                <Image source={require('../../assets/icons/notification-bell.png')} style={styles.headerAsset} />
                <View style={styles.notificationDot} />
              </View>
            </View>
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

      {/* Side Menu Drawer */}
      <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: BG 
  },

  list: { 
    paddingBottom: 120 
  },

  header: { 
    paddingHorizontal: 28, 
    paddingBottom: 12 
  },

  headerIcons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 18 
  },

  notificationDot: { 
    position: 'absolute', 
    right: 0, 
    top: 0, 
    width: 9, 
    height: 9, 
    borderRadius: 6, 
    backgroundColor: TEAL 
  },

  headerAsset: { 
    width: 25, 
    height: 25, 
    resizeMode: 'contain' 
  },

  title: { 
    color: INK, 
    fontFamily: 'LexendDeca-Bold', 
    fontSize: 30 
  },

  subtitle: { 
    color: MUTED, 
    fontSize: 11, 
    marginTop: 0 
  },


  // GENERATE QR CARD

  generateCard: { 
    marginHorizontal: 28, 
    minHeight: 125, 
    borderRadius: 11, 
    backgroundColor: BLUE, 
    padding: 11, 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 9, 
    flexWrap: 'wrap', 
    marginBottom: 14 
  },

  generateIcon: {
    paddingTop: 2 
  },

  whiteQrAsset: { 
    width: 40, 
    height: 40, 
    resizeMode: 'contain' 
  },

  generateTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700', 
    maxWidth: 300,
  },

  generateSubtitle: { 
    color: '#E7F0FF', 
    fontSize: 10, 
    marginTop: 2,
    marginBottom: 35,
  },

  generateButton: { 
    backgroundColor: '#fff', 
    borderRadius: 7, 
    height: 30, 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: -2 
  },

  generateButtonText: { 
    color: '#111', 
    fontSize: 12, 
    fontWeight: '800' 
  },

  pressed: { 
    opacity: 0.8 
  },


  // ACTIVE QR

  qrCard: { 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    marginHorizontal: 64, 
    alignItems: 'center', 
    paddingVertical: 10, 
    marginBottom: 5 
  },

  qrTitle: { 
    fontFamily: 'LexendDeca-Bold', 
    fontSize: 22, 
    color: INK 
  },

  qrSubtitle: { 
    color: MUTED, 
    fontSize: 11, 
    marginTop: 2, 
    marginBottom: 7 
  },

  qrExpiry: { 
    color: MUTED, 
    fontSize: 11, 
    marginTop: 6 
  },


  loadingCard: { 
    marginHorizontal: 28, 
    height: 110, 
    borderRadius: 10, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    marginBottom: 12 
  },


  // SECTIONS

  sectionHead: { 
    marginHorizontal: 28, 
    marginTop: 1, 
    marginBottom: 7 
  },

  sectionTitle: { 
    fontFamily: 'LexendDeca-Bold', 
    fontSize: 24, 
    color: INK 
  },

  sectionSubtitle: { 
    fontSize: 12, 
    color: MUTED, 
    marginTop: 0,
    marginBottom: 7, 
  },


  // SHARE CARD (UPDATED)

  shareCard: { 
    marginHorizontal: 28,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 10,

    overflow: 'hidden',
  },

  activeShareCard: {
    borderWidth: 1.5,
    borderColor: BLUE,
  },

  cardTop: { 
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    gap: 10,
  },


  qrIconBox: { 
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center'
  },


  qrAsset: { 
    width: 30,
    height: 30,
    resizeMode: 'contain',
    tintColor: TEAL
  },


  shareInfo: { 
    flex: 1 
  },


  shareName: { 
    color: INK,
    fontSize: 14,
    fontWeight: '700'
  },


  shareDetails: { 
    color: MUTED,
    fontSize: 11,
    marginTop: 2
  },


  viewQr: { 
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start'
  },


  revoked: { 
    color: '#F04747',
    fontSize: 11
  },


  // EXPIRY ABOVE DIVIDER

  expiryLine: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5
  },


  clockAsset: { 
    width: 11,
    height: 11,
    resizeMode: 'contain'
  },


  expiryText: { 
    color: MUTED,
    fontSize: 9
  },


  // REVOKE SECTION

  revokeContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F2',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },


  revoke: { 
    color: '#F04747',
    fontSize: 12,
    fontWeight: '500'
  },


  cardBottom: { 
    borderTopWidth: 1,
    borderTopColor: '#EEF1F2',
    paddingHorizontal: 10,
    paddingVertical: 7
  },


  revokedTime: { 
    color: MUTED,
    fontSize: 11,
    paddingBottom: 2
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },

  emptyQrAsset: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    tintColor: TEAL,
    opacity: 0.5,
    marginBottom: 8,
  },

  emptyTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },

  emptyText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
});
