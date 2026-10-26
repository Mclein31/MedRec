import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Keychain/Keystore on devices; localStorage on web (development and preview only). */
export const secure = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // storage blocked; the session lasts for this tab only
      }
      return;
    }
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const KEYS = {
  session: 'medrec.session.v2',
  deviceToken: (email: string) => `medrec.device.${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
  onboarded: 'medrec.onboarded.v2',
  appLock: (userId: string) => `medrec.lock.${userId}`,
  prefs: 'medrec.prefs.v1',
};
