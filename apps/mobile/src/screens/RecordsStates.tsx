import { router } from 'expo-router';
import { Platform, View } from 'react-native';
import { GOALS, type Goal } from '../personal';
import { space, useColors } from '../theme';
import { Button, TextLink, Txt } from '../ui/core';
import { Empty } from '../ui/layout';
import { Remy } from '../ui/Remy';
import { RecordSkeleton } from '../ui/RecordRow';

/** First load only: reading Remy plus honest placeholders, no invented percentage. */
export function OpeningRecords() {
  const c = useColors();
  return (
    <View style={{ gap: space.lg }} accessibilityLiveRegion="polite">
      <Txt variant="display" accessibilityRole="header">Opening your records…</Txt>
      <Remy pose="reading" size={170} motion="read" ground style={{ alignSelf: 'center' }} />
      <Txt color={c.ink3}>Getting your documents ready.</Txt>
      <RecordSkeleton />
    </View>
  );
}

const SHORTCUT_ROUTE = { remy: '/remy', share: '/(tabs)/share', medical: '/(tabs)/medical' } as const;

/** Empty Records home. The setup goal picks the words and, where it works without records, a first step. */
export function FirstRecord({ goal = null }: { goal?: Goal | null }) {
  const c = useColors();
  const copy = GOALS[goal ?? 'organize'].home;
  // Sharing needs a record first, so that shortcut waits until there is one.
  const shortcut = goal && goal !== 'visits' ? GOALS[goal].shortcut : null;
  return (
    <View style={{ gap: space.lg }}>
      <Txt variant="display" accessibilityRole="header">{copy.headline}</Txt>
      <Remy pose="curious" size={200} motion="peek" ground style={{ alignSelf: 'center' }} />
      <Txt>{copy.body}</Txt>
      {shortcut?.to === 'medical' && <Button kind="dark" label={shortcut.title} icon="heart-pulse" onPress={() => router.push(SHORTCUT_ROUTE.medical)} />}
      {Platform.OS === 'web' ? (
        <Button label="Add my first record" icon="plus" onPress={() => router.push('/add')} />
      ) : (
        <Button label="Scan my first document" icon="camera-outline" onPress={() => router.push({ pathname: '/add', params: { source: 'camera' } })} />
      )}
      <Button kind="secondary" label="Upload a PDF" icon="file-upload-outline" onPress={() => router.push({ pathname: '/add', params: { source: 'pdf' } })} />
      {shortcut?.to === 'remy' && <TextLink label={shortcut.title} onPress={() => router.push(SHORTCUT_ROUTE.remy)} />}
      <Txt variant="caption" color={c.ink3}>Only you can access your records until you choose to share.</Txt>
    </View>
  );
}

export function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <Empty
      pose="searching"
      motion="search"
      title="No matching records"
      message="Try a different name or date, or clear the search to see everything."
      align="start"
      action={
        <View style={{ gap: space.md }}>
          <Button kind="secondary" label="Clear search" onPress={onClear} />
          <TextLink label="Add a new record instead" onPress={() => router.push('/add')} />
        </View>
      }
    />
  );
}
