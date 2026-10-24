/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTypeScript(file, mocks = {}) {
  const filename = path.resolve(__dirname, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  loaded._compile(code, filename);
  return loaded.exports;
}

const data = loadTypeScript('../lib/healthExportData.ts');
const profile = {
  user: { name: 'Patient <One>', email: 'person@example.com', password_hash: 'secret' },
  profile: { allergies: '<script>alert("test")</script> & latex', avatarUrl: 'file://private/avatar.jpg', organDonor: false },
  recordsCount: 1,
};
const records = [{
  id: 'record-1', title: 'Checkup <img src=x onerror=alert(1)>', date: '2026-10-14', type: 'consultation',
  description: 'Line one\nLine two & "quoted"', attachment_url: 'https://private.example.com/file?X-Amz-Signature=secret',
  attachmentPath: 'private/record-1.jpg', user_id: 'private-user',
}];

test('archives include record text and attachment presence without private access paths', () => {
  const archive = data.buildHealthArchive(profile, records, '2026-10-14T00:00:00.000Z');
  assert.equal(archive.recordsCount, 1);
  assert.equal(archive.records[0].hasAttachment, true);
  assert.equal(archive.records[0].description, records[0].description);
  const json = JSON.stringify(archive);
  for (const forbidden of ['X-Amz-Signature', 'private.example.com', 'file://', 'private/record-1', 'password_hash', 'private-user']) {
    assert.ok(!json.includes(forbidden), forbidden);
  }
  assert.match(archive.contents, /not embedded/);
});

test('printable history escapes every user field and preserves notes', () => {
  const html = data.buildHealthHistoryHtml(data.buildHealthArchive(profile, records));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /Patient &lt;One&gt;/);
  assert.match(html, /&lt;script&gt;alert\(&quot;test&quot;\)&lt;\/script&gt; &amp; latex/);
  assert.match(html, /Line one\nLine two &amp; &quot;quoted&quot;/);
  assert.match(html, /not included in this history/);
});

test('missing profile and changed record counts stop a misleading partial archive', () => {
  assert.throws(() => data.buildHealthArchive({}, []), /profile could not be loaded/);
  assert.throws(() => data.buildHealthArchive({ ...profile, recordsCount: 101 }, records), /vault changed/);
  const empty = data.buildHealthArchive({ ...profile, recordsCount: 0 }, []);
  assert.match(data.buildHealthHistoryHtml(empty), /No medical records/);
});

function nativeExport(api) {
  const calls = [];
  return {
    calls,
    ...loadTypeScript('../lib/healthExport.ts', {
      'react-native': { Platform: { OS: 'ios' } },
      'expo-file-system/legacy': {
        cacheDirectory: 'file:///cache/', EncodingType: { UTF8: 'utf8' },
        writeAsStringAsync: async (...args) => calls.push(['write', ...args]),
        moveAsync: async (...args) => calls.push(['move', ...args]),
        deleteAsync: async (...args) => calls.push(['delete', ...args]),
      },
      'expo-print': { printToFileAsync: async (options) => { calls.push(['print', options]); return { uri: 'file:///cache/history.pdf' }; } },
      'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (...args) => calls.push(['share', ...args]) },
      './api': { api }, './healthExportData': data,
    }),
  };
}

test('native JSON is a real file containing every returned record and is cleaned after sharing', async () => {
  const manyRecords = Array.from({ length: 205 }, (_, index) => ({ ...records[0], id: String(index) }));
  const subject = nativeExport({ getProfile: async () => ({ ...profile, recordsCount: 205 }), getAllRecords: async () => ({ records: manyRecords }) });
  await subject.exportHealthVault('json');
  const written = subject.calls.find(([type]) => type === 'write');
  assert.match(written[1], /\.json$/);
  assert.equal(JSON.parse(written[2]).records.length, 205);
  assert.equal(subject.calls.find(([type]) => type === 'share')[2].mimeType, 'application/json');
  assert.equal(subject.calls.at(-1)[0], 'delete');
});

test('native PDF prints escaped history and shares a PDF file', async () => {
  const subject = nativeExport({ getProfile: async () => profile, getAllRecords: async () => ({ records }) });
  await subject.exportHealthVault('pdf');
  assert.match(subject.calls.find(([type]) => type === 'print')[1].html, /Patient &lt;One&gt;/);
  assert.equal(subject.calls.find(([type]) => type === 'share')[2].mimeType, 'application/pdf');
  assert.match(subject.calls.find(([type]) => type === 'share')[1], /MedRec_Health_History_.*\.pdf$/);
  assert.equal(subject.calls.at(-1)[0], 'delete');
});

test('fresh profile or record load failures never generate or share an empty export', async () => {
  for (const failingMethod of ['getProfile', 'getAllRecords']) {
    const api = { getProfile: async () => profile, getAllRecords: async () => ({ records }) };
    api[failingMethod] = async () => { throw new Error('Offline'); };
    const subject = nativeExport(api);
    await assert.rejects(subject.exportHealthVault('json'), /Offline/);
    assert.deepEqual(subject.calls, []);
  }
});

