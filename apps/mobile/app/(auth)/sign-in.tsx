import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useAuth } from '../../src/auth';
import { messageFor } from '../../src/lib/errors';
import { setPending } from '../../src/pending';
import { useColors } from '../../src/theme';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button, Txt } from '../../src/ui/core';
import { Field } from '../../src/ui/form';

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
    <AuthFrame
      title="Sign in"
      subtitle="We'll email you a 6-digit code to finish signing in."
      back={false}
      footer={
        <Txt color={c.ink3} style={{ textAlign: 'center' }}>
          New to MedRec?{' '}
          <Link href="/(auth)/register" replace style={{ color: c.accent, fontFamily: 'LexendDeca-Medium' }}>
            Create your vault
          </Link>
        </Txt>
      }
    >
      {error && <Banner message={error} />}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label="Password" value={password} onChangeText={setPassword} secureToggle autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      <Button label="Continue to code" onPress={submit} loading={busy} />
      <Button kind="ghost" label="Forgot password?" onPress={() => router.push({ pathname: '/(auth)/forgot', params: { email } })} />
    </AuthFrame>
  );
}
