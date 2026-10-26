import { router } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useAuth } from '../../src/auth';
import { messageFor } from '../../src/lib/errors';
import { setPending } from '../../src/pending';
import { space, useColors } from '../../src/theme';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button, TextLink, Txt } from '../../src/ui/core';
import { Field } from '../../src/ui/form';
import { Rule } from '../../src/ui/layout';

export default function SignIn() {
  const c = useColors();
  const { signIn, state } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(state.status === 'signedOut' && state.reason === 'expired' ? 'Your session ended. Sign in again to continue.' : null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (inFlight.current) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter the email you signed up with.');
    if (!password) return setError('Enter your password.');
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const challenge = await signIn(email.trim().toLowerCase(), password);
      if (challenge) {
        setPending({ challenge, email: email.trim().toLowerCase() });
        router.push('/(auth)/code');
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to access your medical records." footer={<Button label="Sign in" onPress={submit} loading={busy} />}>
      {error && <Banner message={error} />}
      <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label="Password" value={password} onChangeText={setPassword} secureToggle autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      <TextLink label="Forgot your password?" icon={null} onPress={() => router.push({ pathname: '/(auth)/forgot', params: { email } })} />
      <Rule />
      <Txt color={c.ink3} style={{ marginBottom: -space.sm }}>New here?</Txt>
      <Button kind="secondary" label="Create an account" onPress={() => router.replace('/(auth)/register')} />
    </AuthFrame>
  );
}
