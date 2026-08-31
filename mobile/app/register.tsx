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
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useResponsive } from '../hooks/useResponsive';
import { Colors } from '../constants/theme';

import { Ionicons } from '@expo/vector-icons';

const BLUE = Colors.blue;
const TEAL = Colors.teal;
const TEXT_DARK = Colors.ink;
const TEXT_MUTED = Colors.muted;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();
  const { isTablet, isLandscape, insets, scaleFont } = useResponsive();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert('Weak password', 'Password must include at least one number.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert('Weak password', 'Password must include at least one uppercase letter.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialPress = (provider: string) => {
    Alert.alert('Coming soon', `${provider} sign-up will be available in a future update.`);
  };

  // Reusable Form Card Content
  const registerFormContent = (
    <View style={[styles.body, isTablet && styles.tabletBody]}>
      <Text style={[styles.title, isTablet && { fontSize: scaleFont(26, 24, 28) }]}>Create your Account</Text>
      <Text style={styles.subtitle}>Join us and take control of your health records</Text>

      <View style={styles.fields}>
        <View style={styles.inputRow}>
          <Image source={require('../assets/icons/person.png')} style={styles.fieldIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={TEXT_MUTED}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputRow}>
          <Image source={require('../assets/icons/mail.png')} style={styles.fieldIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email or Phone"
            placeholderTextColor={TEXT_MUTED}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputRow}>
          <Image source={require('../assets/icons/padlock.png')} style={styles.fieldIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
            placeholderTextColor={TEXT_MUTED}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCorrect={false}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Image
              source={showPassword
                ? require('../assets/icons/open-eye.png')
                : require('../assets/icons/closed-eye.png')}
              style={styles.eyeIcon}
            />
          </Pressable>
        </View>

        <View style={styles.inputRow}>
          <Image source={require('../assets/icons/padlock.png')} style={styles.fieldIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Confirm Password"
            placeholderTextColor={TEXT_MUTED}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            autoCorrect={false}
          />
          <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
            <Image
              source={showConfirm
                ? require('../assets/icons/open-eye.png')
                : require('../assets/icons/closed-eye.png')}
              style={styles.eyeIcon}
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={handleRegister}
        disabled={loading}
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Text>
        {!loading && (
          <Image source={require('../assets/icons/arrow.png')} style={styles.arrowIcon} />
        )}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        onPress={() => handleSocialPress('Google')}
        style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]}
      >
        <Image source={require('../assets/icons/google.png')} style={styles.socialIcon} />
        <Text style={styles.outlineBtnText}>Sign in with Google</Text>
      </Pressable>

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Already have an Account? </Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.loginLink}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );

  // ─── TABLET LANDSCAPE VIEW (2-Column Split) ──────────────────────────────
  if (isTablet && isLandscape) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.tabletLandscapeContainer}>
            {/* Left Column: Brand Showcase */}
            <View style={styles.tabletLandscapeLeft}>
              <View style={styles.tabletBrandRow}>
                <Image source={require('../assets/logo/logo.png')} style={styles.tabletBrandLogo} />
                <View>
                  <Text style={styles.tabletBrandTitle}>MedRec</Text>
                  <Text style={styles.tabletBrandTagline}>Your Health Records in Your Pockets</Text>
                </View>
              </View>

              <View style={styles.tabletGraphicWrapper}>
                <Image
                  source={require('../assets/graphics/login-graphic.png')}
                  style={styles.tabletHeroImage}
                  resizeMode="contain"
                />
              </View>

              {/* Trust Guarantees */}
              <View style={styles.trustRow}>
                <View style={styles.trustBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={TEAL} />
                  <Text style={styles.trustBadgeText}>End-to-End Encrypted</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Ionicons name="lock-closed" size={14} color={TEAL} />
                  <Text style={styles.trustBadgeText}>Patient-Sovereign Data</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Ionicons name="finger-print" size={14} color={TEAL} />
                  <Text style={styles.trustBadgeText}>Biometric Security</Text>
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
                  {registerFormContent}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── TABLET PORTRAIT VIEW (Centered Bounded Card) ────────────────────────
  if (isTablet) {
    return (
      <View style={[styles.root, styles.tabletPortraitRoot]}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.tabletPortraitScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.tabletCardWrapper}>
              <View style={styles.tabletPortraitBrandHeader}>
                <Image source={require('../assets/logo/logo.png')} style={styles.tabletBrandLogo} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.tabletBrandTitle}>MedRec</Text>
                  <Text style={styles.tabletBrandTagline}>Your Health Records in Your Pockets</Text>
                </View>
              </View>
              {registerFormContent}
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <ImageBackground
            source={require('../assets/graphics/login-graphic.png')}
            style={[styles.graphicHeader, { paddingTop: insets.top }]}
            imageStyle={{
              transform: [
                { translateY: 60 },
                { scale: 1.03 },
              ],
            }}
            resizeMode="cover"
          />

          <View style={styles.body}>
            <Text style={styles.title}>Create your Account</Text>
            <Text style={styles.subtitle}>Join us and take control of your health records</Text>

            <View style={styles.fields}>
              <View style={styles.inputRow}>
                <Image source={require('../assets/icons/person.png')} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={TEXT_MUTED}
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputRow}>
                <Image source={require('../assets/icons/mail.png')} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email or Phone"
                  placeholderTextColor={TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputRow}>
                <Image source={require('../assets/icons/padlock.png')} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Image
                    source={showPassword
                      ? require('../assets/icons/open-eye.png')
                      : require('../assets/icons/closed-eye.png')}
                    style={styles.eyeIcon}
                  />
                </Pressable>
              </View>

              <View style={styles.inputRow}>
                <Image source={require('../assets/icons/padlock.png')} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirm Password"
                  placeholderTextColor={TEXT_MUTED}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                  <Image
                    source={showConfirm
                      ? require('../assets/icons/open-eye.png')
                      : require('../assets/icons/closed-eye.png')}
                    style={styles.eyeIcon}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
              {!loading && (
                <Image source={require('../assets/icons/arrow.png')} style={styles.arrowIcon} />
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={() => handleSocialPress('Google')}
              style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]}
            >
              <Image source={require('../assets/icons/google.png')} style={styles.socialIcon} />
              <Text style={styles.outlineBtnText}>Sign in with Google</Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an Account? </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </Pressable>
            </View>
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

  scroll: {
    flexGrow: 1,
  },

  graphicHeader: {
    width: '100%',
    height: 210,

    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  body: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,

    marginTop: 35,

    paddingHorizontal: 46,
    paddingTop: 20,
    paddingBottom: 10,
  },

  title: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 30,
    color: BLUE,
    textAlign: 'center',
    lineHeight: 37,
  },

  subtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',

    marginTop: 0,
    marginBottom: 12,
  },

  fields: {
    gap: 14,
  },

  inputRow: {
    height: 57.5,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 18,

    paddingHorizontal: 30,

    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E7E4',

    backgroundColor: '#FFFFFF',
  },

  fieldIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },

  input: {
    flex: 1,

    fontSize: 14,
    color: TEXT_DARK,

    padding: 0,
  },

  eyeIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  primaryBtn: {
    height: 57.5,

    marginTop: 20,
    marginBottom: 28,

    borderRadius: 16,

    backgroundColor: TEAL,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 10,
  },

  primaryBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
  },

  arrowIcon: {
    position: 'absolute',
    right: 28,

    width: 28,
    height: 28,

    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 18,

    marginBottom: 28,
  },

  dividerLine: {
    flex: 1,
    height: 1,

    backgroundColor: '#D9E7E4',
  },

  dividerText: {
    color: TEXT_MUTED,
    fontSize: 15,
  },

  outlineBtn: {
    height: 57.5,

    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E7E4',

    backgroundColor: '#FFFFFF',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 12,
  },

  socialIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  outlineBtnText: {
    fontSize: 18,
    fontWeight: '400',
    color: TEXT_DARK,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',

    marginTop: 42,
  },

  loginText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },

  loginLink: {
    fontSize: 14,
    color: TEAL,
    fontWeight: '700',
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
    paddingHorizontal: 24,
  },
  tabletPortraitBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
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
    paddingBottom: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  tabletLandscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  tabletLandscapeLeft: {
    flex: 0.9,
    backgroundColor: '#F4FAF9',
    paddingHorizontal: 36,
    paddingVertical: 32,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: '#E5F0EE',
  },
  tabletBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabletBrandLogo: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  tabletBrandTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 22,
    color: TEXT_DARK,
    lineHeight: 26,
  },
  tabletBrandTagline: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: TEXT_MUTED,
  },
  tabletGraphicWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  tabletHeroImage: {
    width: '100%',
    height: 260,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5F0EE',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E7E4',
  },
  trustBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: TEXT_DARK,
  },
  tabletLandscapeRight: {
    flex: 1.1,
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
