/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
// Mocked hook/lifecycle regression checks. Device biometrics and native presentation
// still require real-device QA; this scheduler exercises the actual context policy.
const source = fs.readFileSync(path.join(__dirname, '../context/AppLockContext.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const key = id => `medrec_app_lock_${Array.from(id, c => c.codePointAt(0).toString(16)).join('-')}`;

function harness({ platform = 'ios', preference = null, hardware = true, enrolled = true, storageFails = false } = {}) {
  const hooks = []; let cursor = 0; let effects = []; let dirty = false; let value; let listener;
  const auth = { token: 'session-a', user: { id: 'user-a' }, isLoading: false, refreshUser: async () => {} };
  const stored = new Map(preference === null ? [] : [[key('user-a'), preference]]);
  let authResult = { success: true }; let prompt; let promptCount = 0; let writeWait;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => value,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], next => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; dirty = true; }];
    },
    useRef(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = { current: initial }; return hooks[index]; },
    useCallback(fn, deps) { const index = cursor++; if (!hooks[index] || !same(hooks[index].deps, deps)) hooks[index] = { fn, deps }; return hooks[index].fn; },
    useEffect(fn, deps) { const index = cursor++; if (!hooks[index] || !same(hooks[index].deps, deps)) { hooks[index] = { deps }; effects.push(fn); } },
  };
  const local = {
    AuthenticationType: { FACIAL_RECOGNITION: 2 },
    hasHardwareAsync: async () => hardware,
    isEnrolledAsync: async () => enrolled,
    supportedAuthenticationTypesAsync: async () => [2],
    authenticateAsync: async options => { promptCount++; prompt = options; return typeof authResult === 'function' ? authResult() : authResult; },
  };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-native': { Platform: { OS: platform }, AppState: { currentState: 'active', addEventListener: (_, fn) => { listener = fn; return { remove() {} }; } } },
    'expo-local-authentication': local,
    'expo-secure-store': {
      getItemAsync: async k => { if (storageFails) throw Error('Locked storage'); return stored.get(k) ?? null; },
      setItemAsync: async (k, v) => { if (storageFails) throw Error('Locked storage'); if (writeWait) await writeWait; stored.set(k, v); },
    },
    './AuthContext': { useAuth: () => auth },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { require: id => { assert.ok(id in mocks, id); return mocks[id]; }, module, exports: module.exports });
  function render() { cursor = 0; dirty = false; value = module.exports.AppLockProvider({ children: null }).props.value; const pending = effects; effects = []; pending.forEach(fn => fn()); }
  async function flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (dirty || !value) render(); } return value; }
  return { flush, auth, stored, setStorageFails(v) { storageFails = v; }, setAuthResult(v) { authResult = v; }, setWriteWait(v) { writeWait = v; }, get value() { return value; }, get prompt() { return prompt; }, get promptCount() { return promptCount; }, async changeState(s) { listener(s); return flush(); } };
}

