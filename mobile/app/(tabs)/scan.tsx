import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { api } from '../../lib/api';

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

  // Permission state hasn't loaded yet.
  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ marginBottom: 12, textAlign: 'center' }}>
          Camera access is needed to scan a patient's share QR code.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white' }}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  if (records || error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
          {error ? 'Could not load records' : 'Shared Records'}
        </Text>
        {error && <Text style={{ color: '#FF3B30', marginBottom: 12 }}>{error}</Text>}
        <FlatList
          data={records || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
              <Text style={{ color: '#888' }}>
                {item.type} · {item.date}
              </Text>
              {item.description && <Text>{item.description}</Text>}
            </View>
          )}
        />
        <Pressable
          onPress={reset}
          style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 8, marginTop: 12 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Scan Another
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScanned}
      />
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </View>
  );
}
