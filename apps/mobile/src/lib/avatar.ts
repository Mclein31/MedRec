import * as ImagePicker from 'expo-image-picker';

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, exif: false };

/**
 * Lets the user choose a square profile photo. Resolves to the image bytes, or null when they cancel.
 * Throws `CAMERA_DENIED` when camera permission is refused so the caller can point to Settings.
 */
export async function pickAvatar(source: 'library' | 'camera'): Promise<Blob | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('CAMERA_DENIED');
  }
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  return (await fetch(asset.uri)).blob();
}
