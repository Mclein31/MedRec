import {
  View, Text, TextInput, Pressable, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Image, ImageBackground,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useResponsive } from '../hooks/useResponsive';

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
  const { wp, hp, fp, isTablet, maxFormWidth } = useResponsive();

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

  /* ── responsive styles ─────────────────────────────── */
  const r = {
    hero: {
      height: hp(320),
      paddingHorizontal: wp(40),
      marginTop: 0,
    } as const,
    heroGraphic: {
      transform: [
        { translateX: 0 },
        { translateY: hp(50) },
      ],
    } as const,
    brandRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: wp(5),
      position: 'relative' as const,
      top: hp(90),
      left: wp(-20),
    },
    brandMark: {
      width: fp(75),
      height: fp(75),
      resizeMode: 'contain' as const,
    },
    brand: {
      color: INK,
      fontFamily: 'LexendDeca-Bold',
      fontSize: fp(24),
      lineHeight: fp(27),
    },
    tagline: {
      color: MUTED,
      fontSize: fp(12),
      lineHeight: fp(12),
      marginTop: 0,
    },
    body: {
      marginTop: hp(-15),
      paddingHorizontal: wp(50),
      paddingTop: hp(15),
      paddingBottom: hp(20),
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: wp(35),
      borderTopRightRadius: wp(35),
      overflow: 'hidden' as const,
      ...(isTablet && {
        maxWidth: maxFormWidth,
        alignSelf: 'center' as const,
        width: '100%' as const,
      }),
    },
    title: {
      color: BLUE,
      fontFamily: 'LexendDeca-SemiBold',
      fontSize: fp(30),
      textAlign: 'center' as const,
    },
    subtitle: {
      color: MUTED,
      fontSize: fp(11),
      textAlign: 'center' as const,
      marginTop: 0,
      lineHeight: fp(12),
      marginBottom: hp(20),
    },
    error: {
      color: '#D73A49',
      fontSize: fp(13),
      textAlign: 'center' as const,
      marginBottom: hp(10),
    },
    warning: {
      color: '#C77A00',
      fontSize: fp(13),
      textAlign: 'center' as const,
      marginBottom: hp(10),
    },
    fields: {
      gap: hp(14),
    },
    inputRow: {
      height: hp(57.5),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: wp(20),
      paddingHorizontal: wp(25),
      borderRadius: wp(16),
      borderWidth: 1,
      borderColor: '#D9E7E4',
      backgroundColor: '#FFFFFF',
    },
    fieldIcon: {
      width: fp(25),
      height: fp(25),
      resizeMode: 'contain' as const,
    },
    input: {
      flex: 1,
      color: INK,
      fontSize: fp(14),
      padding: 0,
    },
    eyeIcon: {
      width: fp(22),
      height: fp(22),
      resizeMode: 'contain' as const,
    },
    forgotText: {
      color: BLUE,
      fontSize: fp(12),
      lineHeight: 0,
      marginTop: 0,
    },
    primaryButton: {
      height: hp(57.5),
      backgroundColor: TEAL,
      borderRadius: wp(16),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      position: 'relative' as const,
      marginTop: hp(25),
      marginBottom: hp(18),
    },
    primaryText: {
      color: '#FFFFFF',
      fontFamily: 'LexendDeca-SemiBold',
      fontSize: fp(18),
    },
    arrow: {
      position: 'absolute' as const,
      right: wp(24),
      width: fp(30),
      height: fp(30),
      tintColor: '#FFFFFF',
      resizeMode: 'contain' as const,
    },
    divider: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: wp(18),
      marginBottom: hp(18),
    },
    dividerText: {
      color: MUTED,
      fontSize: fp(12),
    },
    googleButton: {
      height: hp(55),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: wp(12),
      borderRadius: wp(16),
      borderWidth: 1,
      borderColor: '#D9E7E4',
    },
    google: {
      width: fp(26),
      height: fp(26),
      resizeMode: 'contain' as const,
    },
    googleText: {
      color: INK,
      fontSize: fp(16),
      fontWeight: '400' as const,
    },
    createButton: {
      height: hp(57.5),
      marginTop: hp(38),
      borderRadius: wp(16),
      borderWidth: 1,
      borderColor: TEAL,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: wp(10),
    },
    createIcon: {
      width: fp(25),
      height: fp(25),
      tintColor: TEAL,
      resizeMode: 'contain' as const,
    },
    createText: {
      color: TEAL,
      fontSize: fp(18),
      fontWeight: '600' as const,
    },
    footer: {
      paddingHorizontal: wp(40),
      paddingBottom: hp(20),
      paddingTop: hp(5),
    },
    footerText: {
      textAlign: 'center' as const,
      fontSize: fp(12),
      color: MUTED,
      lineHeight: fp(14),
      marginBottom: hp(10),
    },
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]} keyboardShouldPersistTaps="handled">
          <ImageBackground
            source={require('../assets/graphics/login-graphic.png')}
            style={r.hero}
            imageStyle={r.heroGraphic}
            resizeMode="contain"
          >
            <View style={r.brandRow}>
              <Image
                source={require('../assets/logo/logo.png')}
                style={r.brandMark}
              />

              <View>
                <Text style={r.brand}>MedRec</Text>
                <Text style={r.tagline}>
                  Your Health Records in Your Pockets
                </Text>
              </View>
            </View>
          </ImageBackground>

          <View style={r.body}>
            <Text style={r.title}>Welcome Back!</Text>
            <Text style={r.subtitle}>Sign in to access your health records</Text>
            {lockedOut && <Text style={r.error}>Too many attempts. Try again in {countdown}s.</Text>}
            {attempts > 0 && !lockedOut && <Text style={r.warning}>{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining</Text>}

            <View style={r.fields}>
              <View style={[r.inputRow, lockedOut && styles.disabled]}>
                <Image source={require('../assets/icons/mail.png')} style={r.fieldIcon} />
                <TextInput style={r.input} placeholder="Email or Phone" placeholderTextColor={MUTED} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} editable={!lockedOut} />
              </View>
              <View style={[r.inputRow, lockedOut && styles.disabled]}>
                <Image source={require('../assets/icons/padlock.png')} style={r.fieldIcon} />
                <TextInput style={r.input} placeholder="Password" placeholderTextColor={MUTED} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCorrect={false} editable={!lockedOut} />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Image source={showPassword ? require('../assets/icons/open-eye.png') : require('../assets/icons/closed-eye.png')} style={r.eyeIcon} />
                </Pressable>
              </View>
              <Pressable onPress={handleForgotPassword} style={styles.forgot}><Text style={r.forgotText}>Forgot Password?</Text></Pressable>
            </View>

            <Pressable onPress={handleLogin} disabled={loading || lockedOut} style={({ pressed }) => [r.primaryButton, (pressed || lockedOut) && styles.pressed]}>
              <Text style={r.primaryText}>{loading ? 'Signing in...' : lockedOut ? `Locked (${countdown}s)` : 'Sign In'}</Text>
              {!loading && !lockedOut && <Image source={require('../assets/icons/arrow.png')} style={r.arrow} />}
            </Pressable>

            <View style={r.divider}><View style={styles.line} /><Text style={r.dividerText}>or</Text><View style={styles.line} /></View>
            <Pressable onPress={handleSocialPress} style={({ pressed }) => [r.googleButton, pressed && styles.pressed]}>
              <Image source={require('../assets/icons/google.png')} style={r.google} /><Text style={r.googleText}>Sign in with Google</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register')} style={({ pressed }) => [r.createButton, pressed && styles.pressed]}>
              <Image source={require('../assets/icons/user-add.png')} style={r.createIcon} /><Text style={r.createText}>Create an Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={r.footer}><Text style={r.footerText}>By continuing, you agree to our <Text style={styles.footerLink}>Terms of Use</Text> and <Text style={styles.footerLink}>Privacy Policy</Text></Text></View>
    </View>
  );
}

/* ── static styles (values that don't need scaling) ── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  keyboard: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
  },

  scrollTablet: {
    alignItems: 'center',
  },

  disabled: {
    backgroundColor: '#DDF5EE',
  },

  forgot: {
    alignItems: 'flex-end',
  },

  pressed: {
    opacity: 0.72,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#C9D4D2',
  },

  footerLink: {
    color: TEAL,
  },
});