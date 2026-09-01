import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TEAL = '#159A83';
const GREEN_LIGHT = '#DDF5EE';
const INK = '#12343B';
const MUTED = '#64748B';
const BORDER = '#E5F0EE';
const CARD_BG = '#FFFFFF';
const RED = '#DC2626';

export interface AttachedDocumentCardProps {
  photoUri: string;
  onPressInspect: () => void;
  onPressRetake: () => void;
  onPressRemove: () => void;
  accentColor?: string;
}

export const AttachedDocumentCard: React.FC<AttachedDocumentCardProps> = ({
  photoUri,
  onPressInspect,
  onPressRetake,
  onPressRemove,
  accentColor = TEAL,
}) => {
  const handleRemove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Remove Document',
      'Are you sure you want to detach this document image?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onPressRemove,
        },
      ]
    );
  };

  const handleInspect = () => {
    Haptics.selectionAsync();
    onPressInspect();
  };

  const handleRetake = () => {
    Haptics.selectionAsync();
    onPressRetake();
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={handleInspect}
        style={styles.mainRow}
        accessibilityRole="button"
        accessibilityLabel="Inspect attached document thumbnail"
      >
        {/* Document Thumbnail */}
        <View style={styles.thumbWrapper}>
          <Image
            source={{ uri: photoUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.zoomBadge}>
            <Ionicons name="expand-outline" size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Text & Status Info */}
        <View style={styles.infoBox}>
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={13} color={accentColor} />
            <Text style={styles.statusBadgeText}>Document Attached</Text>
          </View>
          <Text style={styles.cardTitle}>Scanned Document Photo</Text>
          <Text style={styles.cardSub}>Tap thumbnail to inspect / zoom</Text>
        </View>
      </Pressable>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleRetake}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Replace or retake document photo"
        >
          <Ionicons name="camera-reverse-outline" size={15} color={accentColor} />
          <Text style={[styles.actionBtnText, { color: accentColor }]}>Replace</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={handleInspect}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="View full document preview"
        >
          <Ionicons name="eye-outline" size={15} color={INK} />
          <Text style={[styles.actionBtnText, { color: INK }]}>Preview</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={handleRemove}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Detach and delete document photo"
        >
          <Ionicons name="trash-outline" size={15} color={RED} />
          <Text style={[styles.actionBtnText, { color: RED }]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GREEN_LIGHT,
    padding: 12,
    gap: 10,
    shadowColor: TEAL,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F4FAF9',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(18, 52, 59, 0.75)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },
  cardTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  cardSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F7F5',
    paddingTop: 8,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12,
    color: TEAL,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5F0EE',
  },
  pressed: {
    opacity: 0.65,
  },
});
export default AttachedDocumentCard;
