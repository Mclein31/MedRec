import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { api, type Profile } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { exportJson, exportPdf } from '../../src/lib/exports';
import { radius, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Avatar } from '../../src/ui/Avatar';
import { Banner, Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Group, Row, Screen } from '../../src/ui/layout';
import { PhotoSheet } from '../../src/ui/PhotoSheet';
import { Sheet } from '../../src/ui/Sheet';

/** The four facts responders need most; drives the "finish your Medical ID" prompt. */
function medicalIdGaps(p: Profile) {
  return [
    !p.dateOfBirth && 'date of birth',
    !p.bloodType && 'blood type',
    !p.emergencyContactPhone && 'emergency contact',
    !p.allergies.length && 'allergies',
  ].filter(Boolean) as string[];
}

export default function ProfileTab() {
  const c = useColors();
  const { state, signOut, setUser } = useAuth();
  const { data, setData, error, refreshing, refresh, reload } = useLoad(() => Promise.all([api.profile().then((r) => r.profile), api.activity()]), []);
  const [p, activity] = data ?? [null, null];
  const [busy, setBusy] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sheet, setSheet] = useState<'export' | 'photo' | null>(null);
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

  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out of MedRec?', 'You will need your password and an emailed code to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const photoChanged = (profile: Profile) => {
    setData((d) => (d ? [profile, d[1]] : d));
    if (state.status === 'signedIn' && state.user.name !== profile.name) setUser({ ...state.user, name: profile.name });
  };

  const unread = activity?.unread ?? 0;
  const gaps = p ? medicalIdGaps(p) : [];
  const details = p ? [p.phone, p.dateOfBirth && `Born ${p.dateOfBirth.slice(0, 4)}`].filter(Boolean).join(' · ') : '';

  return (
    <Screen brand title={'Profile &\nsettings'} refreshing={refreshing} onRefresh={refresh}>
      {(error || (notice && !sheet)) && <Banner tone={notice?.tone ?? 'danger'} message={notice?.message ?? error!} action={error ? { label: 'Retry', onPress: reload } : undefined} />}
      {p && (
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Tappable onPress={() => setSheet('photo')} accessibilityLabel={p.avatarUrl ? 'Change profile photo' : 'Add a profile photo'} hitSlop={4}>
              <Avatar name={p.name} url={p.avatarUrl} size={72} badge busy={photoBusy} />
            </Tappable>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="title" numberOfLines={2}>{p.name}</Txt>
              <Txt variant="caption" color={c.ink3} numberOfLines={1}>{p.email}</Txt>
              {!!details && <Txt variant="caption" color={c.ink3} numberOfLines={1}>{details}</Txt>}
            </View>
          </View>
          <Button kind="secondary" icon="account-edit-outline" label="Edit profile" onPress={() => router.push('/profile-edit')} style={{ minHeight: 48 }} />
          {gaps.length > 0 && (
            <Tappable
              onPress={() => router.push({ pathname: '/profile-edit', params: { section: 'medical' } })}
              accessibilityLabel={`Finish your Medical ID. Missing ${gaps.join(', ')}.`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: c.warnSoft }}
            >
              <Icon name="heart-pulse" size={24} color={c.ink} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="headline">Finish your Medical ID</Txt>
                <Txt variant="caption" color={c.ink2}>Add your {gaps.slice(0, 2).join(' and ')}{gaps.length > 2 ? ` and ${gaps.length - 2} more` : ''} so responders can help faster.</Txt>
              </View>
              <Icon name="arrow-right" size={22} color={c.ink} />
            </Tappable>
          )}
        </View>
      )}

      <Group bare>
        <Row inset={false} icon="heart-pulse" title="Health details" subtitle="Blood type, allergies, medications and emergency contact" onPress={() => router.push({ pathname: '/profile-edit', params: { section: 'medical' } })} chevron={false} />
        <Row inset={false} icon="format-text" title="Reading & motion" subtitle="Text size, appearance and motion" onPress={() => router.push('/preferences')} chevron={false} />
        <Row inset={false} icon="lock-outline" title="Security & privacy" subtitle="App lock, password, devices and account" onPress={() => router.push('/security')} chevron={false} />
        <Row inset={false} icon="tray-arrow-down" title="Export my records" subtitle="A printable PDF or a full copy of your data" onPress={() => setSheet('export')} chevron={false} />
        <Row inset={false} icon="bell-outline" title="Activity" subtitle="Sign-ins, shares and who opened your links" value={unread ? `${unread} new` : null} onPress={() => router.push('/activity')} chevron={false} />
        <Row inset={false} icon="text-box-search-outline" title="Health summary" subtitle="Plain-language overview of your records" onPress={() => router.push('/summary')} chevron={false} />
        <Row inset={false} icon="play-circle-outline" title="How MedRec works" subtitle="Replay the tour" onPress={() => router.push('/tour')} chevron={false} />
        <Row inset={false} icon="logout" title="Sign out" onPress={confirmSignOut} chevron={false} />
      </Group>
      <Txt variant="caption" color={c.ink3}>MedRec organises your own records. It does not give medical advice.</Txt>

      <PhotoSheet visible={sheet === 'photo'} onClose={() => setSheet(null)} hasPhoto={!!p?.avatarUrl} onBusy={setPhotoBusy} onChange={photoChanged} />
      <Sheet visible={sheet === 'export'} onClose={() => { setSheet(null); setNotice(null); }} title="Export records" message="Export a readable PDF or a copy of your data. Attachments are downloaded separately." closeLabel="Done" closeKind="dark">
        <View style={{ gap: space.md, paddingBottom: space.xs }}>
          <Button kind="secondary" icon="file-pdf-box" label={busy === 'pdf' ? 'Preparing PDF…' : 'Printable history (PDF)'} loading={busy === 'pdf'} disabled={busy === 'json'} onPress={() => run('pdf', exportPdf)} />
          <Button kind="secondary" icon="code-json" label={busy === 'json' ? 'Preparing file…' : 'Everything as a file (JSON)'} loading={busy === 'json'} disabled={busy === 'pdf'} onPress={() => run('json', exportJson)} />
          {notice && <Banner tone={notice.tone} message={notice.message} />}
        </View>
      </Sheet>
    </Screen>
  );
}
