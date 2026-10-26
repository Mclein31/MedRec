import { router } from 'expo-router';
import { Switch, View } from 'react-native';
import { setPrefs, usePrefs, type Prefs } from '../src/prefs';
import { radius, space, useColors } from '../src/theme';
import { Button, Eyebrow, Txt } from '../src/ui/core';
import { Chip } from '../src/ui/form';
import { Group, Row, Screen } from '../src/ui/layout';
import { Remy } from '../src/ui/Remy';

const APPEARANCE: { key: Prefs['appearance']; label: string }[] = [
  { key: 'system', label: 'Device' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function Preferences() {
  const c = useColors();
  const prefs = usePrefs();
  return (
    <Screen tabBar={false} nav={{ title: 'Reading & motion' }} title={'Reading &\nmotion'} footer={<Button kind="dark" label="Done" onPress={() => router.back()} />}>
      <View style={{ gap: space.md }}>
        <Eyebrow>Reading size</Eyebrow>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.sm, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: space.sm }}>
            <Txt variant="display">{'Your records,\neasy to read.'}</Txt>
            <Txt color={c.ink3}>{prefs.largerText ? 'A larger size for easier reading.' : 'A comfortable size for everyday use.'}</Txt>
          </View>
          <Remy pose="reading" size={72} motion="read" />
        </View>
      </View>
      <Group bare>
        <Row
          inset={false}
          icon="format-size"
          title="Larger text"
          subtitle="Makes MedRec's text about 15% larger, on top of your device setting"
          chevron={false}
          accessory={<Switch value={prefs.largerText} onValueChange={(v) => void setPrefs({ largerText: v })} trackColor={{ true: c.accent, false: c.line }} accessibilityLabel="Larger text" />}
        />
        <View style={{ paddingVertical: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
            <Txt variant="headline" style={{ flex: 1 }}>Appearance</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
            {APPEARANCE.map((a) => (
              <View key={a.key} style={{ flex: 1 }}>
                <Chip label={a.label} selected={prefs.appearance === a.key} onPress={() => void setPrefs({ appearance: a.key })} />
              </View>
            ))}
          </View>
          <Txt variant="caption" color={c.ink3}>Device follows your light or dark setting.</Txt>
        </View>
        <Row
          inset={false}
          icon="tune-variant"
          title="Gentler motion"
          subtitle="Remy and screens move less. Your device's Reduce Motion is always respected."
          chevron={false}
          accessory={<Switch value={prefs.gentleMotion} onValueChange={(v) => void setPrefs({ gentleMotion: v })} trackColor={{ true: c.accent, false: c.line }} accessibilityLabel="Gentler motion" />}
        />
      </Group>
      <Txt variant="caption" color={c.ink3}>Every action stays available, with less movement.</Txt>
    </Screen>
  );
}
