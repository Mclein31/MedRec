import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { api, type Challenge } from '../../src/lib/api';
import { fieldError, messageFor } from '../../src/lib/errors';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button } from '../../src/ui/core';
import { CodeInput, Field } from '../../src/ui/form';

export default function Forgot() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const run = async (fn: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthFrame title="Password changed" subtitle="For your safety, every device was signed out. Sign in with your new password.">
        <Button label="Go to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
      </AuthFrame>
    );
  }

  if (!challenge) {
    return (
      <AuthFrame title="Reset your password" subtitle="Enter your account email. If it's registered, we'll send a 6-digit code.">
        {!!error && <Banner message={messageFor(error)} />}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" returnKeyType="go" />
        <Button label="Send reset code" loading={busy} onPress={() => run(async () => setChallenge((await api.forgot(email.trim().toLowerCase())).challenge))} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a new password" subtitle={`Enter the code sent to ${challenge.maskedEmail}, then your new password.`}>
      {!!error && !fieldError(error, 'password') && <Banner message={messageFor(error)} />}
      <CodeInput value={code} onChange={setCode} />
      <Field label="New password" value={password} onChangeText={setPassword} secureToggle autoComplete="new-password" textContentType="newPassword" hint="At least 10 characters." error={fieldError(error, 'password')} />
      <Button
        label="Save new password"
        loading={busy}
        disabled={code.length !== 6 || password.length < 10}
        onPress={() =>
          run(async () => {
            await api.reset(challenge.challengeId, code, password);
            setDone(true);
          })
        }
      />
    </AuthFrame>
  );
}
