import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';
import { formatDate } from '../format';
import type { HealthRecord, RecordFile } from '../lib/api';
import { CATEGORY_META, radius, space, useColors } from '../theme';
import { Eyebrow, Icon, Tappable, Txt } from './core';
import { Rule } from './layout';

/** Paper-style summary card of a record's document: source, title, key facts. */
export function DocCard({ record, pages, kind }: { record: Pick<HealthRecord, 'title' | 'eventDate' | 'provider' | 'facility' | 'category'>; pages: number; kind?: string }) {
  const c = useColors();
  const facts: [string, string][] = [
    ['TYPE', CATEGORY_META[record.category]?.short ?? 'Document'],
    ['DATE', record.eventDate ? formatDate(record.eventDate, { year: true }) : 'Not on the document'],
    ...(record.provider ? ([['DOCTOR', record.provider]] as [string, string][]) : []),
    ['DOCUMENT', pages ? `${pages} ${pages === 1 ? 'page' : 'pages'}${kind ? ` · ${kind}` : ''}` : 'No pages attached'],
  ];
  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, padding: space.xl, gap: space.md }}>
      {record.facility && <Eyebrow>{record.facility}</Eyebrow>}
      <Txt variant="headline" style={{ fontSize: 17 }}>{record.title}</Txt>
      <Rule dashed />
      <View style={{ gap: 4 }}>
        {facts.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', gap: space.lg }}>
            <Txt variant="caption" color={c.ink3} style={{ width: 84 }}>{k}</Txt>
            <Txt variant="caption" color={c.ink2} style={{ flex: 1 }}>{v}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal strip of the record's original pages. */
export function PageThumbs({ files, onOpen }: { files: RecordFile[]; onOpen: (f: RecordFile) => void }) {
  const c = useColors();
  if (!files.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
      {files.map((f, i) => (
        <Tappable
          key={f.id}
          onPress={() => onOpen(f)}
          accessibilityLabel={`Open original page ${i + 1}`}
          style={{ width: 96, height: 124, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surfaceSunken }}
        >
          {f.contentType.startsWith('image/') ? (
            <Image source={{ uri: f.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="file-pdf-box" size={32} color={c.ink} />
              <Txt variant="caption" color={c.ink3}>Page {i + 1}</Txt>
            </View>
          )}
        </Tappable>
      ))}
    </ScrollView>
  );
}
