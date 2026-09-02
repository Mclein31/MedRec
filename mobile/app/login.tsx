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
  Linking,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { StatusBar } from 'expo-status-bar';
import { useResponsive } from '../hooks/useResponsive';
import { Colors } from '../constants/theme';

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
  const { isTablet, isLandscape, insets, scaleFont } = useResponsive();

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

  const handleSocialPress = () => {
    Alert.alert(
      'Single Sign-On',
      'Google authentication is managed by your healthcare organization. Please use your standard email and password to log in.'
    );
  };

  const handleForgotPassword = async () => {
    if (!email || !email.trim()) {
      Alert.alert(
        'Reset Password',
        'Please enter your email address in the field above to receive password reset instructions.'
      );
      return;
    }
    try {
      await api.forgotPassword(email.trim());
      Alert.alert(
        'Password Reset Requested',
        'If an account with that email exists, password reset instructions have been dispatched.'
      );
    } catch (err: any) {
      Alert.alert('Reset Request', err.message || 'Unable to submit password reset request.');
    }
  };

  const handlePrivacyPolicy = async () => {
    const privacyUrl = 'https://medrec.health/privacy';
    try {
      const supported = await Linking.canOpenURL(privacyUrl);
      if (supported) {
        await Linking.openURL(privacyUrl);
        return;
      }
    } catch {}
    Alert.alert(
      'MedRec Privacy Policy & Data Security',
      'MedRec stores your health records encrypted at rest and in transit. Your clinical data is never sold or used for advertising. AI processing is performed with zero-data retention policies.\n\nYou retain full sovereignty over your health records and can export or permanently delete your vault at any time.\n\nPublic policy: https://medrec.health/privacy',
      [{ text: 'Close', style: 'default' }]
    );
  };

  // Form Fields Component (Reusable for Tablet layout)
  const formCardContent = (
    <View style={[styles.body, isTablet && styles.tabletBody]}>
      <Text style={[styles.title, isTablet && { fontSize: scaleFont(26, 24, 28) }]}>Welcome Back!</Text>
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
  );

  // ─── TABLET LANDSCAPE VIEW (2-Column Split) ──────────────────────────────
  if (isTablet && isLandscape) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.tabletLandscapeContainer}>
            {/* Left Column: Full-Bleed Graphic Panel with Overlaid Branding */}
            <View style={styles.tabletLandscapeLeft}>
              <Image
                source={require('../assets/graphics/graphic-2.png')}
                style={styles.tabletLandscapeGraphic}
                resizeMode="cover"
              />

              <View style={styles.tabletLandscapeBrandWrapper}>
                <View style={styles.tabletBrandRow}>
                  <Image source={require('../assets/logo/logo.png')} style={styles.tabletBrandLogo} />
                  <View>
                    <Text style={styles.tabletBrandTitle}>MedRec</Text>
                    <Text style={styles.tabletBrandTagline}>Your Health Records in Your Pockets</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Right Column: Centered Form Card */}
            <View style={styles.tabletLandscapeRight}>
              <ScrollView
                contentContainerStyle={styles.tabletFormScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.tabletCardWrapper}>
                  {formCardContent}
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      By continuing, you agree to our <Text style={styles.footerLink} onPress={handlePrivacyPolicy}>Terms of Use</Text> and <Text style={styles.footerLink} onPress={handlePrivacyPolicy}>Privacy Policy</Text>
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── TABLET PORTRAIT VIEW (Centered Bounded Card - Phone UI Adaptation) ──
  if (isTablet) {
    return (
      <View style={[styles.root, styles.tabletPortraitRoot]}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.tabletPortraitScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabletPortraitContainer}>
              <View style={styles.tabletPortraitCard}>
                {/* Centered Brand Header matching Phone UI hierarchy */}
                <View style={styles.tabletBrandBlock}>
                  <Image source={require('../assets/logo/logo.png')} style={styles.tabletPortraitBrandLogo} />
                  <Text style={styles.tabletPortraitBrandTitle}>MedRec</Text>
                  <Text style={styles.tabletPortraitBrandTagline}>Your Health Records in Your Pockets</Text>
                </View>

                <Text style={styles.tabletPortraitTitle}>Welcome Back!</Text>
                <Text style={styles.tabletPortraitSubtitle}>Sign in to access your health records</Text>

                {lockedOut && <Text style={styles.error}>Too many attempts. Try again in {countdown}s.</Text>}
                {attempts > 0 && !lockedOut && <Text style={styles.warning}>{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining</Text>}

                <View style={styles.tabletPortraitFields}>
                  <View style={[styles.inputRow, lockedOut && styles.disabled]}>
                    <Image source={require('../assets/icons/mail.png')} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email or Phone"
                      placeholderTextColor={MUTED}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      editable={!lockedOut}
                    />
                  </View>
                  <View style={[styles.inputRow, lockedOut && styles.disabled]}>
                    <Image source={require('../assets/icons/padlock.png')} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={MUTED}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCorrect={false}
                      editable={!lockedOut}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                      <Image
                        source={showPassword ? require('../assets/icons/open-eye.png') : require('../assets/icons/closed-eye.png')}
                        style={styles.eyeIcon}
                      />
                    </Pressable>
                  </View>
                  <Pressable onPress={handleForgotPassword} style={styles.forgot}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={loading || lockedOut}
                  style={({ pressed }) => [styles.tabletPrimaryButton, (pressed || lockedOut) && styles.pressed]}
                >
                  <Text style={styles.tabletPrimaryText}>
                    {loading ? 'Signing in...' : lockedOut ? `Locked (${countdown}s)` : 'Sign In'}
                  </Text>
                  {!loading && !lockedOut && <Image source={require('../assets/icons/arrow.png')} style={styles.tabletArrow} />}
                </Pressable>

                <View style={styles.tabletDivider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.line} />
                </View>

                <Pressable onPress={handleSocialPress} style={({ pressed }) => [styles.tabletGoogleButton, pressed && styles.pressed]}>
                  <Image source={require('../assets/icons/google.png')} style={styles.google} />
                  <Text style={styles.googleText}>Sign in with Google</Text>
                </Pressable>

                <Pressable onPress={() => router.push('/register')} style={({ pressed }) => [styles.tabletCreateButton, pressed && styles.pressed]}>
                  <Image source={require('../assets/icons/user-add.png')} style={styles.createIcon} />
                  <Text style={styles.createText}>Create an Account</Text>
                </Pressable>

                <View style={styles.tabletPortraitFooter}>
                  <Text style={styles.footerText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.footerLink} onPress={handlePrivacyPolicy}>Terms of Use</Text>
                    {' '}and{' '}
                    <Text style={styles.footerLink} onPress={handlePrivacyPolicy}>Privacy Policy</Text>
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── PHONE VIEW (100% LOCKED, UNTOUCHED) ──────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ImageBackground
            source={require('../assets/graphics/login-graphic.png')}
            style={styles.hero}
            imageStyle={styles.heroGraphic}
            resizeMode="contain"
          >
            <View style={[styles.brandRow, { top: insets.top > 0 ? insets.top + 5 : 40 }]}>
              <Image
                source={require('../assets/logo/logo.png')}
                style={styles.brandMark}
              />

              <View style={styles.brandTextContainer}>
                <Text style={styles.brand}>MedRec</Text>
                <Text style={styles.tagline}>
                  Your Health Records in Your Pockets
                </Text>
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
      <View style={styles.footer}><Text style={styles.footerText}>By continuing, you agree to our <Text style={styles.footerLink} onPress={handlePrivacyPolicy}>Terms of Use</Text> and <Text style={styles.footerLink} onPress={handlePrivacyPolicy}>Privacy Policy</Text></Text></View>
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

  hero: {
    height: 320,
    paddingHorizontal: 40,
    marginTop: 0,
  },

  heroGraphic: {
    transform: [
      { translateX: 0 },
      { translateY: 50 },
    ],
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'relative',
    top: 40,
    left: -20,
  },

  brandMark: {
    width: 75,
    height: 75,
    resizeMode: 'contain',
  },

  brandTextContainer: {
    justifyContent: 'center',
  },

  brand: {
    color: INK,
    fontFamily: 'LexendDeca-Bold',
    fontSize: 24,
    lineHeight: 27,
  },

  tagline: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 12,
    marginTop: 0,
  },

  body: {
    marginTop: -15,
    paddingHorizontal: 50,
    paddingTop: 15,
    paddingBottom: 20,

    backgroundColor: '#FFFFFF',

    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,

    overflow: 'hidden',
  },

  title: {
    color: BLUE,
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 30,
    textAlign: 'center',
  },

  subtitle: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 0,
    lineHeight: 12,
    marginBottom: 20,
  },

  error: {
    color: '#D73A49',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },

  warning: {
    color: '#C77A00',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },

  fields: {
    gap: 14,
  },

  inputRow: {
    height: 57.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
  },

  disabled: {
    backgroundColor: '#DDF5EE',
  },

  fieldIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },

  input: {
    flex: 1,
    color: INK,
    fontSize: 14,
    padding: 0,
  },

  eyeIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  forgot: {
    alignItems: 'flex-end',
  },

  forgotText: {
    color: BLUE,
    fontSize: 12,
    marginTop: 0,
  },

  primaryButton: {
    height: 57.5,
    backgroundColor: TEAL,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 25,
    marginBottom: 18,
  },

  primaryText: {
    color: '#FFFFFF',
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 18,
  },

  arrow: {
    position: 'absolute',
    right: 24,
    width: 30,
    height: 30,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },

  pressed: {
    opacity: 0.72,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 18,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#C9D4D2',
  },

  dividerText: {
    color: MUTED,
    fontSize: 12,
  },

  googleButton: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E7E4',
  },

  google: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },

  googleText: {
    color: INK,
    fontSize: 16,
    fontWeight: '400',
  },

  createButton: {
    height: 57.5,
    marginTop: 38,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  createIcon: {
    width: 25,
    height: 25,
    tintColor: TEAL,
    resizeMode: 'contain',
  },

  createText: {
    color: TEAL,
    fontSize: 18,
    fontWeight: '600',
  },

  footer: {
    paddingHorizontal: 40,
    paddingBottom: 20,
    paddingTop: 5,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: MUTED,
    lineHeight: 14,
    marginBottom: 10,
  },

  footerLink: {
    color: TEAL,
  },

  /* Tablet Styles */
  tabletPortraitRoot: {
    backgroundColor: '#F4FAF9',
  },
  tabletPortraitScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  tabletPortraitContainer: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  tabletBrandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tabletPortraitBrandLogo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  tabletPortraitBrandTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 24,
    color: INK,
    lineHeight: 28,
    textAlign: 'center',
  },
  tabletPortraitBrandTagline: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
    lineHeight: 15,
    marginTop: 2,
    textAlign: 'center',
  },
  tabletPortraitCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#12343B',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabletPortraitTitle: {
    color: BLUE,
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 30,
  },
  tabletPortraitSubtitle: {
    color: MUTED,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 18,
    lineHeight: 15,
  },
  tabletPortraitFields: {
    gap: 12,
  },
  tabletPrimaryButton: {
    height: 52,
    backgroundColor: TEAL,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 18,
    marginBottom: 14,
  },
  tabletPrimaryText: {
    color: '#FFFFFF',
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 17,
  },
  tabletArrow: {
    position: 'absolute',
    right: 20,
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  tabletDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  tabletGoogleButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
  },
  tabletCreateButton: {
    height: 48,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tabletPortraitFooter: {
    marginTop: 18,
    paddingHorizontal: 4,
  },
  tabletCardWrapper: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  tabletBody: {
    marginTop: 0,
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  tabletLandscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  tabletLandscapeLeft: {
    flex: 1,
    backgroundColor: '#F4FAF9',
    position: 'relative',
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: '#E5F0EE',
  },
  tabletLandscapeGraphic: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tabletLandscapeBrandWrapper: {
    position: 'absolute',
    top: 128,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  tabletBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  tabletBrandLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  tabletBrandTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 36,
    color: INK,
    lineHeight: 42,
  },
  tabletBrandTagline: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 16,
    color: MUTED,
    lineHeight: 22,
    marginTop: 4,
  },
  tabletLandscapeRight: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  tabletFormScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
});