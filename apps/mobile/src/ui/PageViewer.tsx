import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, ScrollView, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RecordFile } from '../lib/api';
import { radius, space } from '../theme';
import { Button, Icon, Tappable, Txt } from './core';

/** Opens the record's original document: one PDF goes straight to the system viewer, anything else pages in-app. */
export function openOriginal(files: RecordFile[], show: (index: number) => void) {
  if (files.length === 1 && files[0]!.contentType === 'application/pdf') void Linking.openURL(files[0]!.url);
  else if (files.length) show(0);
}

/**
 * Every page of a record, full screen, swiped left and right. Photos show in place; a PDF page
 * (which can hold several pages of its own) opens in the system viewer. Always dark, like a photo viewer.
 */
export function PageViewer({ files, index, onClose }: { files: RecordFile[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  const [current, setCurrent] = useState(index ?? 0);
  const open = index !== null && files.length > 0;

  useEffect(() => {
    if (index === null) return;
    setCurrent(index);
    // Wait a frame so the modal's ScrollView has its width before jumping.
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: index * width, animated: false }));
  }, [index, width]);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(files.length - 1, i));
    setCurrent(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };
  const file = files[current];
  const many = files.length > 1;
  const round = { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={many}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {files.map((f, i) => (
            <View key={f.id} style={{ width, height, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`Page ${i + 1} of ${files.length}`}>
              {f.contentType.startsWith('image/') ? (
                <Image source={{ uri: f.url }} style={{ width, height: height - insets.top - insets.bottom - 140 }} contentFit="contain" />
              ) : (
                <View style={{ alignItems: 'center', gap: space.lg, padding: space.xxl, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)', width: Math.min(width - 48, 320) }}>
                  <Icon name="file-pdf-box" size={64} color="#FFFFFF" />
                  <Txt variant="headline" color="#FFFFFF" style={{ textAlign: 'center' }}>PDF document</Txt>
                  <Txt variant="caption" color="rgba(255,255,255,0.7)" style={{ textAlign: 'center' }}>All of this PDF's pages open in your phone's document viewer.</Txt>
                  <Button kind="gold" icon="open-in-new" label="Open PDF" onPress={() => void Linking.openURL(f.url)} style={{ alignSelf: 'stretch' }} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={{ position: 'absolute', top: insets.top + space.sm, left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="label" color="#FFFFFF" accessibilityLiveRegion="polite">{many ? `Page ${current + 1} of ${files.length}` : file?.contentType === 'application/pdf' ? 'PDF' : 'Original'}</Txt>
          <Tappable onPress={onClose} accessibilityLabel="Close pages" style={round}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </Tappable>
        </View>

        {many && (
          <View style={{ position: 'absolute', bottom: insets.bottom + space.lg, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl }}>
            <Tappable onPress={() => go(current - 1)} disabled={current === 0} dimmed={current === 0} accessibilityLabel="Previous page" style={round}>
              <Icon name="chevron-left" size={28} color="#FFFFFF" />
            </Tappable>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {files.map((f, i) => <View key={f.id} style={{ width: i === current ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === current ? '#F4CD63' : 'rgba(255,255,255,0.4)' }} />)}
            </View>
            <Tappable onPress={() => go(current + 1)} disabled={current === files.length - 1} dimmed={current === files.length - 1} accessibilityLabel="Next page" style={round}>
              <Icon name="chevron-right" size={28} color="#FFFFFF" />
            </Tappable>
          </View>
        )}
      </View>
    </Modal>
  );
}
