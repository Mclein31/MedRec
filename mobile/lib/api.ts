import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip) return `http://${ip}:4000/api`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }
  return 'http://localhost:4000/api';
}

const API_BASE_URL = getApiBaseUrl();

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

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
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

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, newPassword: string) =>
    request('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),

  getRecords: (params?: { type?: string; limit?: number; offset?: number }) => {
    let query = '';
    if (params) {
      const qs = new URLSearchParams();
      if (params.type) qs.append('type', params.type);
      if (params.limit) qs.append('limit', String(params.limit));
      if (params.offset) qs.append('offset', String(params.offset));
      const str = qs.toString();
      if (str) query = `?${str}`;
    }
    return request(`/records${query}`);
  },

  getRecord: (id: string) => request(`/records/${id}`),

  addRecord: (record: {
    type: string;
    title: string;
    description?: string;
    date: string;
    attachmentUrl?: string;
    attachment_url?: string;
  }) => request('/records', { method: 'POST', body: record }),

  updateRecord: (
    id: string,
    record: Partial<{
      type: string;
      title: string;
      description?: string | null;
      date: string;
      attachmentUrl?: string | null;
      attachment_url?: string | null;
    }>
  ) => request<{ record: any }>(`/records/${id}`, { method: 'PUT', body: record }),

  deleteRecord: (id: string) => request(`/records/${id}`, { method: 'DELETE' }),

  createShare: (params: { ttlMinutes?: number; allowedTypes?: string[]; recordIds?: string[] } | number, recordIds?: string[]) => {
    let payload = {};
    if (typeof params === 'number') {
      payload = { ttlMinutes: params, recordIds };
    } else {
      payload = params;
    }
    return request('/share', { method: 'POST', body: payload });
  },

  listShares: () => request('/share'),

  revokeShare: (id: string) => request(`/share/${id}`, { method: 'DELETE' }),

  getSharedRecords: (shareToken: string) =>
    request<{
      token: string;
      expiresAt: string;
      createdAt?: string;
      patient?: { name?: string };
      records: any[];
    }>(`/share/${shareToken}`),

  summarizeShared: (shareToken: string) =>
    request<{
      summary: string;
      currentMedications: string[];
      diagnoses: string[];
      keyNotes: string[];
    }>(`/share/${shareToken}/summarize`, { method: 'POST' }),

  terminateShared: (shareToken: string) =>
    request<{ message: string }>(`/share/${shareToken}/terminate`, { method: 'POST' }),

  downloadSharedRecord: (shareToken: string, recordId: string) =>
    request<{
      recordId: string;
      title: string;
      type: string;
      downloadUrl: string;
    }>(`/share/${shareToken}/download/${recordId}`),

  exportShared: (shareToken: string) =>
    request<{
      exportType: string;
      patientName: string;
      sharedOn: string;
      expiresAt: string;
      exportedAt: string;
      totalRecords: number;
      records: Array<{
        id: string;
        title: string;
        type: string;
        date: string;
        description: string | null;
        downloadUrl: string | null;
      }>;
    }>(`/share/${shareToken}/export`),

  getSharedZipUrl: (shareToken: string) => `${API_BASE_URL}/share/${shareToken}/zip`,

  getStorageUploadUrl: (data: { bucket?: string; fileName: string; fileType: string }) =>
    request<{ uploadUrl: string; path: string; key?: string }>('/storage/upload-url', { method: 'POST', body: data }),

  uploadFileToSignedUrl: async (uploadUrl: string, fileUri: string, mimeType: string = 'image/jpeg') => {
    if (uploadUrl.includes('mock.r2.cloudflarestorage.com') || uploadUrl.includes('mock.supabase.co')) {
      // Mock upload for local/testing without real storage
      return;
    }
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with status ${uploadRes.status}`);
    }
  },

  summarize: () => request('/ai/summarize', { method: 'POST', body: {} }),

  explain: (text: string) => request('/ai/explain', { method: 'POST', body: { text } }),

  organize: (text: string) => request('/ai/organize', { method: 'POST', body: { text } }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getMe: () => request('/auth/me'),

  getProfile: () => request('/profile'),

  updateProfile: (data: Record<string, any>) =>
    request('/profile', { method: 'PUT', body: data }),

  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
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