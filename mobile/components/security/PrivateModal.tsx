import { Modal, ModalProps } from 'react-native';
import { useAppLock } from '../../context/AppLockContext';

// Native modal windows live outside the main React view hierarchy. Hide them
// explicitly while locked, preserving the form state for a successful unlock.
export function PrivateModal(props: ModalProps) {
  const { blocked } = useAppLock();
  return <Modal {...props} visible={props.visible !== false && !blocked} />;
}
