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

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ImageBackground
            source={require('../assets/graphics/login-graphic.png')}
            style={{ height: hp(320), paddingHorizontal: wp(40), marginTop: 0 }}
            imageStyle={{ transform: [{ translateX: 0 }, { translateY: hp(50) }] }}
            resizeMode="contain"
          >
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: wp(5),
              position: 'relative', top: hp(90), left: wp(-20),
            }}>
              <Image
                source={require('../assets/logo/logo.png')}
                style={{ width: fp(75), height: fp(75), resizeMode: 'contain' }}
              />
              <View>
                <Text style={{ color: INK, fontFamily: 'LexendDeca-Bold', fontSize: fp(24), lineHeight: fp(27) }}>MedRec</Text>
                <Text style={{ color: MUTED, fontSize: fp(12), lineHeight: fp(12), marginTop: 0 }}>
                  Your Health Records in Your Pockets
                </Text>
              </View>
            </View>
          </ImageBackground>

          <View style={[
            {
              marginTop: hp(-15), paddingHorizontal: wp(50), paddingTop: hp(15), paddingBottom: hp(20),
              backgroundColor: '#FFFFFF', borderTopLeftRadius: wp(35), borderTopRightRadius: wp(35), overflow: 'hidden',
            },
            isTablet && { maxWidth: maxFormWidth, alignSelf: 'center', width: '100%' },
          ]}>
            <Text style={{ color: BLUE, fontFamily: 'LexendDeca-SemiBold', fontSize: fp(30), textAlign: 'center' }}>Welcome Back!</Text>
            <Text style={{ color: MUTED, fontSize: fp(11), textAlign: 'center', marginTop: 0, lineHeight: fp(12), marginBottom: hp(20) }}>Sign in to access your health records</Text>
            {lockedOut && <Text style={{ color: '#D73A49', fontSize: fp(13), textAlign: 'center', marginBottom: hp(10) }}>Too many attempts. Try again in {countdown}s.</Text>}
            {attempts > 0 && !lockedOut && <Text style={{ color: '#C77A00', fontSize: fp(13), textAlign: 'center', marginBottom: hp(10) }}>{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining</Text>}

            <View style={{ gap: hp(14) }}>
              <View style={[{
                height: hp(57.5), flexDirection: 'row', alignItems: 'center', gap: wp(20),
                paddingHorizontal: wp(25), borderRadius: wp(16), borderWidth: 1, borderColor: '#D9E7E4', backgroundColor: '#FFFFFF',
              }, lockedOut && styles.disabled]}>
                <Image source={require('../assets/icons/mail.png')} style={{ width: fp(25), height: fp(25), resizeMode: 'contain' }} />
                <TextInput style={{ flex: 1, color: INK, fontSize: fp(14), padding: 0 }} placeholder="Email or Phone" placeholderTextColor={MUTED} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} editable={!lockedOut} />
              </View>
              <View style={[{
                height: hp(57.5), flexDirection: 'row', alignItems: 'center', gap: wp(20),
                paddingHorizontal: wp(25), borderRadius: wp(16), borderWidth: 1, borderColor: '#D9E7E4', backgroundColor: '#FFFFFF',
              }, lockedOut && styles.disabled]}>
                <Image source={require('../assets/icons/padlock.png')} style={{ width: fp(25), height: fp(25), resizeMode: 'contain' }} />
                <TextInput style={{ flex: 1, color: INK, fontSize: fp(14), padding: 0 }} placeholder="Password" placeholderTextColor={MUTED} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCorrect={false} editable={!lockedOut} />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Image source={showPassword ? require('../assets/icons/open-eye.png') : require('../assets/icons/closed-eye.png')} style={{ width: fp(22), height: fp(22), resizeMode: 'contain' }} />
                </Pressable>
              </View>
              <Pressable onPress={handleForgotPassword} style={styles.forgot}><Text style={{ color: BLUE, fontSize: fp(12), lineHeight: 0, marginTop: 0 }}>Forgot Password?</Text></Pressable>
            </View>

            <Pressable onPress={handleLogin} disabled={loading || lockedOut} style={({ pressed }) => [{
              height: hp(57.5), backgroundColor: TEAL, borderRadius: wp(16), alignItems: 'center', justifyContent: 'center',
              position: 'relative', marginTop: hp(25), marginBottom: hp(18),
            }, (pressed || lockedOut) && styles.pressed]}>
              <Text style={{ color: '#FFFFFF', fontFamily: 'LexendDeca-SemiBold', fontSize: fp(18) }}>{loading ? 'Signing in...' : lockedOut ? `Locked (${countdown}s)` : 'Sign In'}</Text>
              {!loading && !lockedOut && <Image source={require('../assets/icons/arrow.png')} style={{ position: 'absolute', right: wp(24), width: fp(30), height: fp(30), tintColor: '#FFFFFF', resizeMode: 'contain' }} />}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(18), marginBottom: hp(18) }}><View style={styles.line} /><Text style={{ color: MUTED, fontSize: fp(12) }}>or</Text><View style={styles.line} /></View>
            <Pressable onPress={handleSocialPress} style={({ pressed }) => [{
              height: hp(55), flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: wp(12), borderRadius: wp(16), borderWidth: 1, borderColor: '#D9E7E4',
            }, pressed && styles.pressed]}>
              <Image source={require('../assets/icons/google.png')} style={{ width: fp(26), height: fp(26), resizeMode: 'contain' }} /><Text style={{ color: INK, fontSize: fp(16), fontWeight: '400' }}>Sign in with Google</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register')} style={({ pressed }) => [{
              height: hp(57.5), marginTop: hp(38), borderRadius: wp(16), borderWidth: 1, borderColor: TEAL,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: wp(10),
            }, pressed && styles.pressed]}>
              <Image source={require('../assets/icons/user-add.png')} style={{ width: fp(25), height: fp(25), tintColor: TEAL, resizeMode: 'contain' }} /><Text style={{ color: TEAL, fontSize: fp(18), fontWeight: '600' }}>Create an Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ paddingHorizontal: wp(40), paddingBottom: hp(20), paddingTop: hp(5) }}><Text style={{ textAlign: 'center', fontSize: fp(12), color: MUTED, lineHeight: fp(14), marginBottom: hp(10) }}>By continuing, you agree to our <Text style={styles.footerLink}>Terms of Use</Text> and <Text style={styles.footerLink}>Privacy Policy</Text></Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1 },
  disabled: { backgroundColor: '#DDF5EE' },
  forgot: { alignItems: 'flex-end' },
  pressed: { opacity: 0.72 },
  line: { flex: 1, height: 1, backgroundColor: '#C9D4D2' },
  footerLink: { color: TEAL },
});