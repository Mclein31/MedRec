import * as Haptics from 'expo-haptics';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';
import { useColors } from '../../src/theme';

/**
 * The system tab bar: UITabBarController on iOS (Liquid Glass on iOS 26, with the sidebar on iPad)
 * and the Material 3 navigation bar on Android. The system owns selection, the active indicator,
 * press feedback, safe areas and VoiceOver/TalkBack semantics; this file only supplies the brand
 * colours. "Add record" is no longer a fake centre tab: it lives in the Records header.
 */
export default function TabsLayout() {
  const c = useColors();
  const ios = Platform.OS === 'ios';
  // Same backdrop behind every tab, so the bar never samples a different colour per tab.
  const content = { backgroundColor: c.bg };
  return (
    <NativeTabs
      tintColor={ios ? c.persimmon : c.ink}
      iconColor={{ default: c.ink3, selected: ios ? c.persimmon : c.ink }}
      labelStyle={{ default: { color: c.ink3, fontFamily: 'DMSans-Medium' }, selected: { color: c.ink, fontFamily: 'DMSans-SemiBold' } }}
      backgroundColor={ios ? undefined : c.bg}
      disableTransparentOnScrollEdge
      indicatorColor={c.accentSoft}
      rippleColor={c.accentSoft}
      minimizeBehavior="onScrollDown"
      sidebarAdaptable
      screenListeners={{ tabPress: () => { if (ios) void Haptics.selectionAsync(); } }}
    >
      <NativeTabs.Trigger name="index" contentStyle={content} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
        <NativeTabs.Trigger.Label>Records</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="share" contentStyle={content} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf="qrcode" md="qr_code_2" />
        <NativeTabs.Trigger.Label>Share</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="medical" contentStyle={content} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart.text.square', selected: 'heart.text.square.fill' }} md="medical_information" />
        <NativeTabs.Trigger.Label>Medical ID</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" contentStyle={content} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
