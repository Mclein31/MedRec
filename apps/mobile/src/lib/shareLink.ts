import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

/**
 * Opens the system share sheet for a link. Browsers without the Web Share API (most desktops)
 * get the link copied instead. Resolves to what happened so the caller can confirm it.
 */
export async function shareLink(url: string, title?: string): Promise<'shared' | 'copied' | 'dismissed'> {
  const nav = Platform.OS === 'web' ? (globalThis.navigator as Navigator | undefined) : undefined;
  if (Platform.OS === 'web' && !nav?.share) {
    await Clipboard.setStringAsync(url);
    return 'copied';
  }
  try {
    const result = await Share.share(Platform.OS === 'ios' ? { url, title } : { message: url, title });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    // Share sheet unavailable or the user aborted a browser share: copying never loses the link.
    await Clipboard.setStringAsync(url);
    return 'copied';
  }
}
