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

## 📱 Adaptive Share Hero & Cardless Flat Access History
- **Screen Architecture**: `mobile/app/(tabs)/share.tsx` is organized into three distinct tiers:
  - **Tier 1 (Adaptive Hero)**: Focuses 75% of visual weight on sharing. Transitions between the default `#1976D2` blue generation card and a white living QR preview card with 142px SVG QR code, live clean countdown status (`#159A83`), and immediate access revocation.
  - **Tier 2 (Active Shares)**: Secondary list for active doctor access sessions when not actively previewing a QR code.
  - **Tier 3 (Past Sessions)**: Quiet, borderless activity log sitting directly on `#F4FAF9` canvas with 1px hairline dividers (`#E5F0EE`).
- **Typography-Driven Hierarchy**: Removes repetitive leading icons and pill badges from past sessions; status is communicated with clean right-aligned typography (`Revoked` in `#D92D20`, `Expired` in `#64748B`).
- **Progressive Disclosure**: Automatically shows the 3 most recent sessions, with an expandable `"Show full history"` button when history exceeds 3 items.

## 🎨 Universal AI Card Design System & Record Type Carousel
- **Unified Visual Language**: All AI-powered feature cards (`aiBanner` in `(tabs)/index.tsx`, `generateCard` in `(tabs)/share.tsx`, `aiCard` in `record/[id].tsx`, and `scanHeroCard` in `record/add.tsx`) share a consistent design system:
  - Container: Signature rich blue (`#1976D2`), `borderRadius: 16`, `padding: 16`, `gap: 12`, elevation shadow (`shadowColor: '#1976D2'`, `elevation: 3`).
  - Top Row: Icon (`34×34px` or `36×36px`, direct `#FFFFFF` rendering without highlight background pills) beside bold title (`16px`, `#FFFFFF`) and subtitle (`11px`, `rgba(255,255,255,0.88)`).
  - Primary Action: Clean white CTA button (`backgroundColor: '#FFFFFF'`, `borderRadius: 10`, bold `#111827` typography).
- **Horizontal Record Type Carousel**: Category selection in `mobile/app/record/add.tsx` uses a single-line horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`) with full-bleed negative margins (`marginHorizontal: -20, paddingHorizontal: 20`), preserving immediate visibility for form fields above the fold while maintaining smooth edge-to-edge swiping.

## 📐 Centralized Design Tokens & Reusable UI Component Suite
- **Canonical Design System (`mobile/constants/theme.ts`)**:
  - `Colors`: Central source of truth for `teal` (`#159A83`), `ink` (`#12343B`), `bg` (`#F4FAF9`), `tealLight` (`#DDF5EE`), `cardBg` (`#FFFFFF`), `border` (`#E5F0EE`), `blue` (`#1976D2`), `red` (`#D92D20`), `dragHandle` (`#CBD5E1`), and `backdrop` (`rgba(18, 52, 59, 0.45)`).
  - `Typography`: Pre-configured `LexendDeca` typography styles (`display`, `title1`, `title2`, `sectionHeader`, `body`, `caption`, `button`).
  - `Spacing`: Enforces `screenPadding: 20` (20px standard horizontal gutters) and `tabBarClearance: 110` (110px bottom clearance preventing tab bar overlap).
  - `Radii`: Standard corner radii (`card: 16`, `button: 12`, `pill: 10`, `sheet: 24`).
- **Reusable Component Suite (`mobile/components/ui/`)**:
  - `ScreenHeader.tsx`: Universal top toolbar for tab screens with Burger Menu, dynamic Notification Bell with unread dot, 28px `LexendDeca-Bold` title, and subtitle.
  - `DragHandle.tsx`: Standalone 38×4px `#CBD5E1` pill for all modal sheets.
  - `Button.tsx`: Unified button with haptics, spinner loading, and variant styling (primary, secondary, blue, outline, destructive).
  - `Card.tsx`: Standardized 16px radius container with `#E5F0EE` hairline border.

## 🗂️ Records Screen Layout & Quick Category Carousel
- **Full-Width Search Bar (`mobile/components/records/RecordSearchBar.tsx`)**: Replaces cramped inline inputs with an edge-to-edge search bar featuring live keyword filtering across record titles, notes, and medical categories, complete with a 1-tap clear button.
- **Category Quick Chips Carousel**: Direct single-tap horizontal filter bar (`[ All (14) ] [ Labs (5) ] [ Prescriptions (3) ] ...`) with real-time record distribution counts, eliminating redundant sorting modals and providing instant zero-friction navigation.
- **Classic Card Preservation & De-cluttering**: Retains signature medical cards with category badge, 44px squircle icon box, clinical event date, and folder creation footer, while removing the circular background highlight on the chevron arrow for a clean, cohesive visual hierarchy.

