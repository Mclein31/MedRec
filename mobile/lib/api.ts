import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'
    : 'http://localhost:4000');

const TOKEN_KEY = 'authToken';

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
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body?: unknown;
};

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await tokenStorage.get(TOKEN_KEY);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    if (!response.ok) throw new Error('Request failed');
    return null as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),

  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  getRecords: () => request('/records'),

  getRecord: (id: string) => request(`/records/${id}`),

  addRecord: (record: {
    type: string;
    title: string;
    description?: string;
    date: string;
    attachmentUrl?: string;
    attachment_url?: string;
  }) => request('/records', { method: 'POST', body: record }),

  deleteRecord: (id: string) => request(`/records/${id}`, { method: 'DELETE' }),

  createShare: (ttlMinutes: number, recordIds?: string[]) =>
    request('/share', { method: 'POST', body: { ttlMinutes, recordIds } }),

  listShares: () => request('/share'),

  revokeShare: (id: string) => request(`/share/${id}`, { method: 'DELETE' }),

  getSharedRecords: (shareToken: string) => request(`/share/${shareToken}`),

  summarize: () => request('/ai/summarize', { method: 'POST', body: {} }),

  explain: (text: string) => request('/ai/explain', { method: 'POST', body: { text } }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getMe: () => request('/auth/me'),

  getProfile: () => request('/profile'),

  updateProfile: (data: Record<string, any>) =>
    request('/profile', { method: 'PUT', body: data }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/profile/password', { method: 'PUT', body: data }),

  deleteAccount: () => request('/profile', { method: 'DELETE' }),

  getNotifications: () => request('/notifications'),

  markNotificationAsRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsAsRead: () =>
    request('/notifications/read-all', { method: 'PATCH' }),

  deleteNotification: (id: string) =>
    request(`/notifications/${id}`, { method: 'DELETE' }),
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