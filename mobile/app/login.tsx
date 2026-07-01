import { View, Text, TextInput, Pressable, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

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

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
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
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={GREEN} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
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
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Logging in...' : 'Log in'}
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

      {/* Footer — outside scroll, pinned to bottom */}
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
    marginTop: 40
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
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: GREEN_MID,
    textAlign: 'center',
    opacity: 0.55,
    lineHeight: 15,
  },
});
