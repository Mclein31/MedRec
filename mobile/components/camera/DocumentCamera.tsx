import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Animated,
  Linking,
  Pressable,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { ViewfinderOverlay } from './ViewfinderOverlay';
import { CameraControls } from './CameraControls';

const INK = '#12343B';
const TEAL = '#159A83';

export interface DocumentCameraProps {
  onCapture: (photoUri: string) => void;
  onSelectFromGallery: (photoUri: string) => void;
  onClose: () => void;
}

export const DocumentCamera: React.FC<DocumentCameraProps> = ({
  onCapture,
  onSelectFromGallery,
  onClose,
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleToggleTorch = () => {
    setTorchOn((prev) => !prev);
  };

  const triggerShutterFlash = () => {
    flashAnim.setValue(0.85);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    triggerShutterFlash();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        shutterSound: true,
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      } else {
        Alert.alert('Capture Error', 'Could not obtain image from camera.');
      }
    } catch (err: any) {
      Alert.alert('Capture Failed', err?.message || 'Unable to take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSelectGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        onSelectFromGallery(selectedUri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not open photo library.');
    }
  };

  // ─── Permission Check ───────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={styles.permissionRoot}>
        <StatusBar style="light" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            MedRec needs camera permission to scan and digitize medical documents, lab panels, and prescriptions.
          </Text>

          <Pressable
            onPress={async () => {
              const res = await requestPermission();
              if (!res.granted) {
                Linking.openSettings();
              }
            }}
            style={styles.permissionPrimaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Allow camera access"
          >
            <Text style={styles.permissionPrimaryBtnText}>Grant Permission</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={styles.permissionSecondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel and return to form"
          >
            <Text style={styles.permissionSecondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Live Camera Viewport */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        animateShutter={false}
      />

      {/* 3:4 Framing Mask Overlay */}
      <ViewfinderOverlay
        guidanceText="Position document within frame"
        isCapturing={isCapturing}
      />

      {/* Visual Shutter Flash Overlay */}
      <Animated.View
        style={[
          styles.shutterFlash,
          { opacity: flashAnim },
        ]}
        pointerEvents="none"
      />

      {/* Top & Bottom Controls */}
      <CameraControls
        onCapture={handleCapture}
        onSelectGallery={handleSelectGallery}
        onClose={onClose}
        torchOn={torchOn}
        onToggleTorch={handleToggleTorch}
        isCapturing={isCapturing}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  shutterFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 15,
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: '#0A1211',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  permissionTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: INK,
    textAlign: 'center',
  },
  permissionBody: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionPrimaryBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  permissionPrimaryBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  permissionSecondaryBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionSecondaryBtnText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: '#64748B',
  },
});
export default DocumentCamera;
