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

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  logo: {
    width: 62,
    height: 62,
    resizeMode: 'contain',
  },

  brandName: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 24,
    color: TEXT_DARK,
    lineHeight: 26,
  },

  brandTagline: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 13,
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
});
