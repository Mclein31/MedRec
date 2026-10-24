import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { radius, space, useColors } from '../theme';
import { Icon, Tappable, Txt } from '../ui/core';
import type { Page } from './pages';

export function PageStrip({ pages, onRemove, onRetry }: { pages: Page[]; onRemove: (key: string) => void; onRetry: (key: string) => void }) {
  const c = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingVertical: space.xs }}>
      {pages.map((p, i) => (
        <View key={p.key} style={{ width: 96, gap: 6 }}>
          <View style={{ width: 96, height: 124, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: c.surfaceSunken, borderWidth: 1, borderColor: p.status === 'failed' ? c.danger : c.line }}>
            {p.kind === 'image' ? (
              <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`Page ${i + 1}`} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 }}>
                <Icon name="file-pdf-box" size={32} color={c.ink2} />
                <Txt variant="micro" color={c.ink3} numberOfLines={2} style={{ textAlign: 'center' }}>{p.name ?? 'PDF'}</Txt>
              </View>
            )}
            {p.status === 'uploading' && (
              <View style={{ ...absolute, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <Tappable onPress={() => onRemove(p.key)} accessibilityLabel={`Remove page ${i + 1}`} hitSlop={6} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={16} color={c.ink} />
            </Tappable>
          </View>
          {p.status === 'failed' ? (
            <Tappable onPress={() => onRetry(p.key)} accessibilityLabel={`Upload page ${i + 1} again`}>
              <Txt variant="micro" color={c.danger}>Failed · Retry</Txt>
            </Tappable>
          ) : (
            <Txt variant="micro" color={c.ink3}>Page {i + 1}</Txt>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const absolute = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
