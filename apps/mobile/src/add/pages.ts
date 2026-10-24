import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../lib/api';
import { messageFor } from '../lib/errors';

export interface Page {
  key: string;
  uri: string;
  kind: 'image' | 'pdf';
  name?: string;
  status: 'uploading' | 'ready' | 'failed';
  fileId?: string;
  error?: string;
}

const MAX_PAGES = 20;

export async function pickFromCamera(): Promise<Page[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('CAMERA_DENIED');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, exif: false });
  return res.canceled ? [] : res.assets.map((a) => ({ key: a.uri, uri: a.uri, kind: 'image', status: 'uploading' }));
}

export async function pickFromLibrary(remaining: number): Promise<Page[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: Math.min(remaining, MAX_PAGES), exif: false });
  return res.canceled ? [] : res.assets.map((a) => ({ key: a.assetId ?? a.uri, uri: a.uri, kind: 'image', status: 'uploading' }));
}

export async function pickPdf(): Promise<Page[]> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
  return res.canceled ? [] : res.assets.map((a) => ({ key: a.uri, uri: a.uri, kind: 'pdf', name: a.name, status: 'uploading' }));
}

/** Uploads one page as a draft. The server checks the bytes; the client type is only a hint. */
export async function uploadPage(page: Page): Promise<Page> {
  try {
    const blob = await (await fetch(page.uri)).blob();
    const { file } = await api.uploadPage(blob);
    return { ...page, status: 'ready', fileId: file.id, error: undefined };
  } catch (err) {
    return { ...page, status: 'failed', error: messageFor(err) };
  }
}

export { MAX_PAGES };
