import { Image } from 'expo-image';
import { ActivityIndicator, View } from 'react-native';
import { useColors } from '../theme';
import { Icon, Txt } from './core';

export const initialsOf = (name: string | null | undefined) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Round profile photo, falling back to initials on persimmon. `badge` adds the small camera mark that says "tap to change". */
export function Avatar({ name, url, size = 72, badge = false, busy = false }: { name: string | null | undefined; url: string | null | undefined; size?: number; badge?: boolean; busy?: boolean }) {
  const c = useColors();
  const round = { width: size, height: size, borderRadius: size / 2 };
  const mark = Math.round(size * 0.36);
  return (
    <View style={round}>
      {url ? (
        <Image source={{ uri: url }} style={round} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={[round, { backgroundColor: c.persimmon, alignItems: 'center', justifyContent: 'center' }]}>
          <Txt variant="title" color={c.onPersimmon} style={{ fontSize: Math.round(size / 3), lineHeight: Math.round(size / 3) + 4 }}>
            {initialsOf(name) || '?'}
          </Txt>
        </View>
      )}
      {busy && (
        <View style={[round, { position: 'absolute', backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
      {badge && !busy && (
        <View
          style={{ position: 'absolute', right: -2, bottom: -2, width: mark, height: mark, borderRadius: mark / 2, backgroundColor: c.accent, borderWidth: 2, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="camera" size={Math.round(mark * 0.52)} color={c.onAccent} />
        </View>
      )}
    </View>
  );
}
