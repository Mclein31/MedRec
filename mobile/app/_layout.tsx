import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

// This inner component exists because useAuth() needs to run INSIDE AuthProvider.
function RootLayoutNav() {
  const { token, isLoading } = useAuth();

  // Still checking SecureStore for a saved token - show a blank loading state
  // briefly rather than flashing the login screen for a split second.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      {token ? (
        // Logged in: only the tabs group is reachable.
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        // Logged out: only login/register are reachable.
        <>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </>
      )}
      <Stack.Screen name="record/add" options={{ title: 'Add Record', presentation: 'modal' }} />
      <Stack.Screen name="record/[id]" options={{ title: 'Record Details' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
