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
  ImageBackground,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useResponsive } from '../hooks/useResponsive';
import { Colors, Radii } from '../constants/theme';

const TEAL = Colors.teal;
const BLUE = Colors.blue;
const INK = Colors.ink;
const MUTED = Colors.muted;
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
  const {
    isTablet,
    isLandscape,
    isShortScreen,
    maxFormWidth,
    scaleFont,
    insets,
  } = useResponsive();

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

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

  const headerHeight = isTablet ? 260 : isLandscape ? 140 : isShortScreen ? 180 : 260;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: isLandscape ? Math.max(insets.top, 12) : 0,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Graphic Header */}
          <View style={[styles.graphicWrapper, isTablet && styles.tabletGraphicWrapper]}>
            <ImageBackground
              source={require('../assets/graphics/login-graphic.png')}
              style={[styles.graphicBg, { height: headerHeight }]}
              imageStyle={styles.graphicImage}
              resizeMode="contain"
            >
              <View style={[styles.brandContainer, { paddingTop: insets.top + 8 }]}>
                <Image
                  source={require('../assets/logo/logo.png')}
                  style={styles.brandLogo}
                />
                <View style={styles.brandTextGroup}>
                  <Text
                    style={[
                      styles.brandName,
                      { fontSize: scaleFont(24, 20, 26), lineHeight: scaleFont(28, 24, 30) },
                    ]}
                    maxFontSizeMultiplier={1.35}
                  >
                    MedRec
                  </Text>
                  <Text
                    style={[
                      styles.brandTagline,
                      { fontSize: scaleFont(12, 10.5, 13) },
                    ]}
                    maxFontSizeMultiplier={1.35}
                  >
                    Your Health Records in Your Pockets
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Form Container */}
          <View
            style={[
              styles.formSheet,
              isTablet && [
                styles.tabletFormSheet,
                { maxWidth: maxFormWidth, alignSelf: 'center', width: '100%' },
              ],
            ]}
          >
            <Text
              style={[
                styles.welcomeTitle,
                { fontSize: scaleFont(26, 22, 28) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Welcome Back!
            </Text>
            <Text
              style={[
                styles.welcomeSubtitle,
                { fontSize: scaleFont(12, 11, 13) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Sign in to access your health records
            </Text>

            {lockedOut && (
              <Text style={styles.lockoutText} maxFontSizeMultiplier={1.35}>
                Too many attempts. Try again in {countdown}s.
              </Text>
            )}
            {attempts > 0 && !lockedOut && (
              <Text style={styles.attemptsText} maxFontSizeMultiplier={1.35}>
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining
              </Text>
            )}

            {/* Input Fields */}
            <View style={styles.inputsStack}>
              {/* Email / Phone Field */}
              <View style={[styles.inputRow, lockedOut && styles.disabled]}>
                <Image
                  source={require('../assets/icons/mail.png')}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email or Phone"
                  placeholderTextColor={MUTED}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!lockedOut}
                  maxFontSizeMultiplier={1.35}
                  accessibilityLabel="Email or phone number"
                />
              </View>

              {/* Password Field */}
              <View style={[styles.inputRow, lockedOut && styles.disabled]}>
                <Image
                  source={require('../assets/icons/padlock.png')}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor={MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  editable={!lockedOut}
                  maxFontSizeMultiplier={1.35}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Image
                    source={
                      showPassword
                        ? require('../assets/icons/open-eye.png')
                        : require('../assets/icons/closed-eye.png')
                    }
                    style={styles.eyeIcon}
                  />
                </Pressable>
              </View>

              {/* Forgot Password Link */}
              <Pressable
                onPress={handleForgotPassword}
                style={styles.forgotBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>

            {/* Sign In Primary CTA */}
            <Pressable
              onPress={handleLogin}
              disabled={loading || lockedOut}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || lockedOut) && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Signing in...' : lockedOut ? `Locked (${countdown}s)` : 'Sign In'}
              </Text>
              {!loading && !lockedOut && (
                <Image
                  source={require('../assets/icons/arrow.png')}
                  style={styles.arrowIcon}
                />
              )}
            </Pressable>

            {/* Or Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.line} />
            </View>

            {/* Social Sign In */}
            <Pressable
              onPress={handleSocialPress}
              style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              <Image
                source={require('../assets/icons/google.png')}
                style={styles.googleIcon}
              />
              <Text style={styles.socialBtnText}>Sign in with Google</Text>
            </Pressable>

            {/* Create Account Link */}
            <Pressable
              onPress={() => router.push('/register')}
              style={({ pressed }) => [styles.createAccountBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Create an Account"
            >
              <Image
                source={require('../assets/icons/user-add.png')}
                style={styles.createAccountIcon}
              />
              <Text style={styles.createAccountText}>Create an Account</Text>
            </Pressable>
          </View>

          {/* Footer Terms & Policy */}
          <View style={styles.footer}>
            <Text style={styles.footerText} maxFontSizeMultiplier={1.35}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Use</Text> and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  graphicWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  tabletGraphicWrapper: {
    maxWidth: 500,
    alignSelf: 'center',
  },
  graphicBg: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  graphicImage: {
    opacity: 0.95,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  brandLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandName: {
    color: INK,
    fontFamily: 'LexendDeca-Bold',
  },
  brandTagline: {
    color: MUTED,
    fontFamily: 'LexendDeca-Regular',
    marginTop: 1,
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  tabletFormSheet: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginVertical: 12,
  },
  welcomeTitle: {
    color: BLUE,
    fontFamily: 'LexendDeca-SemiBold',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: MUTED,
    fontFamily: 'LexendDeca-Regular',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  lockoutText: {
    color: '#D73A49',
    fontSize: 13,
    fontFamily: 'LexendDeca-Medium',
    textAlign: 'center',
    marginBottom: 10,
  },
  attemptsText: {
    color: '#C77A00',
    fontSize: 13,
    fontFamily: 'LexendDeca-Medium',
    textAlign: 'center',
    marginBottom: 10,
  },
  inputsStack: {
    gap: 12,
  },
  inputRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
  },
  fieldIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: MUTED,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: MUTED,
  },
  textInput: {
    flex: 1,
    color: INK,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    padding: 0,
  },
  disabled: {
    backgroundColor: '#DDF5EE',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotText: {
    color: BLUE,
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12.5,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: TEAL,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 16,
  },
  arrowIcon: {
    position: 'absolute',
    right: 20,
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5F0EE',
  },
  orText: {
    color: MUTED,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
  },
  socialBtn: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  socialBtnText: {
    color: INK,
    fontFamily: 'LexendDeca-Medium',
    fontSize: 14.5,
  },
  createAccountBtn: {
    height: 50,
    marginTop: 18,
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createAccountIcon: {
    width: 22,
    height: 22,
    tintColor: TEAL,
    resizeMode: 'contain',
  },
  createAccountText: {
    color: TEAL,
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11.5,
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    lineHeight: 16,
  },
  footerLink: {
    color: TEAL,
    fontFamily: 'LexendDeca-Medium',
  },
});