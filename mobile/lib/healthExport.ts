import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from './api';
import { buildHealthArchive, buildHealthHistoryHtml } from './healthExportData';

export type HealthExportFormat = 'json' | 'pdf';

function downloadJson(contents: string, fileName: string) {
  const objectUrl = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function printHistory(html: string): Promise<void> {
  // Expo's web print implementation prints the current app page. Use a separate
  // document so the browser's Save as PDF contains only the patient's history.
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    frame.title = 'Printable patient health history';
    const cleanup = () => frame.remove();
    frame.onload = () => {
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        cleanup();
        reject(new Error('The printable history could not be opened. Please try another browser.'));
        return;
      }
      printWindow.addEventListener('afterprint', cleanup, { once: true });
      try {
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

export async function exportHealthVault(format: HealthExportFormat): Promise<void> {
  if (Platform.OS !== 'web' && !(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is unavailable on this device. Try exporting from another device.');
  }
  const [profileResponse, recordsResponse] = await Promise.all([api.getProfile(), api.getAllRecords()]);
  const archive = buildHealthArchive(profileResponse, recordsResponse.records);
  const date = archive.exportedAt.slice(0, 10);
  const fileName = `MedRec_${format === 'pdf' ? 'Health_History' : 'Health_Vault'}_${date}.${format}`;

  if (Platform.OS === 'web') {
    if (format === 'json') downloadJson(JSON.stringify(archive, null, 2), fileName);
    else await printHistory(buildHealthHistoryHtml(archive));
    return;
  }

  let uri: string | undefined;
  let generatedPdfUri: string | undefined;
  try {
    if (!FileSystem.cacheDirectory) throw new Error('Export storage is unavailable on this device.');
    uri = `${FileSystem.cacheDirectory}${fileName}`;
    if (format === 'pdf') {
      const printed = await Print.printToFileAsync({ html: buildHealthHistoryHtml(archive) });
      generatedPdfUri = printed.uri;
      await FileSystem.moveAsync({ from: generatedPdfUri, to: uri });
      generatedPdfUri = undefined;
    } else {
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(archive, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    }
    await Sharing.shareAsync(uri, {
      mimeType: format === 'pdf' ? 'application/pdf' : 'application/json',
      UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.json',
      dialogTitle: format === 'pdf' ? 'Save or share your health history' : 'Save or share your health vault archive',
    });
  } finally {
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
    if (generatedPdfUri) await FileSystem.deleteAsync(generatedPdfUri, { idempotent: true }).catch(() => undefined);
  }
}
