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
import { api } from '../lib/api';
import { DragHandle } from './ui/DragHandle';
import { Colors, Radii, ResponsiveLimits } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

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
  const { isTablet, insets, scaleFont } = useResponsive();
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isTablet ? 'overFullScreen' : 'pageSheet'}
      transparent={isTablet}
      onRequestClose={handleClose}
    >
      <View style={[styles.modalRoot, isTablet && styles.modalRootTablet]}>
        {isTablet && (
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        )}
        <KeyboardAvoidingView
          style={[styles.container, isTablet && styles.containerTablet]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header with integrated drag handle */}
          <View style={styles.header}>
            <DragHandle />

            <View style={styles.headerContentRow}>
              <Pressable onPress={handleClose} hitSlop={8} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Text
                style={[
                  styles.headerTitle,
                  { fontSize: scaleFont(16, 14.5, 18) },
                ]}
                maxFontSizeMultiplier={1.35}
              >
                Change Password
              </Text>
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
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 20) + 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.instructions} maxFontSizeMultiplier={1.35}>
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
                    style={[
                      styles.input,
                      { fontSize: scaleFont(14, 13, 15) },
                      !currentPassword && styles.placeholderInput,
                    ]}
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxFontSizeMultiplier={1.35}
                  />
                  <Pressable
                    onPress={() => setShowCurrent(!showCurrent)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}
                  >
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
                    style={[
                      styles.input,
                      { fontSize: scaleFont(14, 13, 15) },
                      !newPassword && styles.placeholderInput,
                    ]}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxFontSizeMultiplier={1.35}
                  />
                  <Pressable
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showNew ? 'Hide password' : 'Show password'}
                  >
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
                    style={[
                      styles.input,
                      { fontSize: scaleFont(14, 13, 15) },
                      !confirmPassword && styles.placeholderInput,
                    ]}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxFontSizeMultiplier={1.35}
                  />
                  <Pressable
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showNew ? 'Hide password' : 'Show password'}
                  >
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  modalRootTablet: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  containerTablet: {
    flex: 0,
    width: '100%',
    maxWidth: ResponsiveLimits.maxFormWidth,
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 36,
    justifyContent: 'center',
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
    minHeight: 36,
    justifyContent: 'center',
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
    borderRadius: Radii.card,
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
    height: 50,
  },
  input: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    color: INK,
    padding: 0,
  },
  placeholderInput: {
    fontSize: 12.5,
  },
  eyeBtn: {
    padding: 6,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
