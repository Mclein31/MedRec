import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
const GREEN = '#4e7c4e';
const BLUE_ICON = '#5c9ee8';

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

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startLockout = () => {
    setLockedOut(true);
    setCountdown(LOCKOUT_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setLockedOut(false);
          setAttempts(0);
          return 0;
        }
        return prev - 1;
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
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      const remaining = MAX_ATTEMPTS - newAttempts;
      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout();
        Alert.alert('Too many attempts', `Account temporarily locked. Try again in ${LOCKOUT_SECONDS} seconds.`);
      } else {
        Alert.alert('Wrong password', remaining === 1
          ? '1 attempt remaining before lockout.'
          : `${remaining} attempts remaining.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialPress = (provider: string) => {
    Alert.alert('Coming soon', `${provider} sign-in will be available in a future update.`);
  };

  const handleForgotPassword = () => {
    Alert.alert('Coming soon', 'Password reset will be available in a future update.');
  };

  const triesLeft = MAX_ATTEMPTS - attempts;
  const showWarning = attempts > 0 && !lockedOut;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">

          <View style={styles.logoArea}>
            <Image
              source={require('../assets/logo/MedRec-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>sign in to continue</Text>
          </View>

          {lockedOut && (
            <View style={styles.lockoutBanner}>
              <Text style={styles.lockoutText}>Too many attempts. Try again in {countdown}s</Text>
            </View>
          )}

          {showWarning && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                {triesLeft === 1 ? '1 attempt remaining before lockout' : `${triesLeft} attempts remaining`}
              </Text>
            </View>
          )}

          <View style={styles.fields}>
            <View style={[styles.inputRow, lockedOut && styles.inputDisabled]}>
              <Image source={require('../assets/icons/person.png')} style={[styles.fieldIcon, { tintColor: BLUE_ICON }]} />
              <TextInput
                style={styles.input}
                placeholder="Email or Phone"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!lockedOut}
              />
            </View>

            <View style={[styles.inputRow, lockedOut && styles.inputDisabled]}>
              <Image source={require('../assets/icons/padlock.png')} style={[styles.fieldIcon, { tintColor: BLUE_ICON }]} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
                editable={!lockedOut}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Image
                  source={showPassword
                    ? require('../assets/icons/hidden-eye.png')
                    : require('../assets/icons/eye-open.png')}
                  style={styles.eyeIcon}
                />
              </Pressable>
            </View>

            <Pressable onPress={handleForgotPassword} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading || lockedOut}
            style={({ pressed }) => [styles.primaryBtn, (pressed || lockedOut) && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Logging in...' : lockedOut ? `Locked (${countdown}s)` : 'Login'}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable onPress={() => handleSocialPress('Google')} style={styles.socialBtn}>
              <Image source={require('../assets/icons/google.png')} style={styles.socialIcon} />
            </Pressable>
            <Pressable onPress={() => handleSocialPress('Apple')} style={styles.socialBtn}>
              <Image source={require('../assets/icons/apple.png')} style={styles.socialIcon} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/register')}
            style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.7 }]}
          >
            <Image source={require('../assets/icons/user-add.png')} style={[styles.createIcon, { tintColor: GREEN }]} />
            <Text style={styles.createBtnText}>create an account</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you are agreeing to our{' '}
          <Text style={styles.footerLink}>Terms of Use</Text>
          {' '}and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 },
  logoArea: { alignItems: 'center', gap: 6, marginBottom: 28, marginTop: 30 },
  logo: { width: 135, height: 135 },
  title: { fontFamily: 'LexendDeca-Bold',fontSize: 50, color: '#1a1a1a', letterSpacing: 2, margin: 0 },
  subtitle: { fontSize: 15, color: '#888', margin: 0},
  lockoutBanner: {
    backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#ffb3b3',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  lockoutText: { fontSize: 13, color: '#FF3B30', fontWeight: '500', textAlign: 'center' },
  warningBanner: {
    backgroundColor: '#FFF9F0', borderWidth: 1, borderColor: '#FFD699',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  warningText: { fontSize: 13, color: '#FF9500', fontWeight: '500', textAlign: 'center' },
  fields: { gap: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 60,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
  fieldIcon: { width: 25, height: 25, resizeMode: 'contain' },
  input: { flex: 1, fontSize: 17.5, color: '#222', padding: 0 },
  eyeIcon: { width: 20, height: 20, resizeMode: 'contain', tintColor: '#aaa' },
  forgotRow: { alignItems: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 14, color: GREEN },
  primaryBtn: {
    height: 60, backgroundColor: GREEN, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 30, marginBottom: 20,
  },
  primaryBtnText: { fontFamily: 'LexendDeca-Bold',fontSize: 25, color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#e3e0e0' },
  dividerText: { fontSize: 14, color: GREEN },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 50, marginBottom: 25},
  socialBtn: {
    width: 54, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  socialIcon: { width: 45, height: 45, resizeMode: 'contain'},
  createBtn: {
    height: 56,flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: GREEN , borderRadius: 12, paddingVertical: 14,
  },
  createIcon: { width: 25, height: 25, resizeMode: 'contain' },
  createBtnText: { fontFamily: 'LexendDeca-Bold' ,fontSize: 17.5, color: GREEN, fontWeight: '500' },
  footer: { paddingHorizontal: 28, paddingBottom: 35, },
  footerText: { fontSize: 12, color: '#7d7b7b', textAlign: 'center', lineHeight: 16 },
  footerLink: { color: GREEN, fontSize: 13, fontWeight: '600' },
});
