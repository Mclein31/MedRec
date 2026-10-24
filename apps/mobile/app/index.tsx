import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth';
import { useOnboarded } from '../src/onboarded';

export default function Index() {
  const { state } = useAuth();
  const onboarded = useOnboarded();
  if (state.status === 'signedIn') return <Redirect href="/(tabs)" />;
  return <Redirect href={onboarded ? '/(auth)/sign-in' : '/onboarding'} />;
}
