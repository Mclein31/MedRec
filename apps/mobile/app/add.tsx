import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { CameraStage, Reading, Saved, UploadIncomplete } from '../src/add/AddParts';
import { MAX_PAGES, pickFromCamera, pickFromLibrary, pickPdf, uploadPage, type Page } from '../src/add/pages';
import { PageStrip } from '../src/add/PageStrip';
import { RecordForm, emptyForm, toInput, validate, type FormValue } from '../src/add/RecordForm';
import { api, type AiSnapshot, type HealthRecord } from '../src/lib/api';
import { messageFor } from '../src/lib/errors';
import { space, useColors } from '../src/theme';
import { AiPanel } from '../src/ui/AiPanel';
import { Banner, Button, Icon, Txt } from '../src/ui/core';
import { Group, Row, Screen } from '../src/ui/layout';

type Step = 'pages' | 'review' | 'saved';

export default function AddRecord() {
  const c = useColors();
  const { source } = useLocalSearchParams<{ source?: 'camera' | 'pdf' }>();
  const [step, setStep] = useState<Step>('pages');
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState<FormValue>(emptyForm);
  const [ai, setAi] = useState<AiSnapshot | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValue, string>>>({});
  const [notice, setNotice] = useState<{ tone: 'danger' | 'warn' | 'info'; message: string } | null>(null);
  const [busy, setBusy] = useState<'scan' | 'save' | null>(null);
  const [saved, setSaved] = useState<HealthRecord | null>(null);
  const saving = useRef(false);
  const autoOpened = useRef(false);

  const ready = pages.filter((p) => p.status === 'ready');
  const failed = pages.filter((p) => p.status === 'failed');
  const uploading = pages.some((p) => p.status === 'uploading');
  const camera = Platform.OS !== 'web';

  const add = async (pick: () => Promise<Page[]>) => {
    setNotice(null);
    try {
      const fresh = (await pick()).filter((p) => !pages.some((q) => q.key === p.key)).slice(0, MAX_PAGES - pages.length);
      if (!fresh.length) return;
      setPages((prev) => [...prev, ...fresh]);
      for (const p of fresh) {
        const done = await uploadPage(p);
        setPages((prev) => prev.map((q) => (q.key === p.key ? done : q)));
      }
    } catch (err) {
      if ((err as Error).message === 'CAMERA_DENIED') {
        setNotice({ tone: 'warn', message: 'MedRec needs camera access to photograph documents. You can allow it in Settings, or choose photos instead.' });
      } else setNotice({ tone: 'danger', message: messageFor(err) });
    }
  };

  // Entry points such as "Scan my first document" open the matching picker once.
  useEffect(() => {
    if (autoOpened.current || !source) return;
    autoOpened.current = true;
    if (source === 'pdf') void add(pickPdf);
    else if (camera) void add(pickFromCamera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const retry = async (key: string) => {
    const page = pages.find((p) => p.key === key);
    if (!page) return;
    setPages((prev) => prev.map((q) => (q.key === key ? { ...q, status: 'uploading' } : q)));
    const done = await uploadPage(page);
    setPages((prev) => prev.map((q) => (q.key === key ? done : q)));
  };

  const remove = (key: string) => {
    const page = pages.find((p) => p.key === key);
    if (page?.fileId) void api.discardPage(page.fileId).catch(() => undefined);
    setPages((prev) => prev.filter((p) => p.key !== key));
  };

  const scan = async () => {
    setBusy('scan');
    setNotice(null);
    try {
      const { draft } = await api.scan(ready.map((p) => p.fileId!));
      const { title, category, eventDate, provider, facility, legible, ...snapshot } = draft;
      setForm({ title, category, eventDate: eventDate ?? '', provider: provider ?? '', facility: facility ?? '', notes: '' });
      setAi(snapshot);
      if (!legible) setNotice({ tone: 'warn', message: 'Parts of the page were hard to read. Check each field, or retake a sharper photo in good light.' });
      setStep('review');
    } catch (err) {
      setNotice({ tone: 'danger', message: `${messageFor(err)} You can also fill in the details yourself.` });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (saving.current) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    saving.current = true;
    setBusy('save');
    setNotice(null);
    try {
      const { record } = await api.createRecord({ ...toInput(form), ai, fileIds: ready.map((p) => p.fileId!) });
      setSaved(record);
      setStep('saved');
    } catch (err) {
      setNotice({ tone: 'danger', message: `${messageFor(err)} Nothing was saved yet.` });
    } finally {
      saving.current = false;
      setBusy(null);
    }
  };

  const reset = () => {
    setPages([]);
    setForm(emptyForm);
    setAi(null);
    setSaved(null);
    setNotice(null);
    setStep('pages');
  };

  const close = () => {
    const discard = () => {
      for (const p of pages) if (p.fileId) void api.discardPage(p.fileId).catch(() => undefined);
      router.back();
    };
    if (!pages.length && !form.title) return router.back();
    if (Platform.OS === 'web') return discard();
    Alert.alert('Discard this record?', 'The pages you added will be removed.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discard },
    ]);
  };

  const banner = notice && (
    <Banner
      tone={notice.tone}
      message={notice.message}
      action={notice.tone === 'warn' && notice.message.includes('Settings') ? { label: 'Settings', onPress: () => Linking.openSettings() } : undefined}
    />
  );

  if (step === 'saved' && saved) {
    return (
      <Screen tabBar={false} footer={<Button kind="dark" label="Back to records" onPress={() => router.dismissTo('/(tabs)')} />}>
        <View style={{ height: space.xl }} />
        <Saved record={saved} onAnother={reset} />
      </Screen>
    );
  }

  if (step === 'review') {
    return (
      <Screen
        tabBar={false}
        nav={{ title: 'Review details', onBack: () => setStep('pages') }}
        title="Almost filed."
        subtitle={ai ? "We've filled in the details. Give them a quick check before saving." : 'Fill in what you know. Only the title is required.'}
        footer={<Button label="Save this record" onPress={save} loading={busy === 'save'} />}
      >
        {banner}
        {ready.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.surface, padding: space.lg, borderRadius: 4 }}>
            <Icon name="file-document-outline" size={24} color={c.ink} />
            <View style={{ flex: 1 }}>
              <Txt variant="label">{ready.length === 1 ? (ready[0]!.name ?? (ready[0]!.kind === 'pdf' ? 'PDF' : 'Photo')) : `${ready.length} pages`}</Txt>
              <Txt variant="caption" color={c.ink3}>{ready.length} {ready.length === 1 ? 'page' : 'pages'} · Ready to save</Txt>
            </View>
          </View>
        )}
        <RecordForm value={form} onChange={setForm} errors={errors} aiFilled={!!ai} />
        {ai && <AiPanel ai={ai} />}
      </Screen>
    );
  }

  const hasPages = pages.length > 0;
  const footer = busy === 'scan' ? null : hasPages ? (
    <>
      <Button label={uploading ? 'Uploading pages…' : 'Read with AI'} onPress={scan} disabled={!ready.length || uploading} loading={uploading} />
      <Button kind="secondary" label="Fill in myself" onPress={() => { setAi(null); setStep('review'); }} disabled={uploading} />
    </>
  ) : camera ? (
    <Button label="Scan a document" onPress={() => add(pickFromCamera)} />
  ) : (
    <Button label="Choose photos" onPress={() => add(() => pickFromLibrary(MAX_PAGES))} />
  );

  return (
    <Screen tabBar={false} nav={{ title: 'Add a record', back: 'close', onBack: close }} title={'Add a medical\nrecord.'} footer={footer}>
      {banner}
      {busy === 'scan' ? (
        <Reading pages={ready.length} />
      ) : (
        <>
          {failed.length > 0 && !uploading && (
            <UploadIncomplete failed={failed.length} onRetry={() => failed.forEach((p) => void retry(p.key))} onRemove={() => failed.forEach((p) => remove(p.key))} />
          )}
          {hasPages ? <PageStrip pages={pages} onRemove={remove} onRetry={retry} /> : <CameraStage onPress={camera ? () => add(pickFromCamera) : undefined} />}
          <Group bare>
            {hasPages && camera && <Row inset={false} icon="camera-outline" title="Take another photo" subtitle="Lay the page flat and fill the frame" onPress={() => add(pickFromCamera)} chevron={false} />}
            <Row inset={false} icon="image-outline" title="Choose from photos" subtitle="JPG, PNG or HEIC" onPress={() => add(() => pickFromLibrary(MAX_PAGES - pages.length))} chevron={false} />
            <Row inset={false} icon="file-upload-outline" title="Upload a PDF" subtitle="Results, prescriptions or visit notes" onPress={() => add(pickPdf)} chevron={false} />
          </Group>
          <Txt variant="caption" color={c.ink3}>We read the document. You check the details.</Txt>
        </>
      )}
    </Screen>
  );
}
