import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { CATEGORY_META } from '../theme';
import { allRecords, api, type HealthRecord, type Profile } from './api';

const stamp = () => new Date().toISOString().slice(0, 10);

function downloadOnWeb(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Full JSON export from the server (every record, no temporary links). */
export async function exportJson() {
  const data = await api.exportJson();
  const name = `medrec-export-${stamp()}.json`;
  const content = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') return downloadOnWeb(name, 'application/json', content);
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your MedRec export', UTI: 'public.json' });
}

export const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export function historyHtml(profile: Profile, records: HealthRecord[], generatedAt = new Date()) {
  const e = escapeHtml;
  const list = (items: string[]) => (items.length ? items.map(e).join(', ') : 'None recorded');
  const rows = records
    .map((r) => {
      const labs = (r.ai?.labValues ?? []).map((l) => `<tr><td>${e(l.name)}</td><td>${e(l.value)} ${e(l.unit)}${l.flag === 'high' ? ' ↑' : l.flag === 'low' ? ' ↓' : ''}</td><td>${e(l.range ?? '')}</td></tr>`).join('');
      return `<section><h3>${e(r.title)}</h3><p class="meta">${e(r.eventDate ?? 'Undated')} · ${e(CATEGORY_META[r.category]?.label ?? r.category)}${r.provider ? ' · ' + e(r.provider) : ''}${r.facility ? ' · ' + e(r.facility) : ''}${r.fileCount ? ` · ${r.fileCount} page(s) in MedRec` : ''}</p>${r.ai?.summary ? `<p>${e(r.ai.summary)}</p>` : ''}${r.notes ? `<p><b>Notes:</b> ${e(r.notes)}</p>` : ''}${labs ? `<table><tr><th>Test</th><th>Result</th><th>Reference</th></tr>${labs}</table>` : ''}</section>`;
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>MedRec health history</title><style>
body{font:12px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#14211d;margin:32px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
h3{font-size:13px;margin:0}.meta{color:#66746f;margin:2px 0 6px}section{padding:10px 0;border-bottom:1px solid #eee;page-break-inside:avoid}table{border-collapse:collapse;width:100%;margin-top:6px}td,th{border-bottom:1px solid #eee;padding:3px 6px;text-align:left}
.facts td{border:0;padding:2px 12px 2px 0}.alert{color:#b42318;font-weight:600}</style></head><body>
<h1>${e(profile.name)}</h1><p class="meta">Health history from MedRec · generated ${e(generatedAt.toLocaleDateString())} · ${records.length} records · patient-provided, not verified</p>
<h2>Key facts</h2><table class="facts"><tr><td>Date of birth</td><td>${e(profile.dateOfBirth ?? '—')}</td></tr><tr><td>Blood type</td><td>${e(profile.bloodType ?? '—')}</td></tr>
<tr><td>Allergies</td><td class="alert">${list(profile.allergies)}</td></tr><tr><td>Conditions</td><td>${list(profile.conditions)}</td></tr><tr><td>Medications</td><td>${list(profile.medications)}</td></tr></table>
<h2>Records</h2>${rows || '<p>No records yet.</p>'}<p class="meta">Attached page images are kept in MedRec and are not included in this document.</p></body></html>`;
}

/** Printable PDF of the complete history: native share sheet, or the browser's print dialog. */
export async function exportPdf() {
  const [{ profile }, records] = await Promise.all([api.profile(), allRecords()]);
  const html = historyHtml(profile, records);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save or print your health history', UTI: 'com.adobe.pdf' });
}
