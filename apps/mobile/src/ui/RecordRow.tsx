import { router } from 'expo-router';
import { View } from 'react-native';
import { formatDate } from '../format';
import type { HealthRecord } from '../lib/api';
import { CATEGORY_META, space, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';

/** "22 / OCT" day-and-month block that leads every record row. */
export function DateBlock({ iso }: { iso: string | null }) {
  const c = useColors();
  const d = iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`) : null;
  return (
    <View style={{ width: 46 }} accessible={false}>
      <Txt variant="numeral" style={{ fontSize: 28, lineHeight: 32 }}>{d ? d.getUTCDate() : '—'}</Txt>
      <Txt variant="micro" color={c.ink2}>
        {d ? d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }).toUpperCase() : 'NO DATE'}
      </Txt>
    </View>
  );
}

export function RecordRow({ record, onPress }: { record: HealthRecord; onPress?: () => void }) {
  const c = useColors();
  const meta = [CATEGORY_META[record.category]?.short, record.provider ?? record.facility].filter(Boolean).join(' · ');
  return (
    <Tappable
      onPress={onPress ?? (() => router.push({ pathname: '/record/[id]', params: { id: record.id } }))}
      accessibilityLabel={`${record.title}, ${meta}, ${formatDate(record.eventDate, { year: true })}${record.fileCount ? `, ${record.fileCount} pages` : ''}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, paddingVertical: space.lg }}
    >
      <DateBlock iso={record.eventDate} />
      <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
        <Txt variant="headline" style={{ fontSize: 17 }} numberOfLines={2}>{record.title}</Txt>
        <Txt variant="caption" color={c.ink3} numberOfLines={1}>{meta}</Txt>
      </View>
      {record.fileCount > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 4 }}>
          <Icon name="paperclip" size={14} color={c.ink3} />
          <Txt variant="caption" color={c.ink3}>{record.fileCount}</Txt>
        </View>
      )}
    </Tappable>
  );
}

/** Honest placeholder rows shown only while the first page of records is loading. */
export function RecordSkeleton({ rows = 3 }: { rows?: number }) {
  const c = useColors();
  return (
    <View accessibilityLabel="Loading records" accessible style={{ gap: space.xl, paddingVertical: space.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.lg }}>
          <View style={{ gap: 6 }}>
            <View style={{ width: 32, height: 22, borderRadius: 6, backgroundColor: c.line }} />
            <View style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: c.line }} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: `${82 - i * 8}%`, height: 14, borderRadius: 7, backgroundColor: c.line }} />
            <View style={{ width: '58%', height: 10, borderRadius: 5, backgroundColor: c.surfaceSunken }} />
          </View>
        </View>
      ))}
    </View>
  );
}
