import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';

export interface MedicalRecord {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  created_at?: string;
}

const TYPE_ASSETS: Record<string, any> = {
  consultation: require('../../assets/icons/consultation.png'),
  diagnosis: require('../../assets/icons/diagnosis.png'),
  lab: require('../../assets/icons/lab.png'),
  prescription: require('../../assets/icons/prescription.png'),
  medication: require('../../assets/icons/prescription.png'),
  appointment: require('../../assets/icons/calendar.png'),
  other: require('../../assets/icons/folder.png'),
};

const TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  diagnosis: 'Diagnosis',
  lab: 'Lab Result',
  prescription: 'Prescription',
  medication: 'Medication',
  appointment: 'Appointment',
  other: 'General Record',
};

interface RecordRowProps {
  record: MedicalRecord;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const RecordRow: React.FC<RecordRowProps> = ({
  record,
  onPress,
  onLongPress,
  selectionMode = false,
  isSelected = false,
  isLast = false,
  style,
}) => {
  const typeKey = (record.type || 'other').toLowerCase();
  const typeAsset = TYPE_ASSETS[typeKey] || TYPE_ASSETS.other;
  const typeLabel = TYPE_LABELS[typeKey] || record.type.charAt(0).toUpperCase() + record.type.slice(1);

  const formattedDate = (() => {
    if (!record.date) return '';
    const d = new Date(record.date);
    if (isNaN(d.getTime())) return record.date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  })();

  const handlePress = () => {
    if (selectionMode) {
      Haptics.selectionAsync();
    }
    onPress();
  };

  const handleLongPress = () => {
    if (!selectionMode && onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
          isSelected && styles.rowSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${typeLabel}: ${record.title}, ${formattedDate}`}
        accessibilityState={{ selected: isSelected }}
      >
        {/* Selection Checkbox */}
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && <Ionicons name="checkmark" size={13} color={Colors.white} />}
          </View>
        )}

        {/* 34x34 Squircle Category Icon Box */}
        <View style={styles.iconBox}>
          <Image source={typeAsset} style={styles.iconAsset} />
        </View>

        {/* Center Text Block */}
        <View style={styles.contentBlock}>
          <Text style={styles.titleText} numberOfLines={1}>
            {record.title}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {typeLabel}
            {record.description ? ` • ${record.description.trim()}` : ''}
          </Text>
        </View>

        {/* Trailing Date & Chevron */}
        <View style={styles.trailingBlock}>
          {formattedDate ? <Text style={styles.dateText}>{formattedDate}</Text> : null}
          {!selectionMode && (
            <Ionicons name="chevron-forward" size={15} color={Colors.muted} style={styles.chevron} />
          )}
        </View>
      </Pressable>

      {/* 1px Hairline Divider (aligned with text block) */}
      {!isLast && <View style={styles.hairlineDivider} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 54,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#F8FCFB',
  },
  rowSelected: {
    backgroundColor: Colors.tealLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -2,
  },
  checkboxActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAsset: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  contentBlock: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14.5,
    color: Colors.ink,
    lineHeight: 19,
  },
  subtitleText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
    lineHeight: 15,
  },
  trailingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: Colors.muted,
  },
  chevron: {
    opacity: 0.6,
    marginLeft: 2,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 62, // Aligns flush with text column
  },
});
