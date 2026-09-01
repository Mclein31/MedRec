import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { DocumentCamera } from '../../components/camera/DocumentCamera';
import { DocumentPreview } from '../../components/camera/DocumentPreview';
import { AttachedDocumentCard } from '../../components/camera/AttachedDocumentCard';
import { DragHandle } from '../../components/ui/DragHandle';
import { Colors, Radii, ResponsiveLimits, LandscapeTokens } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

// Design Tokens matching MedRec standard palette
const TEAL = Colors.teal;
const GREEN_LIGHT = Colors.tealLight;
const BLUE = Colors.blue;
const INK = Colors.ink;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;

import { RECORD_TYPE_ASSETS, RECORD_TYPE_OPTIONS } from '../../constants/records';

const TYPE_ASSETS = RECORD_TYPE_ASSETS;
const RECORD_TYPES = RECORD_TYPE_OPTIONS;

type ViewMode = 'form' | 'camera' | 'preview';

export default function AddRecordScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Form Fields
  const [type, setType] = useState('consultation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const {
    isTablet,
    isLandscape,
    screenPadding,
    insets,
    scaleFont,
  } = useResponsive();

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Title required', 'Please enter a title for this health record.');
      return;
    }
    setSaving(true);
    try {
      await api.addRecord({
        type,
        title: title.trim(),
        description: description.trim(),
        date,
        attachmentUrl: photoUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Failed to save', err.message || 'Could not save record to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenGallery = async () => {
    try {
      Haptics.selectionAsync();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setTempPhotoUri(selectedUri);
        setViewMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not open photo library.');
    }
  };

  const handleConfirmPhoto = (confirmedUri: string) => {
    setPhotoUri(confirmedUri);
    setTempPhotoUri(null);

    // Auto-suggest a default title if title is currently blank
    if (!title.trim()) {
      const todayFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setTitle(`Scanned Document — ${todayFormatted}`);
    }

    setViewMode('form');
  };

  // ─── 1. CAMERA VIEWPORT ──────────────────────────────────────────────────
  if (viewMode === 'camera') {
    return (
      <DocumentCamera
        onCapture={(uri) => {
          setTempPhotoUri(uri);
          setViewMode('preview');
        }}
        onSelectFromGallery={(uri) => {
          setTempPhotoUri(uri);
          setViewMode('preview');
        }}
        onClose={() => {
          setTempPhotoUri(null);
          setViewMode('form');
        }}
      />
    );
  }

  // ─── 2. PHOTO PREVIEW & QUALITY CHECK ─────────────────────────────────────
  if (viewMode === 'preview' && (tempPhotoUri || photoUri)) {
    return (
      <DocumentPreview
        photoUri={tempPhotoUri || photoUri!}
        onConfirm={handleConfirmPhoto}
        onRetake={() => {
          setViewMode('camera');
        }}
        onCancel={() => {
          setTempPhotoUri(null);
          setViewMode('form');
        }}
      />
    );
  }

  // ─── 3. TABLET LANDSCAPE 2-COLUMN INTAKE STUDIO (PURPOSE-BUILT) ──────────
  if (isTablet && isLandscape) {
    return (
      <View style={styles.tabletRootOverlay}>
        <StatusBar style="light" />

        {/* Backdrop Tap to Dismiss */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal backdrop"
        />

        <View style={styles.landscapeStudioCard}>
          {/* Studio Header Bar */}
          <View style={styles.landscapeHeader}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.landscapeDismissBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel and dismiss"
            >
              <Ionicons name="close" size={20} color={INK} />
            </Pressable>

            <Text style={styles.landscapeHeaderTitle} numberOfLines={1}>
              Add Health Record
            </Text>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.landscapeSaveBtn,
                pressed && styles.pressed,
                saving && styles.disabledBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save medical record"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.landscapeSaveText}>Save Record</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* 2-Column Intake Canvas */}
          <View style={styles.landscapeBodyRow}>
            {/* Left Column (48%): Form Metadata */}
            <KeyboardAvoidingView
              style={styles.landscapeFormCol}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                style={styles.landscapeScroll}
                contentContainerStyle={styles.landscapeFormScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Category Classification */}
                <View style={styles.landscapeSection}>
                  <Text style={styles.landscapeSectionLabel}>RECORD CLASSIFICATION</Text>
                  <View style={styles.landscapeTypeGrid}>
                    {RECORD_TYPES.map((t) => {
                      const active = type === t.value;
                      return (
                        <Pressable
                          key={t.value}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setType(t.value);
                          }}
                          style={({ pressed }) => [
                            styles.landscapeTypeChip,
                            active && styles.landscapeTypeChipActive,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Select record type ${t.label}`}
                          accessibilityState={{ selected: active }}
                        >
                          <Image
                            source={TYPE_ASSETS[t.value]}
                            style={[
                              styles.landscapeTypeChipIcon,
                              { tintColor: active ? TEAL : MUTED },
                            ]}
                          />
                          <Text
                            style={[
                              styles.landscapeTypeChipText,
                              active && styles.landscapeTypeChipTextActive,
                            ]}
                            maxFontSizeMultiplier={1.3}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Structured Metadata Inputs */}
                <View style={styles.landscapeInputsCard}>
                  {/* Title Field */}
                  <View style={styles.landscapeFieldGroup}>
                    <Text style={styles.landscapeFieldLabel}>RECORD TITLE *</Text>
                    <View style={styles.landscapeInputBox}>
                      <Image
                        source={require('../../assets/icons/folder.png')}
                        style={styles.landscapeFieldIcon}
                      />
                      <TextInput
                        style={styles.landscapeTextInput}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Annual Comprehensive Metabolic Panel"
                        placeholderTextColor={MUTED}
                        accessibilityLabel="Record title input"
                        maxFontSizeMultiplier={1.35}
                      />
                    </View>
                  </View>

                  {/* Date of Event */}
                  <View style={styles.landscapeFieldGroup}>
                    <Text style={styles.landscapeFieldLabel}>DATE OF EVENT</Text>
                    <View style={styles.landscapeInputBox}>
                      <Image
                        source={require('../../assets/icons/calendar.png')}
                        style={styles.landscapeFieldIcon}
                      />
                      <TextInput
                        style={styles.landscapeTextInput}
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={MUTED}
                        accessibilityLabel="Date of event input"
                        maxFontSizeMultiplier={1.35}
                      />
                    </View>
                  </View>

                  {/* Clinical Notes & Observations */}
                  <View style={styles.landscapeFieldGroup}>
                    <Text style={styles.landscapeFieldLabel}>CLINICAL NOTES &amp; OBSERVATIONS</Text>
                    <View style={[styles.landscapeInputBox, styles.landscapeTextAreaBox]}>
                      <TextInput
                        style={[styles.landscapeTextInput, styles.landscapeTextArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add clinical findings, provider notes, prescription dosages, or follow-up instructions..."
                        placeholderTextColor={MUTED}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        accessibilityLabel="Clinical notes input"
                        maxFontSizeMultiplier={1.35}
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Right Column (52%): Visual Document Canvas & Guidance */}
            <View style={styles.landscapePreviewCol}>
              <ScrollView
                style={styles.landscapeScroll}
                contentContainerStyle={styles.landscapePreviewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.landscapeSection}>
                  <Text style={styles.landscapeSectionLabel}>DOCUMENT ATTACHMENT</Text>

                  {photoUri ? (
                    <AttachedDocumentCard
                      photoUri={photoUri}
                      accentColor={BLUE}
                      onPressInspect={() => {
                        setTempPhotoUri(photoUri);
                        setViewMode('preview');
                      }}
                      onPressRetake={() => {
                        setViewMode('camera');
                      }}
                      onPressRemove={() => {
                        setPhotoUri(null);
                      }}
                    />
                  ) : (
                    <View style={styles.landscapeScanHeroCard}>
                      <View style={styles.landscapeScanHeroTop}>
                        <View style={styles.landscapeScanIconBox}>
                          <Image
                            source={require('../../assets/icons/AI.png')}
                            style={styles.landscapeScanIcon}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.landscapeScanTitle}>Document Capture</Text>
                          <Text style={styles.landscapeScanSub}>
                            Attach physical lab reports, prescriptions, or discharge summaries
                          </Text>
                        </View>
                      </View>

                      <View style={styles.landscapeScanActions}>
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setViewMode('camera');
                          }}
                          style={({ pressed }) => [
                            styles.landscapeScanPrimaryBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Open document camera"
                        >
                          <Ionicons name="camera" size={18} color={BLUE} />
                          <Text style={styles.landscapeScanPrimaryBtnText}>SCAN WITH CAMERA</Text>
                        </Pressable>

                        <Pressable
                          onPress={handleOpenGallery}
                          style={({ pressed }) => [
                            styles.landscapeGalleryBtn,
                            pressed && styles.pressed,
                          ]}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Choose photo from library"
                        >
                          <Ionicons name="images-outline" size={16} color="rgba(255, 255, 255, 0.95)" />
                          <Text style={styles.landscapeGalleryBtnText}>Choose from Photo Library</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>

                {/* AI Document Intelligence Badge */}
                <View style={styles.landscapeAiBanner}>
                  <Ionicons name="sparkles" size={18} color={Colors.blue} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.landscapeAiBannerTitle}>AI Clinical Assistance</Text>
                    <Text style={styles.landscapeAiBannerText}>
                      Scanned medical document text is automatically analyzed for biomarkers and plain-language translations.
                    </Text>
                  </View>
                </View>

                {/* Sovereign Encryption Guarantee */}
                <View style={styles.landscapeVaultNotice}>
                  <Ionicons name="shield-checkmark" size={15} color={TEAL} />
                  <Text style={styles.landscapeVaultNoticeText}>
                    All document scans are encrypted and stored inside your sovereign health vault.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ─── 4. TABLET PORTRAIT SINGLE-COLUMN INTAKE STUDIO (LOCKED 🔒) ──────────
  if (isTablet) {
    return (
      <View style={styles.tabletRootOverlay}>
        <StatusBar style="light" />

        {/* Backdrop Tap to Dismiss */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal backdrop"
        />

        <KeyboardAvoidingView
          style={styles.tabletKeyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          {/* Centered Floating Content-Driven Studio Card */}
          <View style={styles.tabletStudioCard}>
            {/* Card Embedded Header */}
            <View style={styles.tabletCardHeader}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.tabletHeaderDismissBtn,
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel and dismiss"
              >
                <Ionicons name="close" size={18} color={INK} />
              </Pressable>

              <Text style={styles.tabletHeaderTitle} numberOfLines={1}>
                Add Health Record
              </Text>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.tabletHeaderSaveBtn,
                  pressed && styles.pressed,
                  saving && styles.disabledBtn,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save medical record"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.tabletHeaderSaveText}>Save</Text>
                )}
              </Pressable>
            </View>

            {/* Scrollable Single-Column Content Flow */}
            <ScrollView
              style={styles.tabletScrollBody}
              contentContainerStyle={styles.tabletSingleColContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* 1. Document Attachment / Scan Hero Card */}
              <View style={styles.tabletSection}>
                <Text style={styles.tabletSectionLabel}>DOCUMENT ATTACHMENT</Text>

                {photoUri ? (
                  <AttachedDocumentCard
                    photoUri={photoUri}
                    onPressInspect={() => {
                      setTempPhotoUri(photoUri);
                      setViewMode('preview');
                    }}
                    onPressRetake={() => {
                      setViewMode('camera');
                    }}
                    onPressRemove={() => {
                      setPhotoUri(null);
                    }}
                  />
                ) : (
                  <View style={styles.tabletScanHeroCard}>
                    <View style={styles.tabletScanHeroTopRow}>
                      <View style={styles.tabletScanIconBox}>
                        <Image
                          source={require('../../assets/icons/AI.png')}
                          style={styles.tabletScanIcon}
                        />
                      </View>
                      <View style={styles.tabletScanTextBox}>
                        <Text
                          style={[
                            styles.tabletScanTitle,
                            { fontSize: scaleFont(16, 15, 17.5) },
                          ]}
                          maxFontSizeMultiplier={1.35}
                        >
                          Scan Health Document
                        </Text>
                        <Text
                          style={[
                            styles.tabletScanSub,
                            { fontSize: scaleFont(11.5, 11, 12.5) },
                          ]}
                          maxFontSizeMultiplier={1.35}
                        >
                          Point camera at prescriptions, lab tests, or bills
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tabletScanActions}>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setViewMode('camera');
                        }}
                        style={({ pressed }) => [
                          styles.tabletScanPrimaryBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Scan health document with camera"
                      >
                        <Ionicons name="camera-outline" size={17} color={BLUE} />
                        <Text style={styles.tabletScanPrimaryBtnText}>SCAN WITH CAMERA</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleOpenGallery}
                        style={({ pressed }) => [
                          styles.tabletGalleryBtn,
                          pressed && styles.pressed,
                        ]}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Choose from photo library"
                      >
                        <Ionicons name="images-outline" size={14} color="rgba(255, 255, 255, 0.9)" />
                        <Text style={styles.tabletGalleryBtnText}>Or choose from Photo Library</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Secure Vault Guarantee Notice */}
                <View style={styles.tabletVaultNotice}>
                  <Ionicons name="shield-checkmark" size={14} color={TEAL} />
                  <Text style={styles.tabletVaultNoticeText}>
                    Documents are stored encrypted in your sovereign personal vault.
                  </Text>
                </View>
              </View>

              {/* 2. Section Divider (Matching Phone Flow) */}
              <View style={styles.tabletDividerRow}>
                <View style={styles.tabletDividerLine} />
                <Text style={styles.tabletDividerText}>record details</Text>
                <View style={styles.tabletDividerLine} />
              </View>

              {/* 3. Record Type Selector */}
              <View style={styles.tabletSection}>
                <Text style={styles.tabletSectionLabel}>RECORD TYPE</Text>
                <View style={styles.tabletTypeGrid}>
                  {RECORD_TYPES.map((t) => {
                    const active = type === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setType(t.value);
                        }}
                        style={({ pressed }) => [
                          styles.tabletTypeChip,
                          active && styles.tabletTypeChipActive,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select record type ${t.label}`}
                        accessibilityState={{ selected: active }}
                      >
                        <Image
                          source={TYPE_ASSETS[t.value]}
                          style={[
                            styles.tabletTypeChipIcon,
                            { tintColor: active ? TEAL : MUTED },
                          ]}
                        />
                        <Text
                          style={[
                            styles.tabletTypeChipText,
                            active && styles.tabletTypeChipTextActive,
                            { fontSize: scaleFont(12, 11, 13) },
                          ]}
                          maxFontSizeMultiplier={1.35}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 4. Record Information Form Card */}
              <View style={styles.tabletFormCard}>
                {/* Title Field */}
                <View style={styles.tabletFieldGroup}>
                  <Text style={styles.tabletFieldLabel}>RECORD TITLE *</Text>
                  <View style={styles.tabletInputContainer}>
                    <Image
                      source={require('../../assets/icons/folder.png')}
                      style={styles.tabletFieldLeadingIcon}
                    />
                    <TextInput
                      style={[styles.tabletTextInput, { fontSize: scaleFont(14, 13, 15) }]}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Annual Blood Work & Lipid Panel"
                      placeholderTextColor={MUTED}
                      accessibilityLabel="Record title input"
                      maxFontSizeMultiplier={1.35}
                    />
                  </View>
                </View>

                {/* Date of Event */}
                <View style={styles.tabletFieldGroup}>
                  <Text style={styles.tabletFieldLabel}>DATE OF EVENT</Text>
                  <View style={styles.tabletInputContainer}>
                    <Image
                      source={require('../../assets/icons/calendar.png')}
                      style={styles.tabletFieldLeadingIcon}
                    />
                    <TextInput
                      style={[styles.tabletTextInput, { fontSize: scaleFont(14, 13, 15) }]}
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={MUTED}
                      accessibilityLabel="Date input"
                      maxFontSizeMultiplier={1.35}
                    />
                  </View>
                </View>

                {/* Clinical Notes / Details */}
                <View style={styles.tabletFieldGroup}>
                  <Text style={styles.tabletFieldLabel}>CLINICAL NOTES / DETAILS</Text>
                  <View style={[styles.tabletInputContainer, styles.tabletTextAreaContainer]}>
                    <TextInput
                      style={[
                        styles.tabletTextInput,
                        styles.tabletTextArea,
                        { fontSize: scaleFont(14, 13, 15) },
                      ]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Add doctor notes, dosage, follow-up instructions, or observations..."
                      placeholderTextColor={MUTED}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      accessibilityLabel="Description notes input"
                      maxFontSizeMultiplier={1.35}
                    />
                  </View>
                </View>
              </View>

              {/* 5. Primary Save CTA */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.tabletSaveBtn,
                  pressed && styles.pressed,
                  saving && styles.disabledBtn,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save medical record"
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.tabletSaveBtnText}>Saving Record...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.tabletSaveBtnText}>Save Record</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── 4. PHONE FORM SCREEN (100% LOCKED & UNTOUCHED) ───────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Drag Handle Affordance */}
      <DragHandle />

      {/* Modal Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top > 20 ? insets.top + 4 : 8,
            paddingLeft: Math.max(insets.left, screenPadding),
            paddingRight: Math.max(insets.right, screenPadding),
          },
        ]}
      >
        <View
          style={[
            styles.headerInner,
            isTablet && {
              maxWidth: ResponsiveLimits.maxModalWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerDismissBtn,
              pressed && styles.pressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel and dismiss"
          >
            <Ionicons name="close" size={20} color={INK} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Add Health Record
          </Text>

          <View style={styles.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: screenPadding,
              paddingBottom: Math.max(insets.bottom, 20) + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.formWrapper,
              isTablet && {
                maxWidth: ResponsiveLimits.maxModalWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
          >
            {/* Document Attachment State vs Scan Trigger Card */}
            {photoUri ? (
              <AttachedDocumentCard
                photoUri={photoUri}
                onPressInspect={() => {
                  setTempPhotoUri(photoUri);
                  setViewMode('preview');
                }}
                onPressRetake={() => {
                  setViewMode('camera');
                }}
                onPressRemove={() => {
                  setPhotoUri(null);
                }}
              />
            ) : (
              <View style={styles.scanHeroCard}>
                {/* Top Row: AI Icon + Title & Subtitle */}
                <View style={styles.scanHeroTopRow}>
                  <View style={styles.scanIconBox}>
                    <Image
                      source={require('../../assets/icons/AI.png')}
                      style={styles.scanIcon}
                    />
                  </View>
                  <View style={styles.scanTextBox}>
                    <Text
                      style={[
                        styles.scanTitle,
                        { fontSize: scaleFont(16, 14.5, 18) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Scan Health Document
                    </Text>
                    <Text
                      style={[
                        styles.scanSub,
                        { fontSize: scaleFont(11, 10.5, 12.5) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Point camera at prescriptions, lab tests, or bills
                    </Text>
                  </View>
                </View>

                {/* Action Buttons: Primary Camera CTA + Photo Library */}
                <View style={styles.scanActionsContainer}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setViewMode('camera');
                    }}
                    style={({ pressed }) => [
                      styles.scanPrimaryBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Scan health document with camera"
                  >
                    <Ionicons name="camera-outline" size={17} color={BLUE} />
                    <Text style={styles.scanPrimaryBtnText}>SCAN WITH CAMERA</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleOpenGallery}
                    style={({ pressed }) => [
                      styles.galleryHeroBtn,
                      pressed && styles.pressed,
                    ]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Choose from photo library"
                  >
                    <Ionicons name="images-outline" size={14} color="rgba(255, 255, 255, 0.9)" />
                    <Text style={styles.galleryHeroBtnText}>Or choose from Photo Library</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>record details</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Record Type Carousel */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RECORD TYPE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.typeCarousel,
                  { paddingHorizontal: screenPadding },
                ]}
                style={{ marginHorizontal: -screenPadding }}
              >
                {RECORD_TYPES.map((t) => {
                  const active = type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setType(t.value);
                      }}
                      style={({ pressed }) => [
                        styles.typeChip,
                        active && styles.typeChipActive,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select record type ${t.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Image
                        source={TYPE_ASSETS[t.value]}
                        style={[
                          styles.typeChipIcon,
                          { tintColor: active ? TEAL : MUTED },
                        ]}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          active && styles.typeChipTextActive,
                          { fontSize: scaleFont(12.5, 11, 13.5) },
                        ]}
                        maxFontSizeMultiplier={1.35}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Record Information Form Card */}
            <View style={styles.formCard}>
              {/* Title Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>RECORD TITLE *</Text>
                <View style={styles.inputContainer}>
                  <Image
                    source={require('../../assets/icons/folder.png')}
                    style={styles.fieldLeadingIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { fontSize: scaleFont(14, 13, 15) }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Annual Blood Work & Lipid Panel"
                    placeholderTextColor={MUTED}
                    accessibilityLabel="Record title input"
                    maxFontSizeMultiplier={1.35}
                  />
                </View>
              </View>

              {/* Date of Event */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>DATE OF EVENT</Text>
                <View style={styles.inputContainer}>
                  <Image
                    source={require('../../assets/icons/calendar.png')}
                    style={styles.fieldLeadingIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { fontSize: scaleFont(14, 13, 15) }]}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={MUTED}
                    accessibilityLabel="Date input"
                    maxFontSizeMultiplier={1.35}
                  />
                </View>
              </View>

              {/* Clinical Notes / Details */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CLINICAL NOTES / DETAILS</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textArea,
                      { fontSize: scaleFont(14, 13, 15) },
                    ]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add doctor notes, dosage, follow-up instructions, or observations..."
                    placeholderTextColor={MUTED}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    accessibilityLabel="Description notes input"
                    maxFontSizeMultiplier={1.35}
                  />
                </View>
              </View>
            </View>

            {/* Primary Save CTA */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
                saving && styles.disabledBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save medical record"
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Saving Record...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveBtnText}>Save Record</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  flexOne: {
    flex: 1,
  },

  /* Header */
  header: {
    backgroundColor: BG,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerDismissBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'LexendDeca-Bold',
    fontSize: 17,
    color: INK,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 36,
  },
  pressed: {
    opacity: 0.75,
  },
  disabledBtn: {
    opacity: 0.6,
  },

  /* Scroll Content */
  scroll: {
    paddingTop: 16,
  },
  formWrapper: {
    gap: 16,
  },

  /* Scan Hero Card */
  scanHeroCard: {
    backgroundColor: BLUE,
    borderRadius: Radii.card,
    padding: 16,
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  scanHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  scanTextBox: {
    flex: 1,
    gap: 2,
  },
  scanTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: '#FFFFFF',
  },
  scanSub: {
    fontFamily: 'LexendDeca-Regular',
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
  },
  scanActionsContainer: {
    gap: 8,
    marginTop: 2,
  },
  scanPrimaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scanPrimaryBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12,
    color: '#111827',
    letterSpacing: 0.4,
  },
  galleryHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    minHeight: 32,
  },
  galleryHeroBtnText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
  },

  /* Divider Row */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* Record Type Chips Carousel */
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  typeCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 38,
  },
  typeChipActive: {
    backgroundColor: GREEN_LIGHT,
    borderColor: TEAL,
  },
  typeChipIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  typeChipText: {
    fontFamily: 'LexendDeca-Regular',
    color: INK,
  },
  typeChipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },

  /* Form Card & Inputs */
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBF4F1',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    minHeight: 110,
  },
  fieldLeadingIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: TEAL,
  },
  textInput: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    color: INK,
    padding: 0,
  },
  textArea: {
    minHeight: 85,
    textAlignVertical: 'top',
  },

  /* Save CTA */
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 16,
    height: 52,
    marginTop: 4,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  /* ────────────────────────────────────────────────────────
     TABLET INTAKE STUDIO (SINGLE-COLUMN REFINED MODAL STYLES)
  ──────────────────────────────────────────────────────── */
  tabletRootOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tabletKeyboardAvoider: {
    width: '100%',
    maxWidth: 580,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletStudioCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tabletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F4',
    backgroundColor: '#FFFFFF',
  },
  tabletHeaderDismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletHeaderTitle: {
    flex: 1,
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16.5,
    color: INK,
    textAlign: 'center',
  },
  tabletHeaderSaveBtn: {
    backgroundColor: TEAL,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletHeaderSaveText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  tabletScrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  tabletSingleColContent: {
    padding: 20,
    gap: 16,
    flexGrow: 0,
  },
  tabletSection: {
    gap: 8,
  },
  tabletSectionLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.6,
  },
  tabletScanHeroCard: {
    backgroundColor: BLUE,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  tabletScanHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabletScanIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletScanIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  tabletScanTextBox: {
    flex: 1,
    gap: 2,
  },
  tabletScanTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: '#FFFFFF',
  },
  tabletScanSub: {
    fontFamily: 'LexendDeca-Regular',
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
  },
  tabletScanActions: {
    gap: 6,
  },
  tabletScanPrimaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabletScanPrimaryBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12.5,
    color: BLUE,
    letterSpacing: 0.3,
  },
  tabletGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  tabletGalleryBtnText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabletVaultNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDFAF7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0EFE8',
  },
  tabletVaultNoticeText: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: INK,
    lineHeight: 16,
  },
  tabletDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  tabletDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5F0EE',
  },
  tabletDividerText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tabletTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabletTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FCFB',
    borderWidth: 1,
    borderColor: '#E5F0EE',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tabletTypeChipActive: {
    backgroundColor: '#EDFAF7',
    borderColor: TEAL,
  },
  tabletTypeChipIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  tabletTypeChipText: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
  },
  tabletTypeChipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  tabletFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  tabletFieldGroup: {
    gap: 5,
  },
  tabletFieldLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: INK,
    letterSpacing: 0.4,
  },
  tabletInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FCFB',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  tabletFieldLeadingIcon: {
    width: 15,
    height: 15,
    resizeMode: 'contain',
    tintColor: TEAL,
  },
  tabletTextInput: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    color: INK,
    padding: 0,
  },
  tabletTextAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 84,
    height: 'auto',
  },
  tabletTextArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  tabletSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 14,
    height: 48,
    marginTop: 4,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  tabletSaveBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15.5,
    color: '#FFFFFF',
  },

  /* ────────────────────────────────────────────────────────
     TABLET LANDSCAPE 2-COLUMN INTAKE STUDIO STYLES
  ──────────────────────────────────────────────────────── */
  landscapeStudioCard: {
    width: '94%',
    maxWidth: 1000,
    height: '90%',
    maxHeight: 740,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.sheet,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  landscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F4',
    backgroundColor: '#FFFFFF',
  },
  landscapeDismissBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeHeaderTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: INK,
  },
  landscapeSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  landscapeSaveText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  landscapeBodyRow: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeFormCol: {
    flex: 0.5,
    borderRightWidth: 1,
    borderRightColor: '#F0F5F4',
    backgroundColor: '#FAFDFD',
  },
  landscapePreviewCol: {
    flex: 0.5,
    backgroundColor: '#FFFFFF',
  },
  landscapeScroll: {
    flex: 1,
  },
  landscapeFormScrollContent: {
    padding: 20,
    gap: 16,
  },
  landscapePreviewScrollContent: {
    padding: 20,
    gap: 16,
  },
  landscapeSection: {
    gap: 8,
  },
  landscapeSectionLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  landscapeTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  landscapeTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5F0EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  landscapeTypeChipActive: {
    backgroundColor: '#EDFAF7',
    borderColor: TEAL,
  },
  landscapeTypeChipIcon: {
    width: 15,
    height: 15,
    resizeMode: 'contain',
  },
  landscapeTypeChipText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  landscapeTypeChipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  landscapeInputsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
  },
  landscapeFieldGroup: {
    gap: 5,
  },
  landscapeFieldLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: INK,
    letterSpacing: 0.4,
  },
  landscapeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FCFB',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  landscapeFieldIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: TEAL,
  },
  landscapeTextInput: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13.5,
    color: INK,
    padding: 0,
  },
  landscapeTextAreaBox: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 110,
    height: 'auto',
  },
  landscapeTextArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  landscapeScanHeroCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  landscapeScanHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  landscapeScanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeScanIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  landscapeScanTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  landscapeScanSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  landscapeScanActions: {
    gap: 10,
  },
  landscapeScanPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
  },
  landscapeScanPrimaryBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12.5,
    color: BLUE,
    letterSpacing: 0.5,
  },
  landscapeGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  landscapeGalleryBtnText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  landscapeAiBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  landscapeAiBannerTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12.5,
    color: '#1E40AF',
  },
  landscapeAiBannerText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
    marginTop: 2,
  },
  landscapeVaultNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF9',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  landscapeVaultNoticeText: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: TEAL,
    lineHeight: 16,
  },
});