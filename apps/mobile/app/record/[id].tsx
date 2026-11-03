import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, View } from 'react-native';
import { MAX_PAGES, pickFromCamera, pickFromLibrary, pickPdf, uploadPage, type Page } from '../../src/add/pages';
import { RecordForm, toInput, validate, type FormValue } from '../../src/add/RecordForm';
import { formatDate } from '../../src/format';
import { api, type RecordFile } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORY_META, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../../src/ui/core';
import { Screen } from '../../src/ui/layout';
import { Rise, Swap } from '../../src/ui/motion';
import { DocCard, PageThumbs } from '../../src/ui/RecordDoc';
import { Remy } from '../../src/ui/Remy';
import { Sheet } from '../../src/ui/Sheet';

export default function RecordDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setData, error, loading, reload } = useLoad(() => api.record(id).then((r) => r.record), [id]);
  const [editing, setEditing] = useState<FormValue | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValue, string>>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RecordFile | null>(null);
  const [adding, setAdding] = useState<'sheet' | 'uploading' | null>(null);

  // Editing is a mode of the same record: the view clears out, the form settles into its place.
  const flow = (screen: ReactNode) => <Swap id={editing ? 'edit' : 'view'} style={{ flex: 1 }}>{screen}</Swap>;

  if (!data) {
    return flow(
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

  /** Uploads newly picked pages as drafts, then attaches them after the record's current pages. */
  const addPages = async (pick: () => Promise<Page[]>) => {
    setActionError(null);
    try {
      const picked = (await pick()).slice(0, Math.max(0, MAX_PAGES - r.files.length));
      if (!picked.length) return;
      setAdding('uploading');
      const done = await Promise.all(picked.map(uploadPage));
      const ok = done.filter((p) => p.status === 'ready' && p.fileId).map((p) => p.fileId!);
      if (ok.length) {
        const { files } = await api.attachPages(r.id, ok);
        setData({ ...r, files, fileCount: files.length });
      }
      const failed = done.length - ok.length;
      if (failed) setActionError(`${failed === 1 ? "One page didn't" : `${failed} pages didn't`} upload. Check your connection and try again.`);
      setAdding(null);
    } catch (err) {
      setActionError((err as Error).message === 'CAMERA_DENIED' ? 'MedRec needs camera access to photograph pages. Allow it in Settings, or choose photos instead.' : messageFor(err));
      setAdding(null);
    }
  };

  // iOS can't present a picker while the sheet's modal is still animating away.
  const choose = (pick: () => Promise<Page[]>) => {
    setAdding(null);
    setTimeout(() => void addPages(pick), Platform.OS === 'ios' ? 400 : 0);
  };
  const camera = Platform.OS !== 'web';

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
    return flow(
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

  return flow(
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
      {r.files.length < MAX_PAGES && (
        <Button
          kind={r.files.length ? 'ghost' : 'secondary'}
          icon="file-plus-outline"
          label={adding === 'uploading' ? 'Adding pages…' : r.files.length ? 'Add more pages' : 'Attach the document'}
          loading={adding === 'uploading'}
          onPress={() => setAdding('sheet')}
          style={r.files.length ? { minHeight: 44, marginTop: -space.sm } : undefined}
        />
      )}

      <Tappable onPress={() => router.push({ pathname: '/remy', params: { recordId: r.id } })} accessibilityLabel="Have a question? Ask Remy about this record." style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
        <Remy pose="greeting" size={44} motion="idle" />
        <View style={{ flex: 1 }}>
          <Txt variant="headline">Have a question?</Txt>
          <Txt color={c.ink3}>Ask Remy about this record.</Txt>
        </View>
        <Icon name="arrow-right" size={22} color={c.ink} />
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

      <Sheet visible={adding === 'sheet'} onClose={() => setAdding(null)} title="Add pages" message="New pages go after the ones already saved. They aren't read by AI.">
        <View style={{ gap: space.md, paddingBottom: space.xs }}>
          {camera && <Button kind="secondary" icon="camera-outline" label="Take a photo" onPress={() => choose(pickFromCamera)} />}
          <Button kind="secondary" icon="image-outline" label="Choose from photos" onPress={() => choose(() => pickFromLibrary(MAX_PAGES - r.files.length))} />
          <Button kind="secondary" icon="file-upload-outline" label="Upload a PDF" onPress={() => choose(pickPdf)} />
        </View>
      </Sheet>

      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)} presentationStyle="fullScreen">
        <Pressable onPress={() => setViewing(null)} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }} accessibilityLabel="Close page" accessibilityRole="button">
          {viewing && <Image source={{ uri: viewing.url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />}
          <View pointerEvents="none" style={{ position: 'absolute', top: 56, right: space.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
