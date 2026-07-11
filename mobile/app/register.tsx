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
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const GREEN = '#4e7c4e';
const BLUE_ICON = '#5c9ee8';

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoArea}>
            <Image
              source={require('../assets/logo/MedRec-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>join us and take control of{'\n'}your health records.</Text>
          </View>

          <View style={styles.fields}>
            <View style={styles.inputRow}>
              <Image source={require('../assets/icons/person.png')} style={[styles.fieldIcon, { tintColor: BLUE_ICON }]} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputRow}>
              <Image source={require('../assets/icons/mail.png')} style={[styles.fieldIcon, { tintColor: BLUE_ICON }]} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputRow}>
              <Image source={require('../assets/icons/padlock.png')} style={[styles.fieldIcon, { tintColor: BLUE_ICON }]} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Create password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
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

            <View style={styles.inputRow}>
              <Image source={require('../assets/icons/padlock.png')} style={[styles.fieldIcon, { tintColor: BLUE_ICON }]} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm your password"
                placeholderTextColor="#aaa"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                <Image
                  source={showConfirm
                    ? require('../assets/icons/hidden-eye.png')
                    : require('../assets/icons/eye-open.png')}
                  style={styles.eyeIcon}
                />
              </Pressable>
            </View>

            {/* Password hint */}
            <View style={styles.hintRow}>
              <Image source={require('../assets/icons/shield.png')} style={[styles.hintIcon, { tintColor: GREEN }]} />
              <Text style={styles.hintText}>
                Password must be at least 8 characters and include a number and an uppercase letter.
              </Text>
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
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable onPress={() => handleSocialPress('Google')} style={styles.socialBtn}>
              <Image source={require('../assets/icons/google.png')} style={styles.socialIcon} />
            </Pressable>
            <Pressable onPress={() => handleSocialPress('Apple')} style={styles.socialBtn}>
              <Image source={require('../assets/icons/apple.png')} style={styles.socialIcon} />
            </Pressable>
            <Pressable onPress={() => handleSocialPress('Facebook')} style={styles.socialBtn}>
              <Image source={require('../assets/icons/facebook.png')} style={styles.socialIcon} />
            </Pressable>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Login</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  logoArea: { alignItems: 'center', gap: 6, marginBottom: 28 },
  logo: { width: 100, height: 100, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  fields: { gap: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fff',
  },
  fieldIcon: { width: 20, height: 20, resizeMode: 'contain' },
  input: { flex: 1, fontSize: 15, color: '#222', padding: 0 },
  eyeIcon: { width: 20, height: 20, resizeMode: 'contain', tintColor: '#aaa' },
  hintRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f0f8f0', borderRadius: 10, padding: 12,
  },
  hintIcon: { width: 16, height: 16, resizeMode: 'contain', marginTop: 1 },
  hintText: { flex: 1, fontSize: 12, color: GREEN, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: GREEN, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 16, marginBottom: 20,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#e0e0e0' },
  dividerText: { fontSize: 12, color: '#aaa' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 24 },
  socialBtn: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 1, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  socialIcon: { width: 26, height: 26, resizeMode: 'contain' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 13, color: '#aaa' },
  loginLink: { fontSize: 13, color: GREEN, fontWeight: '600' },
});
