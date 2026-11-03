import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { radius, space, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#4285F4" d="M43.6 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h10.99a9.39 9.39 0 0 1-4.08 6.16v5h6.6c3.86-3.55 6.09-8.77 6.09-14.66Z" />
      <Path fill="#34A853" d="M24 44c5.51 0 10.13-1.83 13.51-4.88l-6.6-5c-1.83 1.23-4.17 1.96-6.91 1.96-5.3 0-9.79-3.58-11.39-8.4H5.8v5.16A20 20 0 0 0 24 44Z" />
      <Path fill="#FBBC05" d="M12.61 27.68a12.1 12.1 0 0 1 0-7.36v-5.16H5.8a20 20 0 0 0 0 17.68l6.81-5.16Z" />
      <Path fill="#EA4335" d="M24 11.92c3 0 5.7 1.03 7.82 3.06l5.86-5.86A19.63 19.63 0 0 0 24 4 20 20 0 0 0 5.8 15.16l6.81 5.16c1.6-4.82 6.1-8.4 11.39-8.4Z" />
    </Svg>
  );
}

/** Visual preview only, by product request. No OAuth request or provider session can start here. */
export function SocialSignIn() {
  const c = useColors();
  const style = { minHeight: 48, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: space.lg, paddingVertical: 10 };
  const row = { maxWidth: '100%' as const, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10 };
  const iconSlot = { width: 24, height: 24, alignItems: 'center' as const, justifyContent: 'center' as const };
  const label = { flexShrink: 1, fontSize: 16, lineHeight: 22 };
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} /><Txt variant="caption" color={c.ink3}>or continue with</Txt><View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </View>
      <Tappable disabled accessibilityLabel="Continue with Google, unavailable for now" style={style}>
        <View style={row}><View style={iconSlot}><GoogleMark /></View><Txt variant="label" style={label}>Continue with Google</Txt></View>
      </Tappable>
      <Tappable disabled accessibilityLabel="Sign in with Apple, unavailable for now" style={[style, { backgroundColor: '#000000', borderColor: '#000000' }]}>
        <View style={row}><View style={iconSlot}><Icon name="apple" size={20} color="#FFFFFF" /></View><Txt variant="label" color="#FFFFFF" style={label}>Sign in with Apple</Txt></View>
      </Tappable>
      <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center', fontSize: 12, lineHeight: 17 }}>Google and Apple sign-in aren’t available yet.</Txt>
    </View>
  );
}
