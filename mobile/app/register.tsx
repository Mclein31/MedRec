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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useResponsive } from '../hooks/useResponsive';

const BLUE = '#1976D2';
const TEAL = '#159A83';
const TEXT_DARK = '#12343B';
const TEXT_MUTED = '#64748B';

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
  const insets = useSafeAreaInsets();
  const { wp, hp, fp, isTablet, maxFormWidth } = useResponsive();

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

  /* ── responsive styles ─────────────────────────────── */
  const r = {
    graphicHeader: {
      width: '100%' as const,
      height: hp(210),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: '#FFFFFF',
      paddingTop: insets.top,
    },
    graphicImage: {
      transform: [
        { translateY: hp(60) },
        { scale: 1.03 },
      ],
    } as const,
    body: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: wp(35),
      borderTopRightRadius: wp(35),
      marginTop: hp(35),
      paddingHorizontal: wp(46),
      paddingTop: hp(20),
      paddingBottom: hp(10),
      ...(isTablet && {
        maxWidth: maxFormWidth,
        alignSelf: 'center' as const,
        width: '100%' as const,
      }),
    },
    title: {
      fontFamily: 'LexendDeca-SemiBold',
      fontSize: fp(30),
      color: BLUE,
      textAlign: 'center' as const,
      lineHeight: fp(37),
    },
    subtitle: {
      fontSize: fp(11),
      color: TEXT_MUTED,
      textAlign: 'center' as const,
      marginTop: 0,
      marginBottom: hp(12),
    },
    fields: {
      gap: hp(14),
    },
    inputRow: {
      height: hp(57.5),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: wp(18),
      paddingHorizontal: wp(30),
      borderRadius: wp(18),
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
      fontSize: fp(14),
      color: TEXT_DARK,
      padding: 0,
    },
    eyeIcon: {
      width: fp(22),
      height: fp(22),
      resizeMode: 'contain' as const,
    },
    primaryBtn: {
      height: hp(57.5),
      marginTop: hp(20),
      marginBottom: hp(28),
      borderRadius: wp(16),
      backgroundColor: TEAL,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: wp(10),
    },
    primaryBtnText: {
      fontFamily: 'LexendDeca-SemiBold',
      fontSize: fp(20),
      color: '#FFFFFF',
    },
    arrowIcon: {
      position: 'absolute' as const,
      right: wp(28),
      width: fp(28),
      height: fp(28),
      tintColor: '#FFFFFF',
      resizeMode: 'contain' as const,
    },
    divider: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: wp(18),
      marginBottom: hp(28),
    },
    dividerText: {
      color: TEXT_MUTED,
      fontSize: fp(15),
    },
    outlineBtn: {
      height: hp(57.5),
      borderRadius: wp(16),
      borderWidth: 1,
      borderColor: '#D9E7E4',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: wp(12),
    },
    socialIcon: {
      width: fp(28),
      height: fp(28),
      resizeMode: 'contain' as const,
    },
    outlineBtnText: {
      fontSize: fp(18),
      fontWeight: '400' as const,
      color: TEXT_DARK,
    },
    loginRow: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      marginTop: hp(42),
    },
    loginText: {
      fontSize: fp(12),
      color: TEXT_MUTED,
    },
    loginLink: {
      fontSize: fp(14),
      color: TEAL,
      fontWeight: '700' as const,
    },
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]} keyboardShouldPersistTaps="handled">

          <ImageBackground
            source={require('../assets/graphics/login-graphic.png')}
            style={r.graphicHeader}
            imageStyle={r.graphicImage}
            resizeMode="cover"
          />

          <View style={r.body}>
            <Text style={r.title}>Create your Account</Text>
            <Text style={r.subtitle}>Join us and take control of your health records</Text>

            <View style={r.fields}>
              <View style={r.inputRow}>
                <Image source={require('../assets/icons/person.png')} style={r.fieldIcon} />
                <TextInput
                  style={r.input}
                  placeholder="Full Name"
                  placeholderTextColor={TEXT_MUTED}
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                />
              </View>

              <View style={r.inputRow}>
                <Image source={require('../assets/icons/mail.png')} style={r.fieldIcon} />
                <TextInput
                  style={r.input}
                  placeholder="Email or Phone"
                  placeholderTextColor={TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              <View style={r.inputRow}>
                <Image source={require('../assets/icons/padlock.png')} style={r.fieldIcon} />
                <TextInput
                  style={[r.input, { flex: 1 }]}
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
                    style={r.eyeIcon}
                  />
                </Pressable>
              </View>

              <View style={r.inputRow}>
                <Image source={require('../assets/icons/padlock.png')} style={r.fieldIcon} />
                <TextInput
                  style={[r.input, { flex: 1 }]}
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
                    style={r.eyeIcon}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [r.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={r.primaryBtnText}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
              {!loading && (
                <Image source={require('../assets/icons/arrow.png')} style={r.arrowIcon} />
              )}
            </Pressable>

            <View style={r.divider}>
              <View style={styles.dividerLine} />
              <Text style={r.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={() => handleSocialPress('Google')}
              style={({ pressed }) => [r.outlineBtn, pressed && { opacity: 0.7 }]}
            >
              <Image source={require('../assets/icons/google.png')} style={r.socialIcon} />
              <Text style={r.outlineBtnText}>Sign in with Google</Text>
            </Pressable>

            <View style={r.loginRow}>
              <Text style={r.loginText}>Already have an Account? </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={r.loginLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── static styles (values that don't need scaling) ── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scroll: {
    flexGrow: 1,
  },

  scrollTablet: {
    alignItems: 'center',
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D9E7E4',
  },
});
