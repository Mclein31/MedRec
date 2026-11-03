import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { pickAvatar } from '../lib/avatar';
import { api, type Profile } from '../lib/api';
import { messageFor } from '../lib/errors';
import { space } from '../theme';
import { Banner, Button } from './core';
import { Sheet } from './Sheet';

/** Change or remove the profile photo. Reports the updated profile; closes itself on success. */
export function PhotoSheet({
  visible,
  onClose,
  hasPhoto,
  onBusy,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  hasPhoto: boolean;
  onBusy?: (busy: boolean) => void;
  onChange: (profile: Profile) => void;
}) {
  const [error, setError] = useState<{ message: string; settings?: boolean } | null>(null);
  const [busy, setBusy] = useState<'camera' | 'library' | 'remove' | null>(null);

  const run = async (key: 'camera' | 'library' | 'remove') => {
    setError(null);
    try {
      let profile: Profile;
      if (key === 'remove') {
        setBusy(key);
        onBusy?.(true);
        profile = (await api.removeAvatar()).profile;
      } else {
        const blob = await pickAvatar(key);
        if (!blob) return;
        setBusy(key);
        onBusy?.(true);
        profile = (await api.uploadAvatar(blob)).profile;
      }
      onChange(profile);
      onClose();
    } catch (err) {
      if ((err as Error).message === 'CAMERA_DENIED') setError({ message: 'MedRec needs camera access to take your photo. You can allow it in Settings, or choose a photo instead.', settings: true });
      else setError({ message: messageFor(err) });
    } finally {
      setBusy(null);
      onBusy?.(false);
    }
  };

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Profile photo" message="Shown only to you, in MedRec. It's never on your Medical ID or share links.">
      <View style={{ gap: space.md, paddingBottom: space.xs }}>
        {Platform.OS !== 'web' && (
          <Button kind="secondary" icon="camera-outline" label="Take a photo" loading={busy === 'camera'} disabled={!!busy && busy !== 'camera'} onPress={() => void run('camera')} />
        )}
        <Button kind="secondary" icon="image-outline" label="Choose from photos" loading={busy === 'library'} disabled={!!busy && busy !== 'library'} onPress={() => void run('library')} />
        {hasPhoto && <Button kind="danger" icon="trash-can-outline" label="Remove photo" loading={busy === 'remove'} disabled={!!busy && busy !== 'remove'} onPress={() => void run('remove')} />}
        {error && <Banner tone={error.settings ? 'warn' : 'danger'} message={error.message} action={error.settings ? { label: 'Settings', onPress: () => void Linking.openSettings() } : undefined} />}
      </View>
    </Sheet>
  );
}
