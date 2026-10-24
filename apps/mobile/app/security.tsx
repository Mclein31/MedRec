import { router } from 'expo-router';
import { useState } from 'react';
import { timeAgo } from '../src/format';
import { api } from '../src/lib/api';
import { fieldError, messageFor } from '../src/lib/errors';
import { useAuth } from '../src/auth';
import { useColors } from '../src/theme';
import { useLoad } from '../src/useLoad';
import { Banner, Button, Icon, Tappable, Txt } from '../src/ui/core';
import { Field } from '../src/ui/form';
import { Group, Row, Screen, Section } from '../src/ui/layout';

export default function Security() {
  const c = useColors();
  const { signOut } = useAuth();
  const sessions = useLoad(() => api.sessions().then((r) => r.sessions), []);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      // Every session, including this one, ends after a password change.
      await signOut();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const general = error && !fieldError(error, 'currentPassword') && !fieldError(error, 'newPassword') ? messageFor(error) : null;
  return (
    <Screen
      tabBar={false}
      title="Password and devices"
      right={
        <Tappable onPress={() => router.back()} accessibilityLabel="Back" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={24} color={c.ink} />
        </Tappable>
      }
    >
      {(general || notice) && <Banner tone={general ? 'danger' : 'info'} message={(general ?? notice)!} />}
      <Section title="Change password">
        <Field label="Current password" value={current} onChangeText={setCurrent} secureToggle autoComplete="current-password" error={fieldError(error, 'currentPassword')} />
        <Field label="New password" value={next} onChangeText={setNext} secureToggle autoComplete="new-password" hint="At least 10 characters. You'll be signed out everywhere." error={fieldError(error, 'newPassword')} />
        <Button label="Change password" onPress={change} loading={busy} disabled={!current || next.length < 10} />
      </Section>

      <Section title="Signed in on">
        {sessions.error && <Banner message={sessions.error} action={{ label: 'Retry', onPress: sessions.reload }} />}
        <Group>
          {(sessions.data ?? []).map((s) => (
            <Row
              key={s.id}
              icon="cellphone"
              title={s.device ?? 'Unknown device'}
              subtitle={s.current ? 'This device' : `Signed in ${timeAgo(s.createdAt)}`}
              chevron={false}
              accessory={
                s.current ? undefined : (
                  <Button kind="ghost" label="Sign out" onPress={async () => { await api.revokeSession(s.id).catch(() => undefined); void sessions.reload(); }} style={{ minHeight: 36, paddingHorizontal: 8 }} />
                )
              }
            />
          ))}
        </Group>
      </Section>

      <Section title="Trusted devices">
        <Txt color={c.ink3}>Devices you trusted skip the emailed code for 30 days. Forget them to require the code everywhere.</Txt>
        <Button kind="secondary" label="Forget all trusted devices" onPress={async () => { try { await api.forgetDevices(); setNotice('Done. Every device will need an emailed code next time.'); } catch (err) { setError(err); } }} />
      </Section>
    </Screen>
  );
}
