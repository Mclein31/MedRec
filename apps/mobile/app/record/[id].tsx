import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, View } from 'react-native';
import { RecordForm, toInput, validate, type FormValue } from '../../src/add/RecordForm';
import { formatDate } from '../../src/format';
import { api, type RecordFile } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORY_META, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../../src/ui/core';
import { Screen } from '../../src/ui/layout';
import { Rise } from '../../src/ui/motion';
import { DocCard, PageThumbs } from '../../src/ui/RecordDoc';
import { Remy } from '../../src/ui/Remy';

export default function RecordDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setData, error, loading, reload } = useLoad(() => api.record(id).then((r) => r.record), [id]);
  const [editing, setEditing] = useState<FormValue | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValue, string>>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RecordFile | null>(null);

  if (!data) {
    return (
      <Screen tabBar={false} nav={{ title: 'Record details' }}>
        {error ? <Banner message={error} action={{ label: 'Retry', onPress: reload }} /> : loading ? <Remy pose="reading" motion="read" size={140} style={{ alignSelf: 'center' }} /> : null}
      </Screen>
    );
  }

  const r = data;
  const open = (f: RecordFile) => (f.contentType.startsWith('image/') ? setViewing(f) : void Linking.openURL(f.url));
  const kind = r.files.length ? (r.files.every((f) => f.contentType === 'application/pdf') ? 'PDF' : r.files.every((f) => f.contentType.startsWith('image/')) ? 'Photo' : 'Mixed') : undefined;

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

  if (editing) {
    return (
      <Screen
        tabBar={false}
        nav={{ title: 'Edit record', back: 'close', onBack: () => setEditing(null) }}
        footer={<Button label="Save changes" onPress={saveEdit} loading={busy} />}
      >
        {actionError && <Banner message={actionError} />}
        <RecordForm value={editing} onChange={setEditing} errors={errors} />
      </Screen>
    );
  }

  const headerActions = (
    <View style={{ flexDirection: 'row' }}>
      <Tappable onPress={() => setEditing({ title: r.title, category: r.category, eventDate: r.eventDate ?? '', provider: r.provider ?? '', facility: r.facility ?? '', notes: r.notes ?? '' })} accessibilityLabel="Edit record" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="pencil-outline" size={22} color={c.ink} />
      </Tappable>
      <Tappable onPress={() => router.push({ pathname: '/share/new', params: { recordId: r.id } })} accessibilityLabel="Share this record" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="share-variant-outline" size={22} color={c.ink} />
      </Tappable>
    </View>
  );

  return (
    <Screen
      tabBar={false}
      nav={{ title: 'Record details', right: headerActions }}
      eyebrow={<Eyebrow>{`${CATEGORY_META[r.category]?.short ?? 'Record'}  /  ${r.eventDate ? formatDate(r.eventDate, { year: true }) : 'Undated'}`}</Eyebrow>}
      title={r.title}
      subtitle={[r.facility, r.provider].filter(Boolean).join(' · ') || undefined}
      footer={
        r.ai ? (
          <Button kind="dark" label="Explain this record" onPress={() => router.push({ pathname: '/record/explain', params: { id: r.id } })} />
        ) : (
          <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center' }}>No AI reading was saved with this record, so there's nothing to explain yet.</Txt>
        )
      }
    >
      {actionError && <Banner message={actionError} />}
      <Rise scale={0.97}>
        <DocCard record={r} pages={r.files.length} kind={kind} />
      </Rise>
      <PageThumbs files={r.files} onOpen={open} />
      {r.files[0] && <Button kind="secondary" label={`Open original ${kind === 'PDF' ? 'PDF' : 'document'}`} onPress={() => open(r.files[0]!)} />}

      <Tappable onPress={() => router.push({ pathname: '/remy', params: { recordId: r.id } })} accessibilityLabel="Have a question? Ask Remy about this record." style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
        <Remy pose="greeting" size={44} motion="idle" />
        <View style={{ flex: 1 }}>
          <Txt>Have a question?</Txt>
          <Txt>Ask Remy about this record.</Txt>
        </View>
      </Tappable>

      {r.notes && (
        <View style={{ gap: space.sm }}>
          <Eyebrow>Your notes</Eyebrow>
          <Txt>{r.notes}</Txt>
        </View>
      )}

      <Tappable onPress={remove} accessibilityLabel="Delete record" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, alignSelf: 'flex-start' }}>
        <Icon name="trash-can-outline" size={20} color={c.danger} />
        <Txt variant="label" color={c.danger}>Delete record</Txt>
      </Tappable>

      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)} presentationStyle="fullScreen">
        <Pressable onPress={() => setViewing(null)} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }} accessibilityLabel="Close page" accessibilityRole="button">
          {viewing && <Image source={{ uri: viewing.url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </Screen>
  );
}
