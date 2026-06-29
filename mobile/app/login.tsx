import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <View
      style={{
        padding: 40,
        gap: 12,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>MedRecord</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Pressable onPress={handleLogin} disabled={loading} style={styles.button}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {loading ? 'Logging in...' : 'Log In'}
        </Text>
      </Pressable>

      <Link href="/register">
        <Text style={{ marginTop: 12, color: '#007AFF' }}>
          Dont have an account? Register
        </Text>
      </Link>
    </View>
  );
}

const styles = {
  input: {
    width: '75%' as const,
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center' as const,
    width: '75%' as const,
  },
};
