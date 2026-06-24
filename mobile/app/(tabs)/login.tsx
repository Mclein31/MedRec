import { View, Text, TextInput, Button } from 'react-native';
import { useState } from 'react';
import { FlipInEasyX } from 'react-native-reanimated';

export default function LoginScreen() {
  // state for inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Email:', email);
    console.log('Password:', password);
  };

  return (
    <View style={{
      padding: 40,
      gap: 12, 
      }}>



      {/* Email input */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 8,
          alignContent: 'center'
        }}
      />

      {/* Password input */}
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 8,
        }}
      />

      {/* Button */}
      <Button title="Log In" onPress={handleLogin} />
    </View>
  );
}