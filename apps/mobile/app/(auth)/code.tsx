import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { api, type Challenge } from '../../src/lib/api';
import { ApiError } from '../../src/lib/http';
import { messageFor } from '../../src/lib/errors';
import { getPending, setPending } from '../../src/pending';
import { space, useColors } from '../../src/theme';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button, Tappable, Txt } from '../../src/ui/core';
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
      title={confirming ? 'Confirm your email' : 'Check your email'}
      subtitle={
        <Txt color={c.ink3}>
          Enter the 6-digit code we sent to <Txt color={c.ink} variant="label">{challenge.maskedEmail}</Txt>. It expires in 10 minutes.
        </Txt>
      }
    >
      {error && <Banner message={error} />}
      {note && !error && <Banner tone="info" message={note} />}
      <CodeInput
        value={code}
        error={!!error}
        onChange={(v) => {
          setCode(v);
          if (v.length === 6) void submit(v);
        }}
      />
      {Platform.OS !== 'web' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Txt variant="label">Trust this device for 30 days</Txt>
            <Txt variant="caption" color={c.ink3}>Skip the code on this phone. Don't turn on for shared devices.</Txt>
          </View>
          <Switch value={trust} onValueChange={setTrust} trackColor={{ true: c.accent, false: c.line }} accessibilityLabel="Trust this device for 30 days" />
        </View>
      )}
      <Button label={confirming ? 'Confirm and open vault' : 'Verify and sign in'} onPress={() => submit()} loading={busy} disabled={code.length !== 6} />
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Tappable onPress={resend} disabled={cooldown > 0} accessibilityLabel={cooldown > 0 ? `Resend code in ${cooldown} seconds` : 'Resend code'} hitSlop={8}>
          <Txt variant="label" color={cooldown > 0 ? c.ink3 : c.accent}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Txt>
        </Tappable>
        <Txt variant="caption" color={c.ink3} style={{ textAlign: 'center' }}>
          Can't find it? Check your Spam or Promotions folder.
        </Txt>
      </View>
    </AuthFrame>
  );
}
