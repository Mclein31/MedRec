import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_PAGES, pickFromCamera, pickFromLibrary, pickPdf, uploadPage, type Page } from '../src/add/pages';
import { PageStrip } from '../src/add/PageStrip';
import { RecordForm, emptyForm, toInput, validate, type FormValue } from '../src/add/RecordForm';
import { api, type AiSnapshot } from '../src/lib/api';
import { messageFor } from '../src/lib/errors';
import { GUTTER, space, useColors } from '../src/theme';
import { AiPanel } from '../src/ui/AiPanel';
import { Banner, Button, Icon, Tappable, Txt } from '../src/ui/core';
import { Group, Row } from '../src/ui/layout';

export default function AddRecord() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'pages' | 'review'>('pages');
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState<FormValue>(emptyForm);
  const [ai, setAi] = useState<AiSnapshot | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValue, string>>>({});
  const [notice, setNotice] = useState<{ tone: 'danger' | 'warn' | 'info'; message: string } | null>(null);
  const [busy, setBusy] = useState<'scan' | 'save' | null>(null);
  const saving = useRef(false);

  const ready = pages.filter((p) => p.status === 'ready');
  const uploading = pages.some((p) => p.status === 'uploading');

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
    try {
      const { record } = await api.createRecord({ ...toInput(form), ai, fileIds: ready.map((p) => p.fileId!) });
      router.replace({ pathname: '/record/[id]', params: { id: record.id } });
    } catch (err) {
      setNotice({ tone: 'danger', message: messageFor(err) });
    } finally {
      saving.current = false;
      setBusy(null);
    }
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: GUTTER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
        <Tappable onPress={step === 'review' ? () => setStep('pages') : close} accessibilityLabel={step === 'review' ? 'Back to pages' : 'Cancel'} hitSlop={10} style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <Icon name={step === 'review' ? 'arrow-left' : 'close'} size={24} color={c.ink} />
        </Tappable>
        <Txt variant="micro" color={c.ink3}>STEP {step === 'pages' ? 1 : 2} OF 2</Txt>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.xxxl, gap: space.xxl, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ gap: space.sm }}>
          <Txt variant="display" accessibilityRole="header">{step === 'pages' ? 'Add a record' : 'Check the details'}</Txt>
          <Txt color={c.ink3}>
            {step === 'pages' ? 'Photograph each page in good light, or choose photos or PDFs you already have.' : ai ? 'MedRec filled these in from your pages. Correct anything that looks wrong.' : 'Fill in what you know. Only the title is required.'}
          </Txt>
        </View>
        {notice && (
          <Banner
            tone={notice.tone}
            message={notice.message}
            action={notice.tone === 'warn' && notice.message.includes('Settings') ? { label: 'Settings', onPress: () => Linking.openSettings() } : undefined}
          />
        )}

        {step === 'pages' ? (
          <>
            {pages.length > 0 && <PageStrip pages={pages} onRemove={remove} onRetry={retry} />}
            <Group>
              {Platform.OS !== 'web' && <Row icon="camera-outline" title="Take a photo" subtitle="Lay the page flat and fill the frame" onPress={() => add(pickFromCamera)} />}
              <Row icon="image-multiple-outline" title="Choose photos" onPress={() => add(() => pickFromLibrary(MAX_PAGES - pages.length))} />
              <Row icon="file-pdf-box" title="Choose a PDF" onPress={() => add(pickPdf)} />
            </Group>
            <View style={{ gap: space.md }}>
              <Button label={uploading ? 'Uploading pages…' : 'Read with AI'} icon="text-box-search-outline" onPress={scan} loading={busy === 'scan'} disabled={!ready.length || uploading} />
              <Button kind="secondary" label="Fill in myself" onPress={() => { setAi(null); setStep('review'); }} disabled={uploading} />
              {busy === 'scan' && <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center' }}>Reading {ready.length} {ready.length === 1 ? 'page' : 'pages'}. This usually takes 5–15 seconds.</Txt>}
            </View>
          </>
        ) : (
          <>
            <RecordForm value={form} onChange={setForm} errors={errors} aiFilled={!!ai} />
            {ai && <AiPanel ai={ai} />}
            <Button label="Save record" onPress={save} loading={busy === 'save'} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
