import { router } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useAuth } from '../../src/auth';
import { ApiError } from '../../src/lib/http';
import { fieldError, messageFor } from '../../src/lib/errors';
import { setPending } from '../../src/pending';
import { space, useColors } from '../../src/theme';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button, Txt } from '../../src/ui/core';
import { Field } from '../../src/ui/form';
import { Rule } from '../../src/ui/layout';

export default function Register() {
  const c = useColors();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const normalized = email.trim().toLowerCase();
      const challenge = await register(name, normalized, password);
      setPending({ challenge, email: normalized });
      router.push('/(auth)/code');
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const exists = error instanceof ApiError && error.code === 'EMAIL_ALREADY_EXISTS';
  const general = error && !fieldError(error, 'name') && !fieldError(error, 'email') && !fieldError(error, 'password') ? messageFor(error) : null;

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Your records stay private to you until you choose to share them."
      remy={{ pose: 'default', motion: 'hop' }}
      footer={<Button label="Create account" onPress={submit} loading={busy} />}
    >
      {general && <Banner message={general} action={exists ? { label: 'Sign in', onPress: () => router.replace('/(auth)/sign-in') } : undefined} />}
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} error={fieldError(error, 'name')} />
      <Field ref={emailRef} label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} error={fieldError(error, 'email')} hint="We'll send a code here to confirm it's yours." />
      <Field ref={passwordRef} label="Password" value={password} onChangeText={setPassword} secureToggle autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} error={fieldError(error, 'password')} hint="At least 10 characters. A short phrase works well." />
      <Rule />
      <Txt color={c.ink3} style={{ marginBottom: -space.sm }}>Already a member?</Txt>
      <Button kind="secondary" label="Sign in" onPress={() => router.replace('/(auth)/sign-in')} />
    </AuthFrame>
  );
}
