import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onPressMenu?: () => void;
  onPressNotifications?: () => void;
  unreadCount?: number;
  rightElement?: React.ReactNode;
  hideToolbar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onPressMenu,
  onPressNotifications,
  unreadCount = 0,
  rightElement,
  hideToolbar = false,
  style,
}) => {
  const { screenPadding, insets, scaleFont } = useResponsive();

  const handleMenuPress = () => {
    Haptics.selectionAsync();
    onPressMenu?.();
  };

  const handleNotificationsPress = () => {
    Haptics.selectionAsync();
    onPressNotifications?.();
  };

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top + 12,
          paddingLeft: Math.max(insets.left, screenPadding),
          paddingRight: Math.max(insets.right, screenPadding),
        },
        style,
      ]}
    >
      {!hideToolbar && (
        <View style={styles.topToolbar}>
          {onPressMenu ? (
            <Pressable
              onPress={handleMenuPress}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
            >
              <Image
                source={require('../../assets/icons/burger-menu.png')}
                style={styles.toolbarIcon}
              />
            </Pressable>
          ) : (
            <View style={styles.emptyIconPlaceholder} />
          )}

          {rightElement ? (
            rightElement
          ) : onPressNotifications ? (
            <Pressable
              onPress={handleNotificationsPress}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
            >
              <Image
                source={require('../../assets/icons/notification-bell.png')}
                style={styles.toolbarIcon}
              />
              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </Pressable>
          ) : (
            <View style={styles.emptyIconPlaceholder} />
          )}
        </View>
      )}

      <Text
        style={[
          styles.titleText,
          { fontSize: scaleFont(26, 22, 30), lineHeight: scaleFont(32, 28, 36) },
        ]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.35}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitleText,
            { fontSize: scaleFont(12, 11, 13.5), lineHeight: scaleFont(17, 15, 18) },
          ]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.35}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 12,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.75,
  },
  toolbarIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  emptyIconPlaceholder: {
    width: 40,
    height: 40,
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 10,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.teal,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  titleText: {
    ...Typography.screenTitle,
    color: Colors.ink,
  },
  subtitleText: {
    ...Typography.subtitle,
    color: Colors.muted,
    marginTop: 2,
  },
});

export default ScreenHeader;
