import { router } from 'expo-router';
import { View } from 'react-native';
import { formatDate } from '../format';
import type { HealthRecord } from '../lib/api';
import { CATEGORY_META, radius, space, useColors } from '../theme';
import { Button, Icon, Tappable, TextLink, Txt } from '../ui/core';
import { Rule } from '../ui/layout';
import { Rise } from '../ui/motion';
import { DateBlock } from '../ui/RecordRow';
import { Remy } from '../ui/Remy';

/** Dark camera stage with a sample page outline; tapping it opens the camera. */
export function CameraStage({ onPress, disabled }: { onPress?: () => void; disabled?: boolean }) {
  const c = useColors();
  const body = (
    <View style={{ backgroundColor: c.panel, borderRadius: radius.lg, paddingVertical: space.xxl, alignItems: 'center', gap: space.lg, overflow: 'hidden' }}>
      <View style={{ width: 160, backgroundColor: '#FFFFFF', padding: space.lg, gap: 8, borderRadius: 2 }}>
        <Txt variant="micro" color="#302238">DOCUMENT</Txt>
        {[1, 0.8, 1, 0.6].map((w, i) => (
          <View key={i} style={{ height: 3, width: `${w * 100}%`, backgroundColor: '#D9CBC6', borderRadius: 2 }} />
        ))}
      </View>
      <Txt variant="caption" color={c.onPanel}>Keep all four corners in view.</Txt>
      <Remy pose="curious" size={64} motion="peek" style={{ position: 'absolute', right: space.md, bottom: space.sm }} />
    </View>
  );
  return onPress ? (
    <Tappable onPress={onPress} disabled={disabled} accessibilityLabel="Take a photo of a document">
      {body}
    </Tappable>
  ) : (
    body
  );
}

/** Shown while AI reads the pages. Lasts exactly as long as the request. */
export function Reading({ pages }: { pages: number }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }} accessibilityLiveRegion="polite">
      <Remy pose="reading" size={150} motion="read" ground />
      <Txt variant="headline">Reading {pages} {pages === 1 ? 'page' : 'pages'}…</Txt>
      <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center' }}>This usually takes 5–15 seconds. You'll check every detail before it's saved.</Txt>
    </View>
  );
}

export function UploadIncomplete({ failed, onRetry, onRemove }: { failed: number; onRetry: () => void; onRemove: () => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="alert" style={{ gap: space.md }}>
      <Icon name="alert-circle-outline" size={40} color={c.danger} />
      <Txt variant="display" style={{ fontSize: 26 }}>Upload incomplete</Txt>
      <Txt>
        {failed === 1 ? "One page didn't" : `${failed} pages didn't`} go through. Your file is still selected. Check your connection and try again.
      </Txt>
      <Txt variant="caption" color={c.danger}>Not saved to your records yet.</Txt>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Button label="Try again" onPress={onRetry} style={{ flex: 1 }} />
        <Button kind="secondary" label="Remove" onPress={onRemove} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export function Saved({ record, onAnother }: { record: HealthRecord; onAnother: () => void }) {
  const c = useColors();
  return (
    <View style={{ gap: space.xl }}>
      <Rise scale={0.8} from={20} style={{ alignSelf: 'center' }}>
        <Remy pose="saved" size={170} motion="cheer" ground />
      </Rise>
      <Rise delay={120}>
        <Txt variant="hero" accessibilityRole="header" accessibilityLiveRegion="polite">Record saved.</Txt>
      </Rise>
      <Rise delay={200}>
        <Txt>Your document and its details are saved together. You can open or share it anytime.</Txt>
      </Rise>
      <Rule />
      <Rise delay={280}>
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <DateBlock iso={record.eventDate} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{record.title}</Txt>
            <Txt variant="caption" color={c.ink3}>
              {CATEGORY_META[record.category]?.short} · {formatDate(record.eventDate, { year: true })}
            </Txt>
          </View>
        </View>
      </Rise>
      <TextLink label="View this record" onPress={() => router.replace({ pathname: '/record/[id]', params: { id: record.id } })} />
      <Button kind="secondary" label="Add another record" onPress={onAnother} />
    </View>
  );
}
