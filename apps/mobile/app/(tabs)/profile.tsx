import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { api } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { exportJson, exportPdf } from '../../src/lib/exports';
import { useAppLock } from '../../src/lock';
import { space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Tappable, Txt } from '../../src/ui/core';
import { Group, Row, Screen, Section } from '../../src/ui/layout';

export default function ProfileTab() {
  const c = useColors();
  const { signOut } = useAuth();
  const lock = useAppLock();
  const { data: p, setData, error, refreshing, refresh, reload } = useLoad(() => api.profile().then((r) => r.profile), []);
  const [busy, setBusy] = useState<string | null>(null);
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
      setData((await api.uploadAvatar(blob)).profile);
    });

  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out of MedRec?', 'You will need your password and an emailed code to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const initials = (p?.name ?? '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const facts = p ? [p.bloodType && p.bloodType !== 'unknown' ? p.bloodType : null, p.allergies.length ? `${p.allergies.length} allergies` : null, p.medications.length ? `${p.medications.length} medications` : null].filter(Boolean).join(' · ') : '';

  return (
    <Screen title="Profile" refreshing={refreshing} onRefresh={refresh}>
      {(error || notice) && <Banner tone={notice?.tone ?? 'danger'} message={notice?.message ?? error!} action={error ? { label: 'Retry', onPress: reload } : undefined} />}
      {p && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Tappable onPress={changePhoto} accessibilityLabel="Change profile photo">
            {p.avatarUrl ? (
              <Image source={{ uri: p.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="title" color={c.accent}>{initials || '?'}</Txt>
              </View>
            )}
          </Tappable>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="title">{p.name}</Txt>
            <Txt variant="caption" color={c.ink3}>{p.email}</Txt>
          </View>
        </View>
      )}

      <Section title="Health">
        <Group>
          <Row icon="card-account-details-outline" title="Health details" subtitle={facts || 'Add blood type, allergies and medications'} onPress={() => router.push('/profile-edit')} />
          <Row icon="text-box-search-outline" title="Health summary" subtitle="Plain-language overview of your records" onPress={() => router.push('/summary')} />
        </Group>
      </Section>

      <Section title="Security">
        <Group>
          {lock.available && (
            <Row
              icon="fingerprint"
              title="App lock"
              subtitle="Face ID, fingerprint or device passcode when MedRec opens"
              chevron={false}
              accessory={<Switch value={lock.enabled} onValueChange={(v) => void lock.setEnabled(v)} trackColor={{ true: c.accent, false: c.line }} accessibilityLabel="App lock" />}
            />
          )}
          <Row icon="shield-key-outline" title="Password and devices" subtitle="Change password, see where you're signed in" onPress={() => router.push('/security')} />
        </Group>
      </Section>

      <Section title="Your data">
        <Group>
          <Row icon="file-pdf-box" title={busy === 'pdf' ? 'Preparing PDF…' : 'Printable history (PDF)'} subtitle="For a new doctor or your own files" onPress={() => run('pdf', exportPdf)} />
          <Row icon="code-json" title={busy === 'json' ? 'Preparing file…' : 'Export everything (JSON)'} subtitle="Profile and all records, to keep or move" onPress={() => run('json', exportJson)} />
        </Group>
      </Section>

      <Section title="Help">
        <Group>
          <Row icon="play-circle-outline" title="How MedRec works" onPress={() => router.push('/tour')} />
          <Row icon="logout" title="Sign out" tone="danger" chevron={false} onPress={confirmSignOut} />
        </Group>
      </Section>
      <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center' }}>
        MedRec organises your own records. It does not give medical advice.
      </Txt>
    </Screen>
  );
}
