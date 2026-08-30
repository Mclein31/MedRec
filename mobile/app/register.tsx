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
import { Colors, Radii } from '../constants/theme';

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
  const {
    isTablet,
    isLandscape,
    isShortScreen,
    maxFormWidth,
    scaleFont,
    insets,
  } = useResponsive();

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

  const headerHeight = isTablet ? 180 : isLandscape ? 110 : isShortScreen ? 140 : 180;

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
          {/* Header Graphic */}
          <View style={[styles.graphicWrapper, isTablet && styles.tabletGraphicWrapper]}>
            <ImageBackground
              source={require('../assets/graphics/login-graphic.png')}
              style={[
                styles.graphicBg,
                { height: headerHeight, paddingTop: insets.top },
              ]}
              imageStyle={styles.graphicImage}
              resizeMode="cover"
            />
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
                styles.formTitle,
                { fontSize: scaleFont(26, 22, 28) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Create your Account
            </Text>
            <Text
              style={[
                styles.formSubtitle,
                { fontSize: scaleFont(12, 11, 13) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Join us and take control of your health records
            </Text>

            {/* Input Stack */}
            <View style={styles.inputsStack}>
              {/* Full Name */}
              <View style={styles.inputRow}>
                <Image
                  source={require('../assets/icons/person.png')}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  placeholderTextColor={TEXT_MUTED}
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                  maxFontSizeMultiplier={1.35}
                  accessibilityLabel="Full Name"
                />
              </View>

              {/* Email / Phone */}
              <View style={styles.inputRow}>
                <Image
                  source={require('../assets/icons/mail.png')}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email or Phone"
                  placeholderTextColor={TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  maxFontSizeMultiplier={1.35}
                  accessibilityLabel="Email or phone"
                />
              </View>

              {/* Password */}
              <View style={styles.inputRow}>
                <Image
                  source={require('../assets/icons/padlock.png')}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
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

              {/* Confirm Password */}
              <View style={styles.inputRow}>
                <Image
                  source={require('../assets/icons/padlock.png')}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm Password"
                  placeholderTextColor={TEXT_MUTED}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCorrect={false}
                  maxFontSizeMultiplier={1.35}
                  accessibilityLabel="Confirm Password"
                />
                <Pressable
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <Image
                    source={
                      showConfirm
                        ? require('../assets/icons/open-eye.png')
                        : require('../assets/icons/closed-eye.png')
                    }
                    style={styles.eyeIcon}
                  />
                </Pressable>
              </View>
            </View>

            {/* Create Account Button */}
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
              {!loading && (
                <Image
                  source={require('../assets/icons/arrow.png')}
                  style={styles.arrowIcon}
                />
              )}
            </Pressable>

            {/* Or Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Sign Up */}
            <Pressable
              onPress={() => handleSocialPress('Google')}
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

            {/* Back to Sign In Link */}
            <View style={styles.signInRow}>
              <Text style={styles.signInPromptText}>Already have an Account? </Text>
              <Pressable
                onPress={() => router.push('/login')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={styles.signInLinkText}>Sign In</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  graphicImage: {
    opacity: 0.95,
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
  formTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    color: BLUE,
    textAlign: 'center',
  },
  formSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
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
    tintColor: TEXT_MUTED,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: TEXT_MUTED,
  },
  textInput: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: TEXT_DARK,
    padding: 0,
  },
  primaryBtn: {
    height: 52,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: Radii.card,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
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
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5F0EE',
  },
  orText: {
    color: TEXT_MUTED,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
  },
  socialBtn: {
    height: 50,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  socialBtnText: {
    fontSize: 14.5,
    fontFamily: 'LexendDeca-Medium',
    color: TEXT_DARK,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signInPromptText: {
    fontSize: 12.5,
    fontFamily: 'LexendDeca-Regular',
    color: TEXT_MUTED,
  },
  signInLinkText: {
    fontSize: 13.5,
    fontFamily: 'LexendDeca-Bold',
    color: TEAL,
  },
  pressed: {
    opacity: 0.75,
  },
});