function paginatedApi(getPage) {
  const savedUrl = process.env.EXPO_PUBLIC_API_URL;
  const savedDevelopment = global.__DEV__;
  process.env.EXPO_PUBLIC_API_URL = 'https://test.example.com/api';
  global.__DEV__ = false;
  let api;
  try {
    ({ api } = loadTypeScript('../lib/api.ts', {
      './apiBaseUrl': loadTypeScript('../lib/apiBaseUrl.ts'),
      'react-native': { Platform: { OS: 'ios' } },
      'expo-secure-store': {}, 'expo-constants': { default: {} },
    }));
  } finally {
    if (savedUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = savedUrl;
    if (savedDevelopment === undefined) delete global.__DEV__;
    else global.__DEV__ = savedDevelopment;
  }
  api.getRecords = getPage;
  return api;
}

test('API pagination includes all 205 records and requests successive page offsets', async () => {
  const all = Array.from({ length: 205 }, (_, index) => ({ ...records[0], id: String(index) }));
  const offsets = [];
  const api = paginatedApi(async ({ limit, offset }) => {
    offsets.push(offset);
    return { records: all.slice(offset, offset + limit) };
  });
  assert.deepEqual((await api.getAllRecords()).records, all);
  assert.deepEqual(offsets, [0, 100, 200]);
});

test('API pagination checks the final empty page for exact page multiples', async () => {
  const all = Array.from({ length: 200 }, (_, index) => ({ ...records[0], id: String(index) }));
  const offsets = [];
  const api = paginatedApi(async ({ limit, offset }) => {
    offsets.push(offset);
    return { records: all.slice(offset, offset + limit) };
  });
  assert.equal((await api.getAllRecords()).records.length, 200);
  assert.deepEqual(offsets, [0, 100, 200]);
});

test('API pagination rejects overlapping or malformed pages instead of silently losing records', async () => {
  const first = Array.from({ length: 100 }, (_, index) => ({ ...records[0], id: String(index) }));
  const overlap = paginatedApi(async ({ offset }) => ({ records: offset === 0 ? first : [{ ...records[0], id: '99' }, { ...records[0], id: '100' }] }));
  await assert.rejects(overlap.getAllRecords(), /list changed/);
  for (const invalid of [null, {}, { records: 'invalid' }, { records: [null] }, { records: [{ id: 'only-id' }] }]) {
    const api = paginatedApi(async () => invalid);
    await assert.rejects(api.getAllRecords(), /incomplete record list|invalid record/);
  }
});

test('API pagination propagates later page failure without returning a partial list', async () => {
  const first = Array.from({ length: 100 }, (_, index) => ({ ...records[0], id: String(index) }));
  const api = paginatedApi(async ({ offset }) => {
    if (offset > 0) throw new Error('Connection lost');
    return { records: first };
  });
  await assert.rejects(api.getAllRecords(), /Connection lost/);
});

function browserExport() {
  return loadTypeScript('../lib/healthExport.ts', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-file-system/legacy': {}, 'expo-print': {}, 'expo-sharing': {},
    './api': { api: { getProfile: async () => profile, getAllRecords: async () => ({ records }) } },
    './healthExportData': data,
  });
}

test('browser JSON export initiates a named file download rather than sharing JSON text', async () => {
  const savedDocument = global.document;
  let clicked = false;
  const link = { remove() {}, click() { clicked = true; } };
  global.document = { createElement: () => link, body: { appendChild() {} } };
  try {
    await browserExport().exportHealthVault('json');
    assert.ok(clicked);
    assert.match(link.download, /^MedRec_Health_Vault_\d{4}-\d{2}-\d{2}\.json$/);
    const archive = await (await fetch(link.href)).json();
    assert.equal(archive.records.length, 1);
    assert.ok(!JSON.stringify(archive).includes('X-Amz-Signature'));
  } finally {
    if (savedDocument === undefined) delete global.document;
    else global.document = savedDocument;
  }
});

test('browser PDF prints an isolated escaped history and removes it after print', async () => {
  const savedDocument = global.document;
  let printed = false;
  let removed = false;
  let afterPrint;
  const frame = {
    style: {}, remove() { removed = true; },
    contentWindow: { focus() {}, print() { printed = true; }, addEventListener(event, callback) { if (event === 'afterprint') afterPrint = callback; } },
  };
  global.document = {
    createElement(tag) { assert.equal(tag, 'iframe'); return frame; },
    body: { appendChild(element) { element.onload(); } },
  };
  try {
    await browserExport().exportHealthVault('pdf');
    assert.ok(printed);
    assert.match(frame.srcdoc, /Patient &lt;One&gt;/);
    assert.ok(!frame.srcdoc.includes('<script>'));
    afterPrint();
    assert.ok(removed);
  } finally {
    if (savedDocument === undefined) delete global.document;
    else global.document = savedDocument;
  }
});
