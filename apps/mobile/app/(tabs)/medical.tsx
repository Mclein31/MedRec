import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { shareLink } from '../../src/lib/shareLink';
import { radius, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Eyebrow, Txt } from '../../src/ui/core';
import { Toggle } from '../../src/ui/form';
import { Group, Row, Rule, Screen, Section } from '../../src/ui/layout';
import { Rise } from '../../src/ui/motion';
import { MedicalIdCard } from '../../src/ui/MedicalIdCard';

function Fact({ label, value, alert, empty = 'None recorded' }: { label: string; value: string[] | string | null; alert?: boolean; empty?: string }) {
  const c = useColors();
  const text = Array.isArray(value) ? value.join(', ') : value;
  return (
    <View style={{ gap: 4, paddingVertical: space.md }}>
      <Eyebrow color={c.ink2}>{label}</Eyebrow>
      <Txt variant="headline" color={text ? (alert ? c.danger : c.ink) : c.ink3}>{text || empty}</Txt>
    </View>
  );
}

export default function MedicalId() {
  const c = useColors();
  const { data: p, setData, error, refreshing, refresh, reload } = useLoad(() => api.profile().then((r) => r.profile), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const url = p?.emergency.url;
  const contact = p?.emergencyContactName || p?.emergencyContactPhone ? [p.emergencyContactName, p.emergencyContactRelation].filter(Boolean).join(' · ') || 'Contact' : null;

  return (
    <Screen brand title="Medical ID" refreshing={refreshing} onRefresh={refresh}>
      {(error || actionError) && <Banner message={(actionError ?? error)!} action={{ label: 'Retry', onPress: reload }} />}
      {p && (
        <>
          <Rise scale={0.96}>
            <MedicalIdCard p={p} />
          </Rise>
          <View>
            <Fact label="Allergies" value={p.allergies} alert />
            <Rule />
            <Fact label="Conditions" value={p.conditions} />
            <Rule />
            <Fact label="Medications" value={p.medications} />
            <Rule />
            <Fact label="Emergency contact" value={contact} empty="Not set — add one so responders can call" />
            {p.emergencyContactPhone && (
              <Button kind="secondary" icon="phone-outline" label={`Call ${p.emergencyContactPhone}`} onPress={() => void Linking.openURL(`tel:${p.emergencyContactPhone}`)} style={{ marginBottom: space.md }} />
            )}
            <Rule />
          </View>
          <Button kind="secondary" icon="pencil-outline" label="Edit Medical ID" onPress={() => router.push({ pathname: '/profile-edit', params: { section: 'medical' } })} />

          <Section title="Emergency page">
            <Group>
              <Row
                icon="earth"
                title="Public emergency page"
                subtitle={p.emergency.enabled ? 'On · anyone with the QR code can see the details above' : 'Off · only you can see this ID'}
                accessory={<Toggle value={p.emergency.enabled} disabled={busy} onValueChange={(v) => void set(v)} accessibilityLabel="Public emergency page" />}
                chevron={false}
              />
            </Group>
            <Txt variant="caption" color={c.ink3}>
              {p.emergency.enabled
                ? 'Only this card is shown — never your records or notes. Each view appears in Activity.'
                : 'Turn it on to get a QR code responders can scan from your lock screen or a wallet card.'}
            </Txt>
          </Section>

          {url && (
            <View style={{ alignItems: 'center', gap: space.lg }}>
              <View style={{ padding: space.md, backgroundColor: '#FFFFFF', borderRadius: radius.md }} accessible accessibilityRole="image" accessibilityLabel="Medical ID QR code">
                <QRCode value={url} size={180} color="#000000" backgroundColor="#FFFFFF" quietZone={8} />
              </View>
              <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center', maxWidth: 320 }}>
                Screenshot this for your lock screen, or print it for your wallet.
              </Txt>
              <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
                <Button
                  kind="secondary"
                  label={copied ? 'Link copied' : 'Send link'}
                  icon={copied ? 'check' : 'export-variant'}
                  style={{ flex: 1 }}
                  onPress={async () => {
                    if ((await shareLink(url, 'My Medical ID')) !== 'copied') return;
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                />
                <Button kind="secondary" label="Replace" icon="refresh" style={{ flex: 1 }} onPress={rotate} />
              </View>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
