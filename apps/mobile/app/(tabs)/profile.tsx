import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { api } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { exportJson, exportPdf } from '../../src/lib/exports';
import { space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Tappable, Txt } from '../../src/ui/core';
import { Group, Row, Screen } from '../../src/ui/layout';
import { Sheet } from '../../src/ui/Sheet';

export default function ProfileTab() {
  const c = useColors();
  const { signOut } = useAuth();
  const { data, setData, error, refreshing, refresh, reload } = useLoad(() => Promise.all([api.profile().then((r) => r.profile), api.activity()]), []);
  const [p, activity] = data ?? [null, null];
  const [busy, setBusy] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'info'; message: string } | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setNotice({ tone: 'danger', message: messageFor(err) });
    } finally {
      setBusy(null);
    }
  };

  const changePhoto = () =>
    run('photo', async () => {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (res.canceled || !res.assets[0]) return;
      const blob = await (await fetch(res.assets[0].uri)).blob();
      const { profile } = await api.uploadAvatar(blob);
      setData((d) => (d ? [profile, d[1]] : d));
    });

  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out of MedRec?', 'You will need your password and an emailed code to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const initials = (p?.name ?? '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const unread = activity?.unread ?? 0;

  return (
    <Screen brand title={'Profile &\nsettings'} refreshing={refreshing} onRefresh={refresh}>
      {(error || notice) && <Banner tone={notice?.tone ?? 'danger'} message={notice?.message ?? error!} action={error ? { label: 'Retry', onPress: reload } : undefined} />}
      {p && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Tappable onPress={changePhoto} accessibilityLabel="Change profile photo">
            {p.avatarUrl ? (
              <Image source={{ uri: p.avatarUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} />
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.persimmon, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="title" color={c.onPersimmon} style={{ fontSize: 24 }}>{initials || '?'}</Txt>
              </View>
            )}
          </Tappable>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="title">{p.name}</Txt>
            <Txt variant="caption" color={c.ink3}>{busy === 'photo' ? 'Uploading photo…' : p.email}</Txt>
          </View>
        </View>
      )}

      <Group bare>
        <Row inset={false} icon="heart-pulse" title="Health details" subtitle="Your Medical ID" onPress={() => router.push('/profile-edit')} chevron={false} />
        <Row inset={false} icon="format-text" title="Reading & motion" subtitle="Make it comfortable" onPress={() => router.push('/preferences')} chevron={false} />
        <Row inset={false} icon="lock-outline" title="Security & privacy" subtitle="App lock, password and devices" onPress={() => router.push('/security')} chevron={false} />
        <Row inset={false} icon="tray-arrow-down" title="Export my records" subtitle="Take a copy with you" onPress={() => setExporting(true)} chevron={false} />
        <Row inset={false} icon="bell-outline" title="Activity" subtitle="Sign-ins, shares and who opened your links" value={unread ? `${unread} new` : null} onPress={() => router.push('/activity')} chevron={false} />
        <Row inset={false} icon="text-box-search-outline" title="Health summary" subtitle="Plain-language overview of your records" onPress={() => router.push('/summary')} chevron={false} />
        <Row inset={false} icon="play-circle-outline" title="How MedRec works" subtitle="Replay the tour" onPress={() => router.push('/tour')} chevron={false} />
      </Group>
      <Tappable onPress={confirmSignOut} accessibilityLabel="Sign out" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Txt variant="headline">Sign out</Txt>
      </Tappable>
      <Txt variant="caption" color={c.ink3}>MedRec organises your own records. It does not give medical advice.</Txt>

      <Sheet visible={exporting} onClose={() => setExporting(false)} title="Export records" message="Export a readable PDF or a copy of your data. Attachments are downloaded separately." closeLabel="Done" closeKind="dark">
        <View style={{ gap: space.md, paddingBottom: space.xs }}>
          <Button kind="secondary" icon="file-pdf-box" label={busy === 'pdf' ? 'Preparing PDF…' : 'Printable history (PDF)'} loading={busy === 'pdf'} onPress={() => run('pdf', exportPdf)} />
          <Button kind="secondary" icon="code-json" label={busy === 'json' ? 'Preparing file…' : 'Everything as a file (JSON)'} loading={busy === 'json'} onPress={() => run('json', exportJson)} />
          {notice && <Banner tone={notice.tone} message={notice.message} />}
        </View>
      </Sheet>
    </Screen>
  );
}
