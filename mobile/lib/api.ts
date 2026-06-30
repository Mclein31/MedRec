import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// IMPORTANT: "localhost" only works when testing in a web browser, because the
// browser and the backend are on the same machine. On a real phone (Expo Go),
// "localhost" means the phone itself, which has no server running on it.
// Replace this with your computer's LAN IP address, e.g. "http://REMOVED2:4000"
// Find yours on Mac with: ipconfig getifaddr en0
const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:4000'
  : 'http://REMOVED:4000'; // keep your real LAN IP here for the phone

const TOKEN_KEY = 'authToken';

// expo-secure-store wraps the iOS Keychain / Android Keystore, which don't
// exist on web. On web, fall back to localStorage instead.
const tokenStorage = {
  async get(key: string) {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async delete(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  body?: unknown;
};

async function request(path: string, options: RequestOptions = {}) {
  const token = await tokenStorage.get(TOKEN_KEY);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // DELETE endpoints return 204 No Content - there's no JSON body to parse.
  if (response.status === 204) {
    if (!response.ok) throw new Error('Request failed');
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),

  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  getRecords: () => request('/records'),

  getRecord: (id: string) => request(`/records/${id}`),

  addRecord: (record: { type: string; title: string; description?: string; date: string }) =>
    request('/records', { method: 'POST', body: record }),

  deleteRecord: (id: string) => request(`/records/${id}`, { method: 'DELETE' }),

  createShare: (ttlMinutes: number) =>
    request('/share', { method: 'POST', body: { ttlMinutes } }),

  listShares: () => request('/share'),

  revokeShare: (id: string) => request(`/share/${id}`, { method: 'DELETE' }),

  // Public endpoint - the token IS the credential, no login needed.
  getSharedRecords: (shareToken: string) => request(`/share/${shareToken}`),

  summarize: () => request('/ai/summarize', { method: 'POST', body: {} }),

  explain: (text: string) => request('/ai/explain', { method: 'POST', body: { text } }),
};

export async function saveToken(token: string) {
  await tokenStorage.set(TOKEN_KEY, token);
}

export async function getToken() {
  return tokenStorage.get(TOKEN_KEY);
}

export async function clearToken() {
  await tokenStorage.delete(TOKEN_KEY);
}