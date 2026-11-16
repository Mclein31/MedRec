import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Reading } from '../../src/add/AddParts';
import { MAX_PAGES, pickFromCamera, pickFromLibrary, pickPdf, uploadPage, type Page } from '../../src/add/pages';
import { RecordForm, toInput, validate, type FormValue } from '../../src/add/RecordForm';
import { formatDate } from '../../src/format';
import { api, type AiSnapshot, type RecordFile } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORY_META, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { AiPanel } from '../../src/ui/AiPanel';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../../src/ui/core';
import { Screen } from '../../src/ui/layout';
import { Rise, Swap } from '../../src/ui/motion';
import { openOriginal, PageViewer } from '../../src/ui/PageViewer';
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
  const [viewer, setViewer] = useState<number | null>(null);
  const [adding, setAdding] = useState<'sheet' | 'uploading' | 'added' | null>(null);
  /** AI reading to save with the edit: undefined keeps the record's current one. */
  const [editAi, setEditAi] = useState<AiSnapshot | null | undefined>(undefined);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
  const files = r.files ?? [];
  const open = (f: RecordFile) => setViewer(Math.max(0, files.findIndex((x) => x.id === f.id)));
  const fields = (): FormValue => ({ title: r.title, category: r.category, eventDate: r.eventDate ?? '', provider: r.provider ?? '', facility: r.facility ?? '', notes: r.notes ?? '' });
  const startEdit = () => { setEditAi(undefined); setNotice(null); setErrors({}); setEditing(fields()); };
  const stopEdit = () => { setEditing(null); setEditAi(undefined); setNotice(null); };

  /** Reads every page of the record with AI and opens the edit form with what it found, for the person to check. */
  const readWithAi = async () => {
    setAdding(null);
    setActionError(null);
    setReading(true);
    try {
      const { draft } = await api.scan(files.map((f) => f.id));
      const { title, category, eventDate, provider, facility, legible, ...snapshot } = draft;
      setErrors({});
      setEditing({ title: title || r.title, category, eventDate: eventDate ?? r.eventDate ?? '', provider: provider ?? r.provider ?? '', facility: facility ?? r.facility ?? '', notes: r.notes ?? '' });
      setEditAi(snapshot);
      setNotice(legible ? null : 'Parts of a page were hard to read. Check each field, or retake a sharper photo.');
    } catch (err) {
      setActionError(`${messageFor(err)} You can still edit the details yourself.`);
    } finally {
      setReading(false);
    }
  };
  const kind = r.files.length ? (r.files.every((f) => f.contentType === 'application/pdf') ? 'PDF' : r.files.every((f) => f.contentType.startsWith('image/')) ? 'Photo' : 'Mixed') : undefined;

  const saveEdit = async () => {
    if (!editing) return;
    const found = validate(editing);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { record } = await api.updateRecord(r.id, { ...toInput(editing), ...(editAi !== undefined ? { ai: editAi } : {}) });
      setData({ ...r, ...record, files: record.files ?? r.files });
      stopEdit();
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
        const { files: all } = await api.attachPages(r.id, ok);
        setData({ ...r, files: all, fileCount: all.length });
      }
      const failed = done.length - ok.length;
      if (failed) setActionError(`${failed === 1 ? "One page didn't" : `${failed} pages didn't`} upload. Check your connection and try again.`);
      // New pages can change what the record says: offer to read them, edit by hand, or leave it.
      if (ok.length) setTimeout(() => setAdding('added'), Platform.OS === 'ios' ? 400 : 0);
      else setAdding(null);
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

  /** Removes one uploaded page from the record (and from storage) after a confirmation. */
  const removePage = (f: RecordFile, index: number) => {
    const go = async () => {
      setActionError(null);
      try {
        await api.removePage(r.id, f.id);
        const rest = r.files.filter((x) => x.id !== f.id);
        setData({ ...r, files: rest, fileCount: rest.length });
      } catch (err) {
        setActionError(messageFor(err));
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert(`Remove page ${index + 1}?`, r.files.length === 1 ? 'This is the only page. The record stays, without its document.' : 'The page is deleted from this record. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void go() },
    ]);
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

  if (reading) {
    return flow(
      <Screen tabBar={false} nav={{ title: 'Record details' }}>
        <Reading pages={files.length} />
      </Screen>
    );
  }

  if (editing) {
    return flow(
      <Screen
        tabBar={false}
        nav={{ title: editAi ? 'Review details' : 'Edit record', back: 'close', onBack: stopEdit }}
        subtitle={editAi ? `Read from all ${files.length} ${files.length === 1 ? 'page' : 'pages'}. Give the details a quick check before saving.` : undefined}
        footer={<Button label="Save changes" onPress={saveEdit} loading={busy} />}
      >
        {actionError && <Banner message={actionError} />}
        {notice && <Banner tone="warn" message={notice} />}
        <RecordForm value={editing} onChange={setEditing} errors={errors} aiFilled={!!editAi} />
        {editAi && <AiPanel ai={editAi} />}
      </Screen>
    );
  }

  const headerActions = [
    { label: 'Edit record', sf: 'pencil' as const, icon: 'pencil-outline' as const, onPress: startEdit },
    { label: 'Share this record', sf: 'square.and.arrow.up' as const, icon: 'share-variant-outline' as const, onPress: () => router.push({ pathname: '/share/new', params: { recordId: r.id } }) },
  ];

  return flow(
    <Screen
      tabBar={false}
      nav={{ title: 'Record details', actions: headerActions }}
      eyebrow={<Eyebrow>{`${CATEGORY_META[r.category]?.short ?? 'Record'}  /  ${r.eventDate ? formatDate(r.eventDate, { year: true }) : 'Undated'}`}</Eyebrow>}
      title={r.title}
      subtitle={[r.facility, r.provider].filter(Boolean).join(' · ') || undefined}
      footer={
        r.ai ? (
          <Button kind="dark" label="Explain this record" onPress={() => router.push({ pathname: '/record/explain', params: { id: r.id } })} />
        ) : files.length ? (
          <Button kind="dark" icon="text-box-search-outline" label={files.length > 1 ? `Read all ${files.length} pages with AI` : 'Read this page with AI'} onPress={() => void readWithAi()} />
        ) : (
          <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center' }}>No AI reading was saved with this record, so there's nothing to explain yet.</Txt>
        )
      }
    >
      {actionError && <Banner message={actionError} />}
      <Rise scale={0.97}>
        <DocCard record={r} pages={r.files.length} kind={kind} />
      </Rise>
      <PageThumbs files={r.files} onOpen={open} onRemove={removePage} />
      {files.length > 0 && <Button kind="secondary" icon={files.length > 1 ? 'book-open-page-variant-outline' : 'file-document-outline'} label={files.length > 1 ? `View all ${files.length} pages` : `Open original ${kind === 'PDF' ? 'PDF' : 'document'}`} onPress={() => openOriginal(files, setViewer)} />}
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
      {!!r.ai?.medications?.length && (
        <Button
          kind="secondary"
          icon="pill"
          label="Review medications for reminders"
          onPress={() => router.push({ pathname: '/medications/review', params: { recordId: r.id } } as unknown as Href)}
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

      <Sheet visible={adding === 'sheet'} onClose={() => setAdding(null)} title="Add pages" message="New pages go after the ones already saved. Next, you can have AI read them or update the details yourself.">
        <View style={{ gap: space.md, paddingBottom: space.xs }}>
          {camera && <Button kind="secondary" icon="camera-outline" label="Take a photo" onPress={() => choose(pickFromCamera)} />}
          <Button kind="secondary" icon="image-outline" label="Choose from photos" onPress={() => choose(() => pickFromLibrary(MAX_PAGES - r.files.length))} />
          <Button kind="secondary" icon="file-upload-outline" label="Upload a PDF" onPress={() => choose(pickPdf)} />
        </View>
      </Sheet>

      <Sheet visible={adding === 'added'} onClose={() => setAdding(null)} title="Pages added" message={`This record now has ${files.length} ${files.length === 1 ? 'page' : 'pages'}. Update its details from them?`}>
        <View style={{ gap: space.md, paddingBottom: space.xs }}>
          <Button icon="text-box-search-outline" label={`Read all ${files.length} pages with AI`} onPress={() => void readWithAi()} />
          <Button kind="secondary" icon="pencil-outline" label="Edit details myself" onPress={() => { setAdding(null); startEdit(); }} />
          <Button kind="ghost" label="Keep details as they are" onPress={() => setAdding(null)} />
        </View>
      </Sheet>

      <PageViewer files={files} index={viewer} onClose={() => setViewer(null)} onRemove={(f, i) => { setViewer(null); setTimeout(() => removePage(f, i), Platform.OS === 'ios' ? 400 : 0); }} />
    </Screen>
  );
}
