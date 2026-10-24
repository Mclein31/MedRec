/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(file, mocks = {}, globals = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => { assert.ok(name in mocks, `Unexpected import: ${name}`); return mocks[name]; },
    console: { warn() {} }, Date, URLSearchParams, AbortController, setTimeout, clearTimeout,
    ...globals,
  });
  return module.exports;
}

const dates = loadSource('../utils/dateUtils.ts');
const sharing = loadSource('../utils/shareUtils.ts');

test('civil dates reject impossible dates and accept Gregorian leap years', () => {
  for (const date of ['2024-02-29', '2000-02-29', '2026-10-14', '2026-04-30']) {
    assert.equal(dates.isValidRecordDate(date), true, date);
  }
  for (const date of ['0000-01-01', '1900-02-29', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-1', '2026-10-14T00:00:00Z', '']) {
    assert.equal(dates.isValidRecordDate(date), false, date);
  }
  const today = new Date();
  assert.equal(dates.todayDate(), `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
});

test('QR scope labels distinguish a full vault, selected records, and categories', () => {
  assert.equal(sharing.shareScopeLabel(null), 'All records');
  assert.equal(sharing.shareScopeLabel(null, 2), '2 selected records');
  assert.equal(sharing.shareScopeLabel({ record_ids: ['one'], allowed_types: ['lab', 'diagnosis'] }, 10), '1 selected record');
  assert.equal(sharing.shareScopeLabel({ allowed_types: ['lab'] }), '1 record category');
  assert.equal(sharing.shareScopeLabel({ allowed_types: ['lab', 'consultation'] }), '2 record categories');
});

test('QR access expires at its exact timestamp and revocation always wins', () => {
  const now = Date.parse('2026-10-14T03:00:00Z');
  assert.equal(sharing.isShareActive({ expires_at: '2026-10-14T03:00:01Z' }, now), true);
  assert.equal(sharing.isShareActive({ expires_at: '2026-10-14T03:00:00Z' }, now), false);
  assert.equal(sharing.isShareActive({ expires_at: '2026-10-14T03:15:00Z', revoked_at: '2026-10-14T02:00:00Z' }, now), false);
  assert.equal(sharing.isShareActive({ expires_at: 'invalid' }, now), false);
});

function apiHarness({ storageFails = false } = {}) {
  const state = { token: 'old-token', expirations: 0, requests: [], response: async () => ({ status: 200, ok: true, json: async () => ({}) }) };
  const loaded = loadSource('../lib/api.ts', {
    './apiBaseUrl': loadSource('../lib/apiBaseUrl.ts', {}, { URL }),
    'react-native': { Platform: { OS: 'ios' } },
    'expo-constants': { default: {} },
    'expo-secure-store': {
      getItemAsync: async () => state.token,
      setItemAsync: async (_, value) => { if (storageFails) throw new Error('Device storage unavailable'); state.token = value; },
      deleteItemAsync: async () => { if (storageFails) throw new Error('Device storage unavailable'); state.token = null; },
    },
  }, {
    __DEV__: false,
    process: { env: { EXPO_PUBLIC_API_URL: 'https://test.example.com/api' } },
    fetch: async (url, options) => { state.requests.push({ url, options }); return state.response(url, options); },
  });
  const unsubscribe = loaded.onSessionExpired(() => { state.expirations++; });
  return { ...loaded, state, unsubscribe };
}

const unauthorized = (error, code) => ({ status: 401, ok: false, json: async () => ({ error, ...(code ? { code } : {}) }) });

test('protected session expiry notifies auth and listener removal stops notification', async () => {
  const subject = apiHarness();
  subject.state.response = async () => unauthorized('Invalid or expired session token', 'SESSION_EXPIRED');
  for (const request of [() => subject.api.getRecords(), () => subject.api.listShares(), () => subject.api.getStorageUploadUrl({ fileName: 'document.jpg', fileType: 'image/jpeg' })]) {
    await assert.rejects(request(), error => error.status === 401);
  }
  assert.equal(subject.state.expirations, 3);
  subject.unsubscribe();
  await assert.rejects(subject.api.getMe());
  assert.equal(subject.state.expirations, 3);
});

test('incorrect login and current password do not invalidate an existing session', async () => {
  const subject = apiHarness();
  subject.state.response = async () => unauthorized('Invalid email or password');
  await assert.rejects(subject.api.login('person@example.com', 'incorrect'));
  subject.state.response = async () => unauthorized('Current password is incorrect');
  await assert.rejects(subject.api.changePassword({ currentPassword: 'incorrect', newPassword: 'NewPassword123' }));
  assert.equal(subject.state.expirations, 0);
  assert.equal(subject.state.token, 'old-token');
});

test('a delayed expired response cannot invalidate a newly saved session', async () => {
  const subject = apiHarness();
  let resolveResponse;
  subject.state.response = () => new Promise(resolve => { resolveResponse = resolve; });
  const pending = subject.api.getRecords();
  while (!resolveResponse) await Promise.resolve();
  await subject.saveToken('new-token');
  resolveResponse(unauthorized('Invalid or expired session token', 'SESSION_EXPIRED'));
  await assert.rejects(pending);
  assert.equal(subject.state.expirations, 0);
  assert.equal(await subject.getToken(), 'new-token');
});

test('session persistence failure is reported instead of falsely saving or clearing credentials', async () => {
  const subject = apiHarness({ storageFails: true });
  await assert.rejects(subject.saveToken('new-token'), /Could not save your session/);
  await assert.rejects(subject.clearToken(), /Could not clear your session/);
  assert.equal(subject.state.token, 'old-token');
});

test('retrying a completed registration recovers through password login without changing the existing account', async () => {
  const subject = apiHarness();
  subject.state.response = async url => url.endsWith('/auth/register')
    ? { status: 409, ok: false, json: async () => ({ error: 'An account with that email already exists', code: 'EMAIL_ALREADY_EXISTS' }) }
    : { status: 200, ok: true, json: async () => ({ token: 'recovered-token', user: { id: 'existing-account' } }) };
  const result = await subject.api.register('New name', 'patient@example.com', 'Password123');
  assert.equal(result.token, 'recovered-token');
  assert.equal(result.user.id, 'existing-account');
  assert.equal(subject.state.requests.length, 2);
  assert.equal(subject.state.requests[1].url, 'https://test.example.com/api/auth/login');
  assert.deepEqual(JSON.parse(subject.state.requests[1].options.body), { email: 'patient@example.com', password: 'Password123' });
});

test('duplicate signup never authenticates a mismatched password, and unrelated conflicts are not retried', async () => {
  const subject = apiHarness();
  subject.state.response = async url => url.endsWith('/auth/register')
    ? { status: 409, ok: false, json: async () => ({ error: 'An account with that email already exists', code: 'EMAIL_ALREADY_EXISTS' }) }
    : unauthorized('Invalid email or password');
  await assert.rejects(subject.api.register('Patient', 'patient@example.com', 'WrongPassword1'), error => error.status === 409 && /Sign in/.test(error.message));
  assert.equal(subject.state.token, 'old-token');
  subject.state.requests = [];
  subject.state.response = async () => ({ status: 409, ok: false, json: async () => ({ error: 'Unrelated conflict' }) });
  await assert.rejects(subject.api.register('Patient', 'patient@example.com', 'Password123'), /Unrelated conflict/);
  assert.equal(subject.state.requests.length, 1);
});

test('signup recovery preserves connection failures instead of claiming a password mismatch', async () => {
  const subject = apiHarness();
  subject.state.response = async url => {
    if (url.endsWith('/auth/register')) return { status: 409, ok: false, json: async () => ({ error: 'An account with that email already exists', code: 'EMAIL_ALREADY_EXISTS' }) };
    throw new Error('Network unavailable');
  };
  await assert.rejects(subject.api.register('Patient', 'patient@example.com', 'Password123'), /Network unavailable/);
});

test('a failed local session save tells signup users their account was created', async () => {
  const changes = [];
  const { AuthProvider } = loadSource('../context/AuthContext.tsx', {
    react: {
      createContext: () => ({ Provider: 'AuthProvider' }),
      useState: initial => [initial, value => changes.push(value)],
      useEffect() {},
    },
    'react/jsx-runtime': require('react/jsx-runtime'),
    '../lib/api': {
      api: { register: async () => ({ token: 'new-token', user: { id: 'account' } }) },
      saveToken: async () => { throw new Error('Device storage unavailable'); },
    },
  });
  const context = AuthProvider({ children: null }).props.value;
  await assert.rejects(context.register('Patient', 'patient@example.com', 'Password123'), /Your account is ready.*could not save your session/);
  assert.equal(changes.length, 0, 'failed persistence must not announce an authenticated session');
});

test('two signup submissions in the same render issue only one registration', async () => {
  let registrations = 0;
  let resolveRegistration;
  let navigations = 0;
  const { AuthScreen } = loadSource('../components/auth/AuthScreen.tsx', {
    react: {
      useEffect() {}, useRef: initial => ({ current: initial }),
      useState: initial => [initial && typeof initial === 'object' && 'confirmation' in initial
        ? { name: 'Patient', email: 'patient@example.com', password: 'Password123', confirmation: 'Password123' }
        : initial, () => {}],
    },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': {
      View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView',
      KeyboardAvoidingView: 'KeyboardAvoidingView', Image: 'Image', Platform: { OS: 'ios' }, StyleSheet: { create: styles => styles },
    },
    '@expo/vector-icons': { Ionicons: 'Ionicons' }, 'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useRouter: () => ({ replace: () => navigations++ }) },
    '../../context/AuthContext': { useAuth: () => ({ register: async () => { registrations++; await new Promise(resolve => { resolveRegistration = resolve; }); } }) },
    '../../lib/api': { ApiError: Error },
    '../../hooks/useResponsive': { useResponsive: () => ({ insets: { top: 0, bottom: 0 }, isTablet: false, width: 428 }) },
    '../../constants/theme': { Colors: {}, Radii: {} }, '../ui/Button': { Button: 'Button' },
    '../security/PrivateModal': { PrivateModal: 'PrivateModal' }, '../../assets/logo/logo.png': 1,
  });
  function findButton(element) {
    if (!element || typeof element !== 'object') return null;
    if (element.type === 'Button' && element.props.label === 'Create account') return element;
    const children = Array.isArray(element.props?.children) ? element.props.children.flat() : [element.props?.children];
    return children.map(findButton).find(Boolean);
  }
  const button = findButton(AuthScreen({ mode: 'register' }));
  assert.ok(button);
  const pending = button.props.onPress();
  await button.props.onPress();
  assert.equal(registrations, 1);
  resolveRegistration();
  await pending;
  assert.equal(navigations, 1);
});
