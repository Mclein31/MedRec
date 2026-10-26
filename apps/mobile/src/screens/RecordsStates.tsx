import { router } from 'expo-router';
import { View } from 'react-native';
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

export function FirstRecord() {
  const c = useColors();
  return (
    <View style={{ gap: space.lg }}>
      <Txt variant="display" accessibilityRole="header">A home for your health history.</Txt>
      <Remy pose="curious" size={200} motion="peek" ground style={{ alignSelf: 'center' }} />
      <Txt>Add a result, prescription or visit note. You'll always know where to find it.</Txt>
      <Button label="Scan my first document" onPress={() => router.push({ pathname: '/add', params: { source: 'camera' } })} />
      <Button kind="secondary" label="Upload a PDF" onPress={() => router.push({ pathname: '/add', params: { source: 'pdf' } })} />
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
