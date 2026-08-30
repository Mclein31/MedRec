---
type: notes
title: MedRecord_App Reference Notes
project: MedRecord_App
tags:
  - notes
  - reference
last_updated: 2026-08-28
---

# 📝 MedRecord_App (MedRec) — Technical Notes

## 📂 MedRec Obsidian Vault Integration
The `MedRecord_App/MedRec/` folder is an existing Obsidian vault with detailed notes across:
- `01 - Vision & Goals/`
- `02 - Problem Space/` (Data silos, lost records, patient ownership)
- `03 - Research/` & `04 - Users/` (Patient and doctor workflows)
- `08 - Technical Architecture/` & `09 - Database/`
- `10 - Security & Privacy/` (Threat models, token revocation, encryption)

## 🔑 Environment Variables Required (`backend/.env`)
- `PORT`: Server port (default `5000`)
- `DATABASE_URL`: PostgreSQL connection URI (`postgresql://user:pass@localhost:5432/medrec`)
- `JWT_SECRET`: High-entropy string for signing user session tokens
- `OPENAI_API_KEY`: API key for medical summarization and explanations

## 📷 Document Camera & Gallery Ingestion
- `expo-camera` (`CameraView`) is configured with `facing="back"`, `enableTorch`, and unmounts cleanly on view transitions.
- `expo-image-picker` provides gallery import via `launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })`.
- Captured and imported images reside strictly within the application's sandboxed local cache and are never saved to the public camera roll.
- All form inputs in `add.tsx` are managed at the top-level parent component to prevent data loss when switching between form, camera, and preview view modes.
- The Scan Health Document hero card uses signature AI blue (`#1976D2`) for visual cohesion with AI insights, while record metadata chips and save CTAs maintain the core healthcare green palette (`#159A83`).

## 🧭 Drawer Menu Architecture
- The menu is rendered as an overlay Modal (`SideMenuModal`) with hardware-accelerated translation (`useNativeDriver: true`) rather than a full React Navigation drawer container, avoiding gesture conflicts with iOS screen pops and bottom tab switching.
- Menu rows (`SideMenuItem`) are strictly text-only, utilizing typography (`Lexend Deca`) and padding to maintain visual hierarchy.
- Header branding directly reuses the existing official asset `assets/logo/logo.png`.

## 🔔 Notification Center Architecture
- **Event Sources**: Server controllers trigger automatic notification creation on record logging, temporary QR token generation/revocation, security/emergency edits, and AI summaries.
- **Privacy Standard**: Two-tier model ensures notification summaries contain actionable context while completely omitting sensitive clinical values, drug dosages, or diagnoses.
- **Modal Affordance**: Rendered as a slide-up sheet (`presentationStyle="pageSheet"`) with a centered grey drag handle (`#D1D5DB`, `38×4px`, `borderRadius: 2`) integrated into the header card with compact vertical spacing to indicate downward swipe dismissal.
- **State & Deep Linking**: Optimistic read-state handling via `NotificationContext` with automatic routing to relevant records (`/record/[id]`), shares (`/(tabs)/share`), or profile screens (`/(tabs)/profile`).

## 👤 Profile Tab & Avatar Ingestion
- **Inset Grouped Architecture**: Designed without heavy card borders or saturated background highlights. Utilizes clean white containers (`#FFFFFF`, `borderRadius: 16`, `borderColor: '#E5F0EE'`) with `#F0F5F4` hairline dividers.
- **Avatar Selection & Cropping**: Uses `expo-image-picker` (`launchImageLibraryAsync`) with `aspect: [1, 1]`, `allowsEditing: true`, and `quality: 0.7`. Directly invokes native iOS `PHPickerViewController` without requiring pre-flight permissions.
- **Database Persistence & Session Sync**: Stores image payload in `user_profiles.avatar_url` (PostgreSQL `TEXT` column) and propagates into `AuthContext` on launch via parallel `api.getMe()` and `api.getProfile()` calls.
- **Native Linkage**: CocoaPods dependency `ExpoImagePicker (17.0.11)` linked in `mobile.xcworkspace` with iOS `NSPhotoLibraryUsageDescription` in `Info.plist`. Express JSON parser configured with `limit: '10mb'`.
- **Bottom Navigation State**: Tab layout (`_layout.tsx`) renders the circular user avatar (`28×28px`, `cover`, `borderRadius: 14`, with 1.5px `#159A83` teal border when active) whenever `user?.avatarUrl` exists, and seamlessly falls back to default `profile-active.png` and `profile-inactive.png` icons when no photo is uploaded.
- **Input Placeholder Sizing**: All profile edit and password input fields use conditional `fontSize: 12.5` for empty placeholder states to comfortably accommodate lengthy clinical examples (e.g. penicillin allergies, asthma medications, address lines) without clipping, switching to standard `14px` when populated with user text.

## 🪟 Sliding Sheet & Drag Handle Architecture
- **Standard Dimensions**: All pageSheet and slide-up modals (`NotificationCenterModal`, `ProfileEditModal`, `ChangePasswordModal`, `EmergencyIdModal`, `add.tsx`, `scan.tsx`, `index.tsx`) utilize a standardized drag handle (`width: 38`, `height: 4`, `borderRadius: 2`, `backgroundColor: '#D1D5DB'`).
- **Header Layout**: Integrated at the top of modal headers with `paddingTop: 10, paddingBottom: 14` to communicate swipe-down dismissibility without adding dead vertical space.
- **Drawer Exception**: The side menu drawer (`SideMenuModal`) slides horizontally from the left edge and is intentionally excluded from vertical downward drag handles.

## 🎨 Universal AI Card Design System & Record Type Carousel
- **Unified Visual Language**: All AI-powered feature cards (`aiBanner` in `(tabs)/index.tsx`, `generateCard` in `(tabs)/share.tsx`, `aiCard` in `record/[id].tsx`, and `scanHeroCard` in `record/add.tsx`) share a consistent design system:
  - Container: Signature rich blue (`#1976D2`), `borderRadius: 16`, `padding: 16`, `gap: 12`, elevation shadow (`shadowColor: '#1976D2'`, `elevation: 3`).
  - Top Row: Icon (`34×34px` or `36×36px`, direct `#FFFFFF` rendering without highlight background pills) beside bold title (`16px`, `#FFFFFF`) and subtitle (`11px`, `rgba(255,255,255,0.88)`).
  - Primary Action: Clean white CTA button (`backgroundColor: '#FFFFFF'`, `borderRadius: 10`, bold `#111827` typography).
- **Horizontal Record Type Carousel**: Category selection in `mobile/app/record/add.tsx` uses a single-line horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`) with full-bleed negative margins (`marginHorizontal: -20, paddingHorizontal: 20`), preserving immediate visibility for form fields above the fold while maintaining smooth edge-to-edge swiping.
