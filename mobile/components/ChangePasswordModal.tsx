import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { DragHandle } from './ui/DragHandle';
import { Colors, Spacing, Radii, Typography } from '../constants/theme';

const TEAL = Colors.teal;
const INK = Colors.ink;
const GREEN_LIGHT = Colors.tealLight;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Missing fields', 'Please enter your current and new password.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      Alert.alert('Weak Password', 'New password must include at least one number.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      Alert.alert('Weak Password', 'New password must include at least one uppercase letter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Your password has been changed successfully.');
      handleClose();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with integrated drag handle */}
        <View style={styles.header}>
          <DragHandle />

          <View style={styles.headerContentRow}>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Change Password</Text>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              hitSlop={8}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={TEAL} />
              ) : (
                <Text style={styles.saveBtnText}>Update</Text>
              )}
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.instructions}>
              Enter your current password and create a new secure password with at least 8 characters, one number, and one uppercase letter.
            </Text>

            {/* Current Password */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={MUTED}
                  style={[styles.input, !currentPassword && styles.placeholderInput]}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                  <Ionicons
                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={MUTED}
                  />
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={MUTED}
                  style={[styles.input, !newPassword && styles.placeholderInput]}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={MUTED}
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor={MUTED}
                  style={[styles.input, !confirmPassword && styles.placeholderInput]}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={MUTED}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 15,
    color: MUTED,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: TEAL,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 16,
  },
  instructions: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FCFB',
    borderWidth: 1,
    borderColor: '#D9E7E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: INK,
    padding: 0,
  },
  placeholderInput: {
    fontSize: 12.5,
  },
});
