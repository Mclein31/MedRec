import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, Radii } from '../../constants/theme';
import { Button } from '../ui/Button';
import { PrivateModal } from '../security/PrivateModal';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const router = useRouter();
  const { login, register } = useAuth();
  const { insets, isTablet, width } = useResponsive();
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const submitting = useRef(false);
  const inputs = useRef<Record<string, TextInput | null>>({});
  const split = isTablet && width >= 1000;

  useEffect(() => {
    if (!countdown) return;
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submit = async () => {
    if (submitting.current || busy || countdown) return;
    const invalid: Record<string, string> = {};
    if (registering && !fields.name.trim()) invalid.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) invalid.email = 'Enter a valid email address.';
    if (!fields.password) invalid.password = 'Enter your password.';
    else if (registering && (fields.password.length < 8 || !/[A-Z]/.test(fields.password) || !/[0-9]/.test(fields.password))) invalid.password = 'Use 8+ characters, one uppercase letter, and one number.';
    if (registering && fields.confirmation !== fields.password) invalid.confirmation = 'The passwords do not match.';
    setErrors(invalid); setMessage('');
    const firstInvalid = Object.keys(invalid)[0];
    if (firstInvalid) { setMessage('Check the highlighted fields below.'); inputs.current[firstInvalid]?.focus(); return; }
    submitting.current = true;
    setBusy(true);
    try {
      if (registering) await register(fields.name.trim(), fields.email.trim().toLowerCase(), fields.password);
      else await login(fields.email.trim().toLowerCase(), fields.password);
      router.replace('/(tabs)');
    } catch (error) {
      if (!registering && error instanceof ApiError && error.status === 401) {
        const next = attempts + 1; setAttempts(next);
        if (next >= 5) { setCountdown(30); setAttempts(0); }
      }
      setMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally { submitting.current = false; setBusy(false); }
  };

  const requestReset = async () => {
    if (resetting || busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) { setErrors({ email: 'Enter your account email to request a reset.' }); inputs.current.email?.focus(); return; }
    setResetting(true); setMessage('');
    try { const response = await api.forgotPassword(fields.email.trim().toLowerCase()); setMessage(response.message); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to request a reset. Please try again.'); }
    finally { setResetting(false); }
  };

  const privacy = () => setShowPrivacy(true);

  const field = (key: keyof typeof fields, label: string, secure = false) => {
    const keys = registering ? ['name', 'email', 'password', 'confirmation'] : ['email', 'password'];
    const next = keys[keys.indexOf(key) + 1];
    return <View style={styles.fieldGroup} key={key}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, !!errors[key] && styles.invalid]}>
        <TextInput ref={input => { inputs.current[key] = input; }} value={fields[key]} onChangeText={value => { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }} style={styles.input} accessibilityLabel={label} accessibilityHint={errors[key]} placeholder={key === 'email' ? 'you@example.com' : key === 'name' ? 'Your full name' : undefined} placeholderTextColor={Colors.muted} keyboardType={key === 'email' ? 'email-address' : 'default'} autoCapitalize={key === 'name' ? 'words' : 'none'} autoCorrect={false} autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : registering ? 'new-password' : 'current-password'} textContentType={key === 'email' ? 'emailAddress' : key === 'name' ? 'name' : registering ? 'newPassword' : 'password'} secureTextEntry={secure && !showPassword} editable={!busy && !countdown} returnKeyType={next ? 'next' : 'go'} onSubmitEditing={next ? () => inputs.current[next]?.focus() : submit} />
        {secure && <Pressable onPress={() => setShowPassword(value => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide passwords' : 'Show passwords'} style={styles.eye}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.muted} /></Pressable>}
      </View>
      {!!errors[key] && <Text style={styles.fieldError} accessibilityLiveRegion="polite">{errors[key]}</Text>}
      {key === 'password' && registering && !errors.password && <Text style={styles.hint}>8+ characters · one uppercase letter · one number</Text>}
    </View>;
  };

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <StatusBar style="dark" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.workspace, split && styles.split]}>
        {split && <View style={styles.story}><Ionicons name="medical-outline" size={36} color={Colors.tealLight} /><Text style={styles.storyTitle}>A little clarity.{"\n"}A healthier record.</Text><Text style={styles.storyBody}>Keep the paperwork together, find what matters, and bring your history to your next appointment.</Text>{['Scan a document or add a note', 'Choose what your doctor can see', 'Keep emergency details close'].map((text, index) => <View key={text} style={styles.storyRow}><Text style={styles.storyNumber}>0{index + 1}</Text><Text style={styles.storyRowText}>{text}</Text></View>)}</View>}
        <View style={[styles.form, isTablet && styles.tabletForm]}>
          <View style={styles.brand}><Image source={require('../../assets/logo/logo.png')} style={styles.logo} /><Text style={styles.brandName}>MedRec</Text></View>
          <Text style={styles.eyebrow}>YOUR HEALTH, TOGETHER</Text>
          <Text style={styles.title} accessibilityRole="header">{registering ? 'Make room for\nyour health history.' : 'Good to see\nyou again.'}</Text>
          <Text style={styles.subtitle}>{registering ? 'Start with an account. Add your first record when you’re ready.' : 'Sign in to pick up where you left off.'}</Text>
          {(!!message || countdown > 0) && <View style={styles.errorBox} accessibilityLiveRegion="assertive"><Ionicons name="information-circle-outline" size={20} color={Colors.ink} /><Text style={styles.errorText}>{countdown ? `Please wait ${countdown} seconds before trying again.` : message}</Text></View>}
          {registering && field('name', 'Full name')}{field('email', 'Email address')}{field('password', 'Password', true)}{registering && field('confirmation', 'Confirm password', true)}
          {!registering && <Pressable onPress={requestReset} disabled={resetting || busy} accessibilityRole="button" style={styles.reset}><Text style={styles.link}>{resetting ? 'Requesting reset…' : 'Forgot password?'}</Text></Pressable>}
          <Button label={registering ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} disabled={countdown > 0} rightIcon={<Ionicons name="arrow-forward" size={18} color={Colors.white} />} />
          <View style={styles.alternative}><Text style={styles.hint}>{registering ? 'Already have an account?' : 'New to MedRec?'}</Text><Pressable onPress={() => router.replace(registering ? '/login' : '/register')} accessibilityRole="button" style={styles.textButton}><Text style={styles.link}>{registering ? 'Sign in' : 'Create account'}</Text></Pressable></View>
          <Pressable onPress={privacy} accessibilityRole="button" style={styles.privacyLink}><Ionicons name="shield-checkmark-outline" size={16} color={Colors.muted} /><Text style={styles.hint}>About your records & privacy</Text></Pressable>
        </View>
      </View>
    </ScrollView>
    <PrivateModal visible={showPrivacy} transparent animationType="fade" onRequestClose={() => setShowPrivacy(false)}>
      <View style={styles.privacyScrim}><View style={styles.privacyCard} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.privacyContent}>
          <Text style={styles.privacyTitle} accessibilityRole="header">Your records &amp; privacy</Text>
          <Text style={styles.privacyBody}>Your account holds the records and profile details you add. Anyone with a sharing QR code can read its chosen records until access expires or you revoke it.</Text>
          <Text style={styles.privacyBody}>When you request an AI explanation, relevant record text is sent to the configured AI service. Review the original document with your clinician.</Text>
          <Text style={styles.privacyBody}>Export or delete your account from Profile. Copies downloaded by recipients remain outside MedRec’s control.</Text>
          <Button label="Got it" onPress={() => setShowPrivacy(false)} />
        </ScrollView>
      </View></View>
    </PrivateModal>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  privacyScrim: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.backdrop },
  privacyCard: { width: '100%', maxWidth: 500, maxHeight: '85%', alignSelf: 'center', backgroundColor: Colors.surface, borderRadius: 24, padding: 24 },
  privacyContent: { gap: 20 },
  privacyTitle: { fontFamily: 'LexendDeca-Bold', fontSize: 23, lineHeight: 31, color: Colors.ink },
  privacyBody: { fontFamily: 'LexendDeca-Regular', fontSize: 14, lineHeight: 23, color: Colors.muted },
  root: { flex: 1, backgroundColor: Colors.bg }, scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }, workspace: { width: '100%', maxWidth: 1100, alignSelf: 'center' }, split: { flexDirection: 'row', gap: 48, alignItems: 'stretch' },
  form: { width: '100%', maxWidth: 460, alignSelf: 'center' }, tabletForm: { backgroundColor: Colors.surface, padding: 32, borderRadius: 28, borderWidth: 1, borderColor: Colors.border }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 }, logo: { width: 32, height: 32, resizeMode: 'contain' }, brandName: { fontFamily: 'LexendDeca-Bold', fontSize: 22, color: Colors.ink },
  eyebrow: { fontFamily: 'LexendDeca-SemiBold', fontSize: 11, letterSpacing: 1.4, color: Colors.teal, marginBottom: 12 }, title: { fontFamily: 'LexendDeca-Bold', fontSize: 32, lineHeight: 40, letterSpacing: -0.8, color: Colors.ink }, subtitle: { fontFamily: 'LexendDeca-Regular', fontSize: 14, lineHeight: 22, color: Colors.muted, marginTop: 12, marginBottom: 28 },
  fieldGroup: { marginBottom: 18, gap: 8 }, label: { fontFamily: 'LexendDeca-SemiBold', fontSize: 13, color: Colors.ink }, field: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#A8BCB7', borderRadius: Radii.button, minHeight: 54 }, invalid: { borderColor: Colors.danger, backgroundColor: Colors.dangerLight }, input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'LexendDeca-Regular', fontSize: 15, color: Colors.ink }, eye: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  hint: { fontFamily: 'LexendDeca-Regular', fontSize: 12, lineHeight: 18, color: Colors.muted }, fieldError: { fontFamily: 'LexendDeca-Regular', fontSize: 12, lineHeight: 18, color: Colors.danger }, errorBox: { backgroundColor: Colors.tealLight, padding: 14, borderRadius: 12, flexDirection: 'row', gap: 10, marginBottom: 20 }, errorText: { flex: 1, fontFamily: 'LexendDeca-Regular', fontSize: 13, lineHeight: 20, color: Colors.ink }, reset: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginTop: -10, marginBottom: 10 }, link: { fontFamily: 'LexendDeca-SemiBold', fontSize: 13, color: Colors.teal },
  alternative: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }, textButton: { minHeight: 44, justifyContent: 'center' }, privacyLink: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 }, story: { flex: 1, backgroundColor: Colors.ink, borderRadius: 32, padding: 40, justifyContent: 'center', gap: 24 }, storyTitle: { fontFamily: 'LexendDeca-Bold', fontSize: 40, lineHeight: 50, letterSpacing: -1.2, color: Colors.white }, storyBody: { fontFamily: 'LexendDeca-Regular', fontSize: 16, lineHeight: 26, color: '#D0E2DE' }, storyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 }, storyNumber: { fontFamily: 'LexendDeca-SemiBold', fontSize: 14, color: Colors.tealLight }, storyRowText: { flex: 1, fontFamily: 'LexendDeca-Regular', fontSize: 14, lineHeight: 22, color: Colors.white },
});
