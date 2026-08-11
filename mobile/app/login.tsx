import {
  View, Text, TextInput, Pressable, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Image, ImageBackground,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

const TEAL = '#159A83';
const BLUE = '#1976D2';
const INK = '#12343B';
const MUTED = '#64748B';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const startLockout = () => {
    setLockedOut(true);
    setCountdown(LOCKOUT_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(countdownRef.current!);
          setLockedOut(false);
          setAttempts(0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (lockedOut) return;
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      setAttempts(0);
      router.replace('/(tabs)');
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout();
        Alert.alert('Too many attempts', `Account temporarily locked. Try again in ${LOCKOUT_SECONDS} seconds.`);
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        Alert.alert('Wrong password', remaining === 1 ? '1 attempt remaining before lockout.' : `${remaining} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialPress = () => Alert.alert('Coming soon', 'Google sign-in will be available in a future update.');
  const handleForgotPassword = () => Alert.alert('Coming soon', 'Password reset will be available in a future update.');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ImageBackground source={require('../assets/graphics/login-graphic.png')} style={[styles.hero, { paddingTop: insets.top + 16 }]} resizeMode="cover">
            <View style={styles.brandRow}>
              <Image source={require('../assets/logo/logo.png')} style={styles.brandMark} />
              <View>
                <Text style={styles.brand}>MedRec</Text>
                <Text style={styles.tagline}>Your Health Records in Your Pockets</Text>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.body}>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to access your health records</Text>
            {lockedOut && <Text style={styles.error}>Too many attempts. Try again in {countdown}s.</Text>}
            {attempts > 0 && !lockedOut && <Text style={styles.warning}>{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining</Text>}

            <View style={styles.fields}>
              <View style={[styles.inputRow, lockedOut && styles.disabled]}>
                <Image source={require('../assets/icons/mail.png')} style={styles.fieldIcon} />
                <TextInput style={styles.input} placeholder="Email or Phone" placeholderTextColor={MUTED} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} editable={!lockedOut} />
              </View>
              <View style={[styles.inputRow, lockedOut && styles.disabled]}>
                <Image source={require('../assets/icons/padlock.png')} style={styles.fieldIcon} />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor={MUTED} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCorrect={false} editable={!lockedOut} />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Image source={showPassword ? require('../assets/icons/open-eye.png') : require('../assets/icons/closed-eye.png')} style={styles.eyeIcon} />
                </Pressable>
              </View>
              <Pressable onPress={handleForgotPassword} style={styles.forgot}><Text style={styles.forgotText}>Forgot Password?</Text></Pressable>
            </View>

            <Pressable onPress={handleLogin} disabled={loading || lockedOut} style={({ pressed }) => [styles.primaryButton, (pressed || lockedOut) && styles.pressed]}>
              <Text style={styles.primaryText}>{loading ? 'Signing in...' : lockedOut ? `Locked (${countdown}s)` : 'Sign In'}</Text>
              {!loading && !lockedOut && <Image source={require('../assets/icons/arrow.png')} style={styles.arrow} />}
            </Pressable>

            <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>or</Text><View style={styles.line} /></View>
            <Pressable onPress={handleSocialPress} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
              <Image source={require('../assets/icons/google.png')} style={styles.google} /><Text style={styles.googleText}>Sign in with Google</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register')} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <Image source={require('../assets/icons/user-add.png')} style={styles.createIcon} /><Text style={styles.createText}>Create an Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}><Text style={styles.footerText}>By continuing, you agree to our <Text style={styles.footerLink}>Terms of Use</Text> and <Text style={styles.footerLink}>Privacy Policy</Text></Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4FAF9' },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { height: 180, paddingHorizontal: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 42, height: 42, resizeMode: 'contain' },
  brand: { color: INK, fontFamily: 'LexendDeca-Bold', fontSize: 18 },
  tagline: { color: MUTED, fontSize: 8.5, marginTop: 1 },
  body: { paddingHorizontal: 28, paddingTop: 22, paddingBottom: 22 },
  title: { color: BLUE, fontFamily: 'LexendDeca-Bold', fontSize: 24, textAlign: 'center' },
  subtitle: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  error: { color: '#D73A49', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  warning: { color: '#C77A00', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  fields: { gap: 11 },
  inputRow: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#D9E7E4', backgroundColor: '#fff' },
  disabled: { backgroundColor: '#DDF5EE' },
  fieldIcon: { width: 18, height: 18, resizeMode: 'contain' },
  input: { flex: 1, color: INK, fontSize: 13, padding: 0 },
  eyeIcon: { width: 18, height: 18, resizeMode: 'contain' },
  forgot: { alignItems: 'flex-end', marginTop: -1 },
  forgotText: { color: BLUE, fontSize: 10 },
  primaryButton: { height: 48, backgroundColor: TEAL, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 54, marginTop: 16, marginBottom: 16 },
  primaryText: { color: '#fff', fontFamily: 'LexendDeca-Bold', fontSize: 14 },
  arrow: { width: 16, height: 16, tintColor: '#fff', resizeMode: 'contain' },
  pressed: { opacity: 0.72 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#D9E7E4' },
  dividerText: { color: MUTED, fontSize: 11 },
  googleButton: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 11, borderWidth: 1, borderColor: '#D9E7E4' },
  google: { width: 20, height: 20, resizeMode: 'contain' },
  googleText: { color: INK, fontSize: 13, fontWeight: '600' },
  createButton: { height: 44, marginTop: 16, borderRadius: 11, borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  createIcon: { width: 17, height: 17, tintColor: TEAL, resizeMode: 'contain' },
  createText: { color: TEAL, fontSize: 13, fontWeight: '600' },
  footer: { paddingHorizontal: 30, paddingBottom: 17 },
  footerText: { textAlign: 'center', fontSize: 8.5, color: MUTED, lineHeight: 13 },
  footerLink: { color: TEAL },
});
