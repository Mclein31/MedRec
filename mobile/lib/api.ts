import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { MedicalRecord } from '../types/record';
import { resolveApiBaseUrl } from './apiBaseUrl';

function getApiBaseUrl(): string {
  const metroHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  return resolveApiBaseUrl({
    configuredUrl: process.env.EXPO_PUBLIC_API_URL,
    development: __DEV__,
    platform: Platform.OS,
    metroHost,
    webHostname: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : undefined,
  });
}

const API_BASE_URL = getApiBaseUrl();

const TOKEN_KEY = 'authToken';
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => { sessionExpiredListeners.delete(listener); };
}

const tokenStorage = {
  async get(key: string) {
    try {
      if (Platform.OS === 'web') return localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[tokenStorage] Failed to get key "${key}":`, e);
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[tokenStorage] Failed to set key "${key}":`, e);
      throw new Error('Could not save your session on this device. Please try again.');
    }
  },
  async delete(key: string) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[tokenStorage] Failed to delete key "${key}":`, e);
      throw new Error('Could not clear your session from this device. Please try again.');
    }
  },
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body?: unknown;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await tokenStorage.get(TOKEN_KEY);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The connection took too long. Please try again.');
    throw error;
  } finally { clearTimeout(timeout); }

  if (response.status === 204) {
    if (!response.ok) throw new Error('Request failed');
    return null as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const expiredSession = data.code === 'SESSION_EXPIRED' || /^(Invalid or expired session token|User session has been revoked|Session token has been invalidated)/.test(data.error || '');
    if (response.status === 401 && expiredSession && token && token === await tokenStorage.get(TOKEN_KEY)) {
      sessionExpiredListeners.forEach(listener => listener());
    }
    throw new ApiError(data.error || `Request failed with status ${response.status}`, response.status, data.code);
  }

  return data as T;
}

export const api = {
  register: async (name: string, email: string, password: string) => {
    try {
      return await request('/auth/register', { method: 'POST', body: { name, email, password } });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'EMAIL_ALREADY_EXISTS') throw error;
      // Creation may have succeeded before its response or local session save failed.
      // Password login proves ownership; never replace or modify the existing account.
      try {
        return await request('/auth/login', { method: 'POST', body: { email, password } });
      } catch (loginError) {
        if (loginError instanceof ApiError && loginError.status === 401) {
          throw new ApiError('An account with this email exists, but the password does not match. Sign in with your existing password.', 409, 'EMAIL_ALREADY_EXISTS');
        }
        throw loginError;
      }
    }
  },

  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  loginWithGoogle: (idToken: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; avatarUrl?: string | null } }>('/auth/google', {
      method: 'POST',
      body: { idToken },
    }),

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

  getAllRecords: async (): Promise<{ records: MedicalRecord[] }> => {
    const records: MedicalRecord[] = [];
    const seenIds = new Set<string>();
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const page = await api.getRecords({ limit, offset });
      if (!page || !Array.isArray(page.records) || page.records.length > limit) {
        throw new Error('The server returned an incomplete record list. Please refresh and try again.');
      }
      const batch: MedicalRecord[] = page.records;
      for (const record of batch) {
        if (!record || typeof record.id !== 'string' || !record.id.trim()
          || typeof record.title !== 'string' || typeof record.type !== 'string' || typeof record.date !== 'string') {
          throw new Error('The server returned an invalid record. Please refresh and try again.');
        }
        if (seenIds.has(record.id)) {
          throw new Error('The record list changed while loading. Please refresh and try again.');
        }
        seenIds.add(record.id);
      }
      records.push(...batch);
      if (batch.length < limit) break;
    }
    return { records };
  },

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
      records: {
        id: string;
        title: string;
        type: string;
        date: string;
        description: string | null;
        downloadUrl: string | null;
      }[];
    }>(`/share/${shareToken}/export`),

  getSharedZipUrl: (shareToken: string) => `${API_BASE_URL}/share/${shareToken}/zip`,

  getStorageUploadUrl: (data: { bucket?: string; fileName: string; fileType: string }) =>
    request<{ uploadUrl: string; path: string; key?: string }>('/storage/upload-url', { method: 'POST', body: data }),

  uploadFileToSignedUrl: async (uploadUrl: string, fileUri: string, mimeType: string = 'image/jpeg') => {
    if (__DEV__ && (uploadUrl.includes('mock.r2.cloudflarestorage.com') || uploadUrl.includes('mock.supabase.co'))) {
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

  summarize: (params?: { type?: string; recordIds?: string[] }) =>
    request('/ai/summarize', { method: 'POST', body: params || {} }),

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

export const ONBOARDING_STORAGE_KEY = 'medrec_onboarding_completed_v1';

export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await tokenStorage.get(ONBOARDING_STORAGE_KEY);
    return val === 'true';
  } catch (err) {
    console.warn('Failed to read onboarding state:', err);
    return false;
  }
}

export async function setHasCompletedOnboarding(completed: boolean = true): Promise<void> {
  try {
    await tokenStorage.set(ONBOARDING_STORAGE_KEY, completed ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to save onboarding state:', err);
  }
}

export async function resetHasCompletedOnboarding(): Promise<void> {
  try {
    await tokenStorage.delete(ONBOARDING_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to delete onboarding state:', err);
  }
}
