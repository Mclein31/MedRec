import { ReactNode, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppLock } from '../../context/AppLockContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';

export function AppLockGate({ children }: { children: ReactNode }) {
  const { blocked, ready, busy, error, unlock } = useAppLock();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Unable to sign out', 'Please try again. Your records remain locked.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={[styles.root, blocked && styles.hidden]}
        pointerEvents={blocked ? 'none' : 'auto'}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      <Modal visible={blocked} animationType="none" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.panel} accessibilityViewIsModal>
            <View style={styles.icon} accessibilityElementsHidden>
              <Ionicons name="lock-closed-outline" size={32} color={Colors.ink} />
            </View>
            <Text style={styles.brand}>MEDREC</Text>
            <Text accessibilityRole="header" style={styles.title}>Your health stays private.</Text>
            <Text style={styles.description}>
              {ready ? 'Unlock with your biometrics or device passcode to return to your records.' : 'Checking your device security before opening your records.'}
            </Text>
            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ready ? 'Unlock MedRec' : 'Retry security check'}
              accessibilityState={{ disabled: busy || signingOut, busy }}
              disabled={busy || signingOut}
              onPress={() => void unlock()}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              {busy ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="finger-print" size={21} color={Colors.white} />}
              <Text style={styles.buttonText}>{busy ? 'Verifying…' : ready ? 'Unlock MedRec' : 'Retry security check'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out of MedRec"
              disabled={busy || signingOut}
              onPress={() => void signOut()}
              style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
            >
              {signingOut ? <ActivityIndicator color={Colors.ink} /> : <Text style={styles.signOutText}>Sign out instead</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hidden: { opacity: 0 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: Colors.bg },
  panel: { width: '100%', maxWidth: 380, alignItems: 'center', paddingVertical: 32 },
  icon: { width: 76, height: 76, borderRadius: 24, backgroundColor: Colors.tealLight, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  brand: { fontFamily: 'LexendDeca-SemiBold', fontSize: 11, letterSpacing: 2.5, color: Colors.teal, marginBottom: 12 },
  title: { fontFamily: 'LexendDeca-Bold', fontSize: 28, lineHeight: 37, textAlign: 'center', color: Colors.ink },
  description: { fontFamily: 'LexendDeca-Regular', fontSize: 14, lineHeight: 22, color: Colors.muted, textAlign: 'center', marginTop: 14, marginBottom: 28 },
  error: { fontFamily: 'LexendDeca-Regular', fontSize: 13, lineHeight: 21, color: Colors.red, textAlign: 'center', marginBottom: 20 },
  button: { width: '100%', minHeight: 54, borderRadius: 18, padding: 16, gap: 10, backgroundColor: Colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'LexendDeca-SemiBold', fontSize: 14, color: Colors.white },
  signOut: { minHeight: 48, paddingHorizontal: 24, marginTop: 8, justifyContent: 'center' },
  signOutText: { fontFamily: 'LexendDeca-Regular', fontSize: 13, color: Colors.muted },
  pressed: { opacity: 0.75 },
});
