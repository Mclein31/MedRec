import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { RecordForm, toInput, validate, type FormValue } from '../../src/add/RecordForm';
import { formatDate } from '../../src/format';
import { api, type RecordFile } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORY_META, radius, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { AiPanel } from '../../src/ui/AiPanel';
import { Banner, Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Screen } from '../../src/ui/layout';
import { CategoryBadge } from '../../src/ui/RecordRow';

export default function RecordDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setData, error, loading, reload } = useLoad(() => api.record(id).then((r) => r.record), [id]);
  const [editing, setEditing] = useState<FormValue | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValue, string>>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RecordFile | null>(null);

  const back = (
    <Tappable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} accessibilityLabel="Back to records" hitSlop={10} style={{ width: 44, height: 44, justifyContent: 'center' }}>
      <Icon name="arrow-left" size={24} color={c.ink} />
    </Tappable>
  );

  if (!data) {
    return (
      <Screen tabBar={false}>
        {back}
        {error ? <Banner message={error} action={{ label: 'Retry', onPress: reload }} /> : loading ? <Txt color={c.ink3}>Loading…</Txt> : null}
      </Screen>
    );
  }

  const r = data;
  const startEdit = () =>
    setEditing({ title: r.title, category: r.category, eventDate: r.eventDate ?? '', provider: r.provider ?? '', facility: r.facility ?? '', notes: r.notes ?? '' });

  const saveEdit = async () => {
    if (!editing) return;
    const found = validate(editing);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { record } = await api.updateRecord(r.id, toInput(editing));
      setData({ ...r, ...record, files: record.files ?? r.files });
      setEditing(null);
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const go = async () => {
      try {
        await api.deleteRecord(r.id);
        router.back();
      } catch (err) {
        setActionError(messageFor(err));
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('Delete this record?', `"${r.title}" and its ${r.files.length} ${r.files.length === 1 ? 'page' : 'pages'} will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const meta = [CATEGORY_META[r.category]?.label, formatDate(r.eventDate, { year: true })].filter(Boolean).join(' · ');

  return (
    <Screen tabBar={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {back}
        {!editing && (
          <Tappable onPress={startEdit} accessibilityLabel="Edit record" hitSlop={10} style={{ height: 44, justifyContent: 'center' }}>
            <Txt variant="label" color={c.accent}>Edit</Txt>
          </Tappable>
        )}
      </View>
      {actionError && <Banner message={actionError} />}

      {editing ? (
        <>
          <Txt variant="display" accessibilityRole="header">Edit record</Txt>
          <RecordForm value={editing} onChange={setEditing} errors={errors} />
          <Button label="Save changes" onPress={saveEdit} loading={busy} />
          <Button kind="secondary" label="Cancel" onPress={() => setEditing(null)} />
        </>
      ) : (
        <>
          <View style={{ gap: space.md }}>
            <CategoryBadge category={r.category} size={48} />
            <Txt variant="display" accessibilityRole="header">{r.title}</Txt>
            <Txt color={c.ink3}>{meta}</Txt>
            {(r.provider || r.facility) && <Txt color={c.ink2}>{[r.provider, r.facility].filter(Boolean).join(' · ')}</Txt>}
          </View>

          {r.files.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
              {r.files.map((f, i) => (
                <Tappable
                  key={f.id}
                  onPress={() => (f.contentType.startsWith('image/') ? setViewing(f) : void Linking.openURL(f.url))}
                  accessibilityLabel={`Open page ${i + 1}`}
                  style={{ width: 120, height: 156, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surfaceSunken }}
                >
                  {f.contentType.startsWith('image/') ? (
                    <Image source={{ uri: f.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Icon name="file-pdf-box" size={36} />
                      <Txt variant="micro" color={c.ink3}>PDF · page {i + 1}</Txt>
                    </View>
                  )}
                </Tappable>
              ))}
            </ScrollView>
          )}

          {r.notes && (
            <View style={{ gap: space.sm }}>
              <Txt variant="label" color={c.ink2}>Your notes</Txt>
              <Txt>{r.notes}</Txt>
            </View>
          )}
          {r.ai && <AiPanel ai={r.ai} />}

          <View style={{ gap: space.md }}>
            <Button label="Share this record" icon="qrcode" onPress={() => router.push({ pathname: '/share/new', params: { recordId: r.id } })} />
            <Button kind="danger" label="Delete record" icon="trash-can-outline" onPress={remove} />
          </View>
        </>
      )}

      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)} presentationStyle="fullScreen">
        <Pressable onPress={() => setViewing(null)} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }} accessibilityLabel="Close page" accessibilityRole="button">
          {viewing && <Image source={{ uri: viewing.url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </Screen>
  );
}