(async () => {
  let count = 0;
  const check = (condition, label) => { assert.ok(condition, label); count++; };
  const lock = harness({ preference: 'enabled' });
  await lock.flush();
  check(lock.value.ready && lock.value.enabled && lock.value.blocked, 'cold-launch stored lock blocks access');
  await lock.value.unlock(); await lock.flush();
  check(!lock.value.blocked, 'successful native authentication unlocks');
  check(lock.prompt.disableDeviceFallback === false && lock.prompt.biometricsSecurityLevel === 'strong', 'native prompt permits passcode and requires strong Android biometrics');
  await lock.changeState('inactive');
  check(lock.value.blocked, 'inactive screen is covered');
  await lock.changeState('active');
  check(!lock.value.blocked, 'transient inactivity does not require another unlock');
  await lock.changeState('background'); await lock.changeState('active');
  check(lock.value.blocked, 'background then resume requires authentication');
  lock.setAuthResult({ success: false, error: 'user_cancel' });
  await lock.value.unlock(); await lock.flush();
  check(lock.value.blocked && !!lock.value.error, 'cancel never grants access');
  let resolve;
  lock.setAuthResult(() => new Promise(r => { resolve = r; }));
  const unlocking = lock.value.unlock();
  await lock.flush(); await lock.changeState('background'); await lock.changeState('active');
  resolve({ success: true }); await unlocking; await lock.flush();
  check(lock.value.blocked, 'late auth result cannot unlock after a background transition');
  lock.auth.user = { id: 'user-b' }; lock.auth.token = 'session-b'; await lock.changeState('active');
  check(!lock.value.enabled && !lock.value.blocked, 'preferences isolated per account');

  const enable = harness(); await enable.flush();
  enable.setAuthResult({ success: false, error: 'user_cancel' });
  await assert.rejects(enable.value.setEnabled(true)); await enable.flush();
  check(!enable.value.enabled && !enable.stored.has(key('user-a')), 'cancelled enable neither persists nor reports enabled');
  enable.setAuthResult({ success: true }); await enable.value.setEnabled(true); await enable.flush();
  check(enable.value.enabled && enable.stored.get(key('user-a')) === 'enabled' && !enable.value.blocked, 'authenticated enable persists and keeps current session open');
  await enable.changeState('background'); await enable.changeState('active');
  check(enable.value.blocked, 'newly enabled lock applies on next resume');

  const lateWrite = harness(); await lateWrite.flush();
  let finishWrite;
  lateWrite.setWriteWait(new Promise(resolve => { finishWrite = resolve; }));
  const enableAfterWrite = lateWrite.value.setEnabled(true); await lateWrite.flush();
  await lateWrite.changeState('background'); await lateWrite.changeState('active');
  finishWrite(); await enableAfterWrite; await lateWrite.flush();
  check(lateWrite.value.enabled && lateWrite.value.blocked, 'background during preference persistence still requires unlock');

  const newSession = harness(); await newSession.flush();
  let finishSessionWrite;
  newSession.setWriteWait(new Promise(resolve => { finishSessionWrite = resolve; }));
  const enableOldSession = newSession.value.setEnabled(true); await newSession.flush();
  newSession.auth.token = 'new-session-token'; await newSession.changeState('active');
  finishSessionWrite(); await enableOldSession; await newSession.flush();
  check(newSession.value.enabled && newSession.value.blocked, 'same-account re-login during preference write cannot inherit old authentication');

  const noEnrollment = harness({ enrolled: false }); await noEnrollment.flush();
  await assert.rejects(noEnrollment.value.setEnabled(true)); await noEnrollment.flush();
  check(!noEnrollment.value.available && noEnrollment.promptCount === 0 && !noEnrollment.value.enabled, 'no enrollment prevents enabling');

  const brokenStorage = harness({ preference: 'enabled', storageFails: true }); await brokenStorage.flush();
  check(brokenStorage.value.blocked && !brokenStorage.value.ready && !!brokenStorage.value.error, 'storage failure is closed');
  brokenStorage.setStorageFails(false); await brokenStorage.value.unlock(); await brokenStorage.flush();
  check(brokenStorage.value.ready && brokenStorage.value.blocked, 'retry recovers security preference without bypassing auth');
  const corrupt = harness({ preference: 'corrupt' }); await corrupt.flush();
  check(corrupt.value.blocked && !corrupt.value.ready, 'invalid stored preference is closed');

  const web = harness({ platform: 'web', preference: 'enabled' }); await web.flush();
  check(!web.value.available && !web.value.enabled && !web.value.blocked && web.value.ready, 'web is explicitly unsupported, no fake security');

  const modalSource = fs.readFileSync(path.join(__dirname, '../components/security/PrivateModal.tsx'), 'utf8');
  const modalModule = { exports: {} };
  let modalBlocked = true;
  const modalMocks = {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-native': { Modal: 'native-modal' },
    '../../context/AppLockContext': { useAppLock: () => ({ blocked: modalBlocked }) },
  };
  const modalCompiled = ts.transpileModule(modalSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(modalCompiled, { require: id => modalMocks[id], module: modalModule, exports: modalModule.exports });
  const PrivateModal = modalModule.exports.PrivateModal;
  check(!PrivateModal({ visible: true }).props.visible, 'native record modal cannot stay visible above app lock');
  modalBlocked = false;
  check(PrivateModal({ visible: true }).props.visible, 'requested native modal restores after unlock');
  check(!PrivateModal({ visible: false }).props.visible, 'unlock does not open a closed modal');
  check(PrivateModal({}).props.visible, 'native Modal default visibility is preserved');
  console.log(`App-lock lifecycle checks: ${count} passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
