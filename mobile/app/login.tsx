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
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

const MAX_ATTEMPTS = 5;       // lock out after this many failed tries
const LOCKOUT_SECONDS = 30;   // how long the lockout lasts

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Rate limiting state
  const [attempts, setAttempts] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startLockout = () => {
    setLockedOut(true);
    setCountdown(LOCKOUT_SECONDS);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setLockedOut(false);
          setAttempts(0); // reset attempts after lockout expires
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
      // Success — reset attempts and navigate
      setAttempts(0);
      router.replace('/(tabs)');
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      const remaining = MAX_ATTEMPTS - newAttempts;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock them out
        startLockout();
        Alert.alert(
          'Too many failed attempts',
          `Your account has been temporarily locked. Please wait ${LOCKOUT_SECONDS} seconds before trying again.`
        );
      } else {
        // Show tries remaining
        Alert.alert(
          'Wrong password',
          remaining === 1
            ? `Incorrect email or password. 1 attempt remaining before temporary lockout.`
            : `Incorrect email or password. ${remaining} attempts remaining.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const triesLeft = MAX_ATTEMPTS - attempts;
  const showAttemptsWarning = attempts > 0 && !lockedOut;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + title */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              {/* Replace this Ionicons icon with your own logo later */}
              <Ionicons name="pulse" size={28} color="#fff" />
            </View>
            <Text style={styles.appName}>MedRecord</Text>
            <Text style={styles.tagline}>Your health records, secured</Text>
          </View>

          {/* Lockout banner */}
          {lockedOut && (
            <View style={styles.lockoutBanner}>
              <Ionicons name="lock-closed" size={16} color="#FF3B30" />
              <Text style={styles.lockoutText}>
                Too many attempts. Try again in {countdown}s
              </Text>
            </View>
          )}

          {/* Attempts warning */}
          {showAttemptsWarning && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={15} color="#FF9500" />
              <Text style={styles.warningText}>
                {triesLeft === 1
                  ? '1 attempt remaining before lockout'
                  : `${triesLeft} attempts remaining`}
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputRow, lockedOut && styles.inputDisabled]}>
                <Ionicons name="mail-outline" size={16} color={GREEN} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#aaa"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!lockedOut}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, lockedOut && styles.inputDisabled]}>
                <Ionicons name="lock-closed-outline" size={16} color={GREEN} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  editable={!lockedOut}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={GREEN_MID}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Primary button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading || lockedOut}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || lockedOut) && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Logging in...' : lockedOut ? `Locked (${countdown}s)` : 'Log in'}
            </Text>
          </Pressable>

          {/* Secondary button */}
          <Pressable
            onPress={() => router.push('/register')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.secondaryBtnText}>Create account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your data is encrypted and never shared without your consent.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 56,
    marginTop: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 22,
    fontWeight: '500',
    color: GREEN_DARK,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 15,
    color: GREEN_MID,
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffb3b3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  lockoutText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF9F0',
    borderWidth: 1,
    borderColor: '#FFD699',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '500',
    flex: 1,
  },
  form: {
    gap: 12,
    marginBottom: 20,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '500',
    color: GREEN_MID,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 20,
    gap: 8,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  inputIcon: {
    width: 18,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    padding: 0,
  },
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 20,
    fontWeight: '500',
    color: GREEN_MID,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 31,
  },
  footerText: {
    fontSize: 12,
    color: GREEN_MID,
    textAlign: 'center',
    opacity: 0.55,
    lineHeight: 15,
  },
});