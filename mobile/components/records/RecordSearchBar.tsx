import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii } from '../../constants/theme';

interface RecordSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export const RecordSearchBar: React.FC<RecordSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search records, diagnoses, doctors...',
  style,
}) => {
  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onClear) {
      onClear();
    } else {
      onChangeText('');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/icons/search.png')}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
          >
            <Ionicons name="close-circle" size={18} color={Colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 12,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    width: 17,
    height: 17,
    resizeMode: 'contain',
    tintColor: Colors.muted,
  },
  input: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: Colors.ink,
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 2,
  },
});
