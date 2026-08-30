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
import { Colors, Radii } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

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
  const { screenPadding, inputHeight, scaleFont } = useResponsive();

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onClear) {
      onClear();
    } else {
      onChangeText('');
    }
  };

  return (
    <View style={[styles.container, { paddingHorizontal: screenPadding }, style]}>
      <View style={[styles.inputWrapper, { height: Math.max(44, inputHeight - 4) }]}>
        <Image
          source={require('../../assets/icons/search.png')}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          style={[styles.input, { fontSize: scaleFont(13, 12, 14.5) }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          maxFontSizeMultiplier={1.35}
        />
        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            hitSlop={10}
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
    marginBottom: 12,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
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
    color: Colors.ink,
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecordSearchBar;
