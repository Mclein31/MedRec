import { View, Text, Pressable, FlatList, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../lib/api';

type Share = {
  id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
};

export default function ShareScreen() {
  const [shares, setShares] = useState<Share[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadShares = async () => {
    const data = await api.listShares();
    setShares(data.shares);
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
      await loadShares();
    } catch (err: any) {
      Alert.alert('Failed to create share', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.revokeShare(id);
      await loadShares();
    } catch (err: any) {
      Alert.alert('Failed to revoke', err.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Share Records</Text>

      <Pressable
        onPress={handleCreate}
        disabled={creating}
        style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 8, marginBottom: 16 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {creating ? 'Generating...' : 'Generate Share QR (60 min)'}
        </Text>
      </Pressable>

      {activeToken && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <QRCode value={activeToken} size={200} />
          <Text style={{ marginTop: 8, color: '#888', textAlign: 'center' }}>
            Show this to your doctor. Expires in 60 minutes.
          </Text>
        </View>
      )}

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Active & Past Shares</Text>
      <FlatList
        data={shares}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={{ color: '#888' }}>No shares yet.</Text>}
        renderItem={({ item }) => {
          const expired = new Date(item.expires_at) < new Date();
          const revoked = !!item.revoked_at;
          return (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: '#eee',
              }}
            >
              <View>
                <Text>{revoked ? 'Revoked' : expired ? 'Expired' : 'Active'}</Text>
                <Text style={{ color: '#888', fontSize: 12 }}>
                  Expires {new Date(item.expires_at).toLocaleString()}
                </Text>
              </View>
              {!revoked && !expired && (
                <Pressable onPress={() => handleRevoke(item.id)}>
                  <Text style={{ color: '#FF3B30' }}>Revoke</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
