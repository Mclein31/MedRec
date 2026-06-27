import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing info', 'Fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
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
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>Create Account</Text>

      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Password (min 8 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Pressable onPress={handleRegister} disabled={loading} style={styles.button}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {loading ? 'Creating account...' : 'Register'}
        </Text>
      </Pressable>

      <Link href="/login" style={{ marginTop: 12, color: '#007AFF' }}>
        Already have an account? Log in
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
