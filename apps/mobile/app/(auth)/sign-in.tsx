import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { useAuth } from '../../src/auth';
import { messageFor } from '../../src/lib/errors';
import { setPending } from '../../src/pending';
import { space, useColors } from '../../src/theme';
import { AuthFrame } from '../../src/ui/AuthFrame';
import { Banner, Button, Eyebrow, Tappable, TextLink, Txt } from '../../src/ui/core';
import { Field } from '../../src/ui/form';
import { formAttention, Remy, type RemyAttention } from '../../src/ui/Remy';
import { Rise } from '../../src/ui/motion';
import { SocialSignIn } from '../../src/ui/SocialSignIn';

export default function SignIn() {
  const c = useColors();
  const { signIn, state } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const reason = state.status === 'signedOut' ? state.reason : undefined;
  const [error, setError] = useState<string | null>(reason === 'expired' ? 'Your session ended. Sign in again to continue.' : null);
  const notice = reason === 'passwordChanged' ? 'Password changed. Every device was signed out — sign in with your new password.' : reason === 'deleted' ? 'Your account and everything in it was deleted.' : null;
  const [busy, setBusy] = useState(false);
  const [attention, setAttention] = useState<RemyAttention>('idle');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
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
    <AuthFrame title="Welcome back" remy={null} intro={
      <Rise from={0} duration={200}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, paddingBottom: space.xs }}>
          <View style={{ flex: 1, gap: space.sm }}>
            <Eyebrow color={c.ink3}>A little peace of mind</Eyebrow>
            <Txt variant="display" accessibilityRole="header">{'Good to have\nyou back.'}</Txt>
          </View>
          <View style={{ width: 100, height: 108, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: c.gold }} />
            <Remy pose={busy ? 'reading' : 'greeting'} size={88} motion={busy ? 'read' : 'wave'} attention={formAttention(attention, busy, passwordVisible)} active={focused} delay={100} />
          </View>
        </View>
        <Txt color={c.ink3} style={{ fontSize: 15, lineHeight: 22 }}>Your records, right where you left them.</Txt>
      </Rise>
    }>
      {error ? <Banner message={error} /> : notice ? <Banner tone="info" message={notice} /> : null}
      <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onFocus={() => setAttention('form')} onBlur={() => setAttention('idle')} onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label="Password" value={password} onChangeText={setPassword} secureToggle onVisibilityChange={setPasswordVisible} autoComplete="current-password" textContentType="password" returnKeyType="go" onFocus={() => setAttention('private')} onBlur={() => setAttention('idle')} onSubmitEditing={submit} />
      <View style={{ alignItems: 'flex-end', marginTop: -space.sm }}><TextLink label="Forgot password?" icon={null} onPress={() => router.push({ pathname: '/(auth)/forgot', params: { email } })} /></View>
      <Button kind="dark" label="Sign in" onPress={submit} loading={busy} style={{ minHeight: 48, borderRadius: 10 }} />
      <SocialSignIn />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Txt variant="caption" color={c.ink3}>New to MedRec?</Txt>
        <Tappable onPress={() => router.replace('/(auth)/register')} accessibilityLabel="Create an account" style={{ minHeight: 44, justifyContent: 'center' }}><Txt variant="label">Create an account</Txt></Tappable>
      </View>
    </AuthFrame>
  );
}
