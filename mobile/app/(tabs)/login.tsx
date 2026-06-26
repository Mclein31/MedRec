import { View, Text, TextInput, Pressable } from 'react-native';
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
      flex: 1,
      justifyContent: "center",
      alignItems: "center"
      }}>



      {/* Email input */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          width: "75%",
          height: "7%",
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
          width: "75%",
          height: "7%",
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 8,
        }}
      />

      <Pressable
        onPress={handleLogin}
        style={{
          backgroundColor: "#007AFF",
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Log In
        </Text>
      </Pressable>
    </View>
  );
}