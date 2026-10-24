import { router } from 'expo-router';
import { View } from 'react-native';
import { formatDate } from '../format';
import type { HealthRecord } from '../lib/api';
import { CATEGORY_META, radius, space, useColors } from '../theme';
import { Icon, Tappable, Txt, type IconName } from './core';

export function CategoryBadge({ category, size = 40 }: { category: string; size?: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={(CATEGORY_META[category]?.icon ?? 'file-document-outline') as IconName} size={size * 0.5} color={c.accent} />
    </View>
  );
}

export function RecordRow({ record }: { record: HealthRecord }) {
  const c = useColors();
  const meta = [formatDate(record.eventDate), record.provider ?? record.facility].filter(Boolean).join(' · ');
  return (
    <Tappable
      onPress={() => router.push({ pathname: '/record/[id]', params: { id: record.id } })}
      accessibilityLabel={`${record.title}, ${CATEGORY_META[record.category]?.label ?? ''}, ${meta}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}
    >
      <CategoryBadge category={record.category} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline" numberOfLines={1}>{record.title}</Txt>
        <Txt variant="caption" color={c.ink3} numberOfLines={1}>{meta}</Txt>
      </View>
      {record.fileCount > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} accessibilityLabel={`${record.fileCount} pages`}>
          <Icon name="paperclip" size={14} color={c.ink3} />
          <Txt variant="micro" color={c.ink3}>{record.fileCount}</Txt>
        </View>
      )}
    </Tappable>
  );
}
