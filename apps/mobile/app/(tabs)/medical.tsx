import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Share, Switch, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api, type Profile } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { radius, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Txt } from '../../src/ui/core';
import { Group, Row, Screen, Section } from '../../src/ui/layout';

function Facts({ p }: { p: Profile }) {
  const c = useColors();
  const list = (items: string[], empty: string, alert = false) =>
    items.length ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((i) => (
          <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: alert ? c.dangerSoft : c.accentSoft }}>
            <Txt variant="label" color={alert ? c.danger : c.ink}>{i}</Txt>
          </View>
        ))}
      </View>
    ) : (
      <Txt color={c.ink3}>{empty}</Txt>
    );
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space.xl, gap: space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Txt variant="micro" color={c.danger}>✚ MEDICAL ID</Txt>
          <Txt variant="title">{p.name}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="micro" color={c.ink3}>BLOOD TYPE</Txt>
          <Txt variant="title">{p.bloodType && p.bloodType !== 'unknown' ? p.bloodType : '—'}</Txt>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="label" color={c.ink2}>Allergies</Txt>
        {list(p.allergies, 'None recorded', true)}
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="label" color={c.ink2}>Conditions</Txt>
        {list(p.conditions, 'None recorded')}
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="label" color={c.ink2}>Medications</Txt>
        {list(p.medications, 'None recorded')}
      </View>
      <View style={{ gap: 2 }}>
        <Txt variant="label" color={c.ink2}>Emergency contact</Txt>
        <Txt color={p.emergencyContactPhone ? c.ink : c.ink3}>
          {p.emergencyContactPhone ? `${p.emergencyContactName ?? 'Contact'}${p.emergencyContactRelation ? ` (${p.emergencyContactRelation})` : ''} · ${p.emergencyContactPhone}` : 'Not set — add one so responders can call'}
        </Txt>
      </View>
    </View>
  );
}

export default function MedicalId() {
  const c = useColors();
  const { data, setData, error, refreshing, refresh, reload } = useLoad(() => api.profile().then((r) => r.profile), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const set = async (enabled: boolean, rotate = false) => {
    setBusy(true);
    setActionError(null);
    try {
      setData((await api.setEmergency(enabled, rotate)).profile);
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const rotate = () => {
    if (Platform.OS === 'web') return void set(true, true);
    Alert.alert('Replace the link?', 'The old QR code and link stop working. Print or save the new one.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', onPress: () => void set(true, true) },
    ]);
  };

  const p = data;
  const url = p?.emergency.url;

  return (
    <Screen title="Medical ID" subtitle="What responders see if you can't speak for yourself." refreshing={refreshing} onRefresh={refresh}>
      {(error || actionError) && <Banner message={(actionError ?? error)!} action={{ label: 'Retry', onPress: reload }} />}
      {p && (
        <>
          <Facts p={p} />
          <Button kind="secondary" label="Edit these details" icon="pencil-outline" onPress={() => router.push('/profile-edit')} />

          <Section title="Emergency page">
            <Group>
              <Row
                icon="earth"
                title="Public emergency page"
                subtitle={p.emergency.enabled ? 'On · anyone with the QR code can view the card above' : 'Off · nobody can open it'}
                accessory={<Switch value={p.emergency.enabled} disabled={busy} onValueChange={(v) => void set(v)} trackColor={{ true: c.accent, false: c.line }} accessibilityLabel="Public emergency page" />}
                chevron={false}
              />
            </Group>
            <Txt variant="caption" color={c.ink3}>
              Only the card above is shown — never your records or notes. You get an alert in Activity each time it is opened.
            </Txt>
          </Section>

          {url && (
            <View style={{ alignItems: 'center', gap: space.lg }}>
              <View style={{ padding: space.md, backgroundColor: '#FFFFFF', borderRadius: radius.md }} accessible accessibilityLabel="Medical ID QR code">
                <QRCode value={url} size={180} color="#14211D" backgroundColor="#FFFFFF" />
              </View>
              <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center', maxWidth: 320 }}>
                Screenshot this for your lock screen, or print it for your wallet.
              </Txt>
              <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
                <Button kind="secondary" label="Send link" icon="export-variant" style={{ flex: 1 }} onPress={() => void Share.share({ message: url, url })} />
                <Button kind="secondary" label="Replace link" icon="refresh" style={{ flex: 1 }} onPress={rotate} />
              </View>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
