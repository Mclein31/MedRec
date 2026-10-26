import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { api, type Challenge } from '../../src/lib/api';
import { ApiError } from '../../src/lib/http';
import { messageFor } from '../../src/lib/errors';
import { getPending, setPending } from '../../src/pending';
import { space, useColors } from '../../src/theme';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button, Tappable, TextLink, Txt } from '../../src/ui/core';
import { CodeInput } from '../../src/ui/form';

export default function Code() {
  const c = useColors();
  const { verify } = useAuth();
  const initial = getPending();
  const [challenge, setChallenge] = useState<Challenge | undefined>(initial?.challenge);
  const [code, setCode] = useState('');
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(initial?.challenge.resendIn ?? 60);
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!initial || !challenge) return <Redirect href="/(auth)/sign-in" />;
  const email = initial.email;
  const confirming = challenge.purpose === 'verify_email';

  const submit = async (value = code) => {
    if (inFlight.current || value.length !== 6) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await verify(challenge, value, trust, email);
      setPending(null);
    } catch (err) {
      setError(messageFor(err));
      setCode('');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const { challenge: next } = await api.resend(challenge.challengeId);
      setChallenge(next);
      setPending({ challenge: next, email });
      setCooldown(next.resendIn);
      setCode('');
      setNote(`New code sent at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Only the code in the newest email works.`);
    } catch (err) {
      if (err instanceof ApiError && typeof err.details.retryAfter === 'number') setCooldown(err.details.retryAfter);
      setError(messageFor(err));
    }
  };

  return (
    <AuthFrame
      navTitle={confirming ? 'Verify email' : 'Sign-in code'}
      icon="email-outline"
      remy={{ pose: 'reading', motion: 'read' }}
      title="Check your email"
      subtitle={
        <Txt color={c.ink}>
          Enter the 6-digit code sent to <Txt variant="label">{challenge.maskedEmail}</Txt>
        </Txt>
      }
      footer={<Button label={confirming ? 'Verify & continue' : 'Verify & sign in'} onPress={() => submit()} loading={busy} disabled={code.length !== 6} />}
    >
      {error && <Banner message={error} />}
      {note && !error && <Banner tone="info" message={note} />}
      <View style={{ gap: space.sm }}>
        <CodeInput
          value={code}
          error={!!error}
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) void submit(v);
          }}
        />
        <Txt variant="caption" color={c.ink3}>This code expires in 10 minutes. Can't find it? Check Spam or Promotions.</Txt>
      </View>
      <Tappable onPress={resend} disabled={cooldown > 0} accessibilityLabel={cooldown > 0 ? `Send a new code in ${cooldown} seconds` : 'Send a new code'} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Txt variant="label" color={cooldown > 0 ? c.ink3 : c.ink}>
          {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
        </Txt>
      </Tappable>
      <TextLink label="Use a different email" icon={null} onPress={() => { setPending(null); router.replace('/(auth)/sign-in'); }} />
      {Platform.OS !== 'web' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Txt variant="label">Trust this device for 30 days</Txt>
            <Txt variant="caption" color={c.ink3}>Skip the code on this phone. Don't turn on for shared devices.</Txt>
          </View>
          <Switch value={trust} onValueChange={setTrust} trackColor={{ true: c.accent, false: c.line }} accessibilityLabel="Trust this device for 30 days" />
        </View>
      )}
    </AuthFrame>
  );
}
