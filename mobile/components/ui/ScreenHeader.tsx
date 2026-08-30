import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography } from '../../constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onPressMenu?: () => void;
  onPressNotifications?: () => void;
  unreadCount?: number;
  rightElement?: React.ReactNode;
  hideToolbar?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onPressMenu,
  onPressNotifications,
  unreadCount = 0,
  rightElement,
  hideToolbar = false,
}) => {
  const insets = useSafeAreaInsets();

  const handleMenuPress = () => {
    Haptics.selectionAsync();
    onPressMenu?.();
  };

  const handleNotificationsPress = () => {
    Haptics.selectionAsync();
    onPressNotifications?.();
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 14 }]}>
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

      <Text style={styles.titleText}>{title}</Text>
      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBtn: {
    padding: 2,
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
    width: 25,
    height: 25,
  },
  notificationDot: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.teal,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  titleText: {
    ...Typography.display,
    color: Colors.ink,
  },
  subtitleText: {
    ...Typography.subtitle,
    color: Colors.muted,
    marginTop: 2,
  },
});
