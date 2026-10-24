import { request, type Session } from './http';

export interface User { id: string; name: string; email: string; emailVerified: boolean }
export interface Challenge { challengeId: string; purpose: 'login' | 'verify_email' | 'reset_password'; maskedEmail: string; expiresIn: number; resendIn: number }
export type AuthStep =
  | { status: 'signed_in'; session: Session; user: User; deviceToken?: string }
  | { status: 'otp_required' | 'verify_email'; challenge: Challenge };

export interface LabValue { name: string; value: string; unit: string | null; range: string | null; flag: 'low' | 'normal' | 'high' | 'unknown' }
export interface AiSnapshot {
  summary: string;
  findings: string[];
  medications: { name: string; dosage: string | null; frequency: string | null }[];
  labValues: LabValue[];
  terms: { term: string; meaning: string }[];
  model: string;
}
export interface ScanDraft extends AiSnapshot {
  title: string; category: string; eventDate: string | null; provider: string | null; facility: string | null; legible: boolean;
}
export interface RecordFile { id: string; contentType: string; size: number; position: number; url: string }
export interface HealthRecord {
  id: string; title: string; category: string; eventDate: string | null; provider: string | null; facility: string | null;
  notes: string | null; ai: AiSnapshot | null; fileCount: number; createdAt: string; updatedAt: string; files?: RecordFile[];
}
export type RecordInput = Pick<HealthRecord, 'title' | 'category' | 'eventDate' | 'provider' | 'facility' | 'notes' | 'ai'>;

export interface Profile {
  name: string; email: string; dateOfBirth: string | null; sex: string | null; bloodType: string | null;
  heightCm: number | null; weightKg: number | null; allergies: string[]; conditions: string[]; medications: string[];
  organDonor: boolean | null; phone: string | null; emergencyContactName: string | null; emergencyContactPhone: string | null;
  emergencyContactRelation: string | null; avatarUrl: string | null; emergency: { enabled: boolean; url: string | null };
}

export interface Share {
  id: string; label: string | null; scope: 'all' | 'categories' | 'records'; scopeLabel: string; categories: string[];
  recordCount: number | null; expiresAt: string; createdAt: string; revokedAt: string | null; firstViewAt: string | null;
  viewCount: number; state: 'active' | 'expired' | 'revoked'; url: string | null;
}
export type ShareScope = { scope: 'all' } | { scope: 'categories'; categories: string[] } | { scope: 'records'; recordIds: string[] };

export interface ActivityItem { id: string; kind: string; title: string; detail: string | null; meta: Record<string, unknown>; createdAt: string; unread: boolean }
export interface HistorySummary { overview: string; conditions: string[]; medications: string[]; allergies: string[]; recentEvents: { date: string | null; text: string }[]; model: string }

const post = <T>(path: string, json?: unknown, auth = true) => request<T>(path, { method: 'POST', json: json ?? {}, auth });

export const api = {
  register: (name: string, email: string, password: string) => post<AuthStep>('/api/auth/register', { name, email, password }, false),
  login: (email: string, password: string, deviceToken?: string) => post<AuthStep>('/api/auth/login', { email, password, deviceToken }, false),
  verify: (challengeId: string, code: string, purpose: 'login' | 'verify_email', trustDevice: boolean, deviceLabel?: string) =>
    post<AuthStep & { status: 'signed_in' }>('/api/auth/verify', { challengeId, code, purpose, trustDevice, deviceLabel }, false),
  resend: (challengeId: string) => post<{ challenge: Challenge }>('/api/auth/resend', { challengeId }, false),
  forgot: (email: string) => post<{ challenge: Challenge }>('/api/auth/password/forgot', { email }, false),
  reset: (challengeId: string, code: string, password: string) => post<{ status: string }>('/api/auth/password/reset', { challengeId, code, password }, false),
  me: () => request<{ user: User }>('/api/auth/me'),
  logout: () => post<{ signedOut: true }>('/api/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) => post<{ status: string }>('/api/auth/password/change', { currentPassword, newPassword }),
  sessions: () => request<{ sessions: { id: string; device: string | null; createdAt: string; lastUsedAt: string; current: boolean }[] }>('/api/auth/sessions'),
  revokeSession: (id: string) => request(`/api/auth/sessions/${id}`, { method: 'DELETE' }),
  forgetDevices: () => request('/api/auth/trusted-devices', { method: 'DELETE' }),

  profile: () => request<{ profile: Profile }>('/api/profile'),
  updateProfile: (patch: Partial<Omit<Profile, 'email' | 'avatarUrl' | 'emergency'>>) => request<{ profile: Profile }>('/api/profile', { method: 'PATCH', json: patch }),
  setEmergency: (enabled: boolean, rotate = false) => request<{ profile: Profile }>('/api/profile/emergency', { method: 'PUT', json: { enabled, rotate } }),
  uploadAvatar: (body: Blob) => request<{ profile: Profile }>('/api/profile/avatar', { method: 'PUT', body, timeoutMs: 60_000 }),

  records: (params: { q?: string; category?: string; cursor?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    return request<{ records: HealthRecord[]; nextCursor: string | null }>(`/api/records${qs.size ? `?${qs}` : ''}`);
  },
  summary: () => request<{ total: number; counts: Record<string, number>; latest: string | null }>('/api/records/summary'),
  record: (id: string) => request<{ record: HealthRecord & { files: RecordFile[] } }>(`/api/records/${id}`),
  uploadPage: (body: Blob) => request<{ file: { id: string; contentType: string; size: number } }>('/api/records/files', { method: 'POST', body, timeoutMs: 90_000 }),
  discardPage: (id: string) => request(`/api/records/files/${id}`, { method: 'DELETE' }),
  scan: (fileIds: string[]) => request<{ draft: ScanDraft }>('/api/records/scan', { method: 'POST', json: { fileIds }, timeoutMs: 90_000 }),
  createRecord: (input: RecordInput & { fileIds: string[] }) => request<{ record: HealthRecord }>('/api/records', { method: 'POST', json: input }),
  updateRecord: (id: string, patch: Partial<RecordInput>) => request<{ record: HealthRecord }>(`/api/records/${id}`, { method: 'PATCH', json: patch }),
  deleteRecord: (id: string) => request(`/api/records/${id}`, { method: 'DELETE' }),
  removePage: (recordId: string, fileId: string) => request(`/api/records/${recordId}/files/${fileId}`, { method: 'DELETE' }),

  shares: () => request<{ active: Share[]; history: Share[] }>('/api/shares'),
  createShare: (scope: ShareScope, minutes: number, label?: string) => request<{ share: Share }>('/api/shares', { method: 'POST', json: { ...scope, minutes, label } }),
  revokeShare: (id: string) => request<{ share: Share }>(`/api/shares/${id}`, { method: 'DELETE' }),
  revokeAllShares: () => post<{ revoked: number }>('/api/shares/revoke-all'),

  activity: (before?: string) => request<{ items: ActivityItem[]; unread: number; nextBefore: string | null }>(`/api/activity${before ? `?before=${before}` : ''}`),
  markSeen: () => post<{ unread: 0 }>('/api/activity/seen'),
  aiSummary: () => post<{ summary: HistorySummary; basedOn: number; limited: boolean }>('/api/ai/summary'),
  exportJson: () => request<Record<string, unknown>>('/api/export'),
};

/** Every record, following cursors to the end (exports must never be truncated). */
export async function allRecords() {
  const out: HealthRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.records({ cursor, limit: 100 });
    out.push(...page.records);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return out;
}
