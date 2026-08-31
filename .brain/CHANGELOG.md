---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-08-31
---

# 📜 MedRecord_App (MedRec) — Changelog

## [1.0.0] — Approved Tablet & iPad UI Redesign (Master-Detail, Persistent Sidebar, Split Workspaces)
- **Zero Phone UI Regression (100% Locked & Isolated)**: Strictly quarantined all tablet layouts behind `isTablet` ternary checks, preserving the existing phone UI pixel-for-pixel across all phone form factors.
- **Adaptive Tablet Navigation Architecture**:
  - **Landscape Persistent Left Sidebar (`isTablet && isLandscape`, 260pt)**: Pinned left sidebar (`TabletPersistentSidebar.tsx`) with patient avatar card, main tab routes, "+ Add Health Record" CTA, AI Health summary trigger, Emergency Medical ID trigger, JSON vault export, and Sign Out.
  - **Portrait Floating Centered Pill Navbar (`isTablet && !isLandscape`)**: Clamped floating pill navbar (`maxWidth: 480`, `height: 68`, `borderRadius: 24`).
- **Auth Flow 2-Column Split & Centered Forms (`login.tsx`, `register.tsx`)**:
  - **Landscape Tablet**: 2-column split with Brand/Value-prop Showcase hero on left (75×75 logo mark, sovereign trust guarantees) and bounded 480pt form card on right.
  - **Portrait Tablet**: Centered bounded form card (`maxWidth: 480`) with top brand hero.
- **Records Dashboard Master-Detail Split Workspace (`app/(tabs)/index.tsx`)**:
  - **Landscape Tablet**: Interactive 2-column split workspace:
    - **Master Column (380pt)**: Search input, category filter carousel chips, multi-select action banner, and records list with active item selection state.
    - **Detail Column (Flex 1)**: Live inline document preview with tap-to-inspect zoom modal, clinical notes card, AI Medical Insights card with 1-tap regenerate button (`api.explain`), and delete record CTA.
  - **Portrait Tablet**: 2-column Bento Grid (`numColumns={2}`) with category chips and search.
- **Record Intake 2-Column Studio (`app/record/add.tsx`)**:
  - Centered 880pt bounded 2-column Intake Studio on tablet (Left: Document scan / attachment card with retake/replace; Right: Record type chips, title, date, notes, and primary Save CTA).
- **Sharing Center 2-Column Hub (`app/(tabs)/share.tsx`)**:
  - Centered 920pt bounded 2-column Sharing Hub on tablet (Left: 220×220 Living QR hero card with live timer and instant revoke CTA; Right: Active Doctor Sessions & Past Share History timeline).
- **Doctor Scanner Master-Detail Workspace (`app/(tabs)/scan.tsx`)**:
  - Clamped 320×320 viewfinder in camera mode; Interactive Master-Detail split pane in loaded records mode (Left: Authorized records list; Right: Selected record full details & clinical notes inline).
- **Patient Profile Inset Grouped Bento Layout (`app/(tabs)/profile.tsx`)**:
  - 2-column bento layout on tablet with sidebar clearance offset (Left: Profile hero + Emergency & Medical ID; Right: Personal Demographics + Security Preferences + Legal/Account).
- **Centered Floating Modals**: All modals (`ProfileEditModal`, `EmergencyIdModal`, `ChangePasswordModal`, `NotificationCenterModal`) clamped with `maxWidth: 560-640pt`, dark backdrop dismiss, and paired 2-column form rows.
- **Review Hardening & Precision Polish**:
  - Enforced explicit `'UTC'` timezone flag in `app/record/[id].tsx` date formatting to eliminate day-shift anomalies across negative UTC offset devices.
  - Reset `detailExplanation` state on record selection switch in landscape Master-Detail view (`app/(tabs)/index.tsx`).
  - Added active interval ticker (`15s`) in `app/(tabs)/share.tsx` to maintain accurate living QR expiry countdown on static tablet displays.
  - Formatted dedicated floating modal for AI Health Summary in `TabletPersistentSidebar.tsx` with clinical disclaimer and scrollable synthesis card.
  - Refined "Add Health Record" tablet modal into a content-driven floating studio card (`maxWidth: 820pt`) with `transparentModal` presentation and dimmed backdrop dismiss, eliminating trailing native white sheet space while maintaining 2-column ergonomics and 100% phone modal isolation.

## [0.9.5] — Burger Navigation Drawer UI/UX Architecture & Scannability Upgrade
- **Dual-Coded Iconography**: Added 18×18 icons housed in dedicated 32×32 squircle containers (`#DDF5EE` teal for clinical tools, `#EBF3FB` blue for scan, `#F1F5F9` slate for data, `#FEF3F2` red for destructive logout), increasing visual search velocity.
- **Interactive Patient Demographic Card**: Upgraded user section to a 38×38 avatar/monogram card displaying patient name, email, and trailing chevron affordance linking directly to `/(tabs)/profile`.
- **Cognitive Section Chunking**: Structured navigation items into `CLINICAL TOOLS` and `DATA & VAULT` groups with subtle 10.5pt uppercase headers (`letterSpacing: 0.8`), eliminating harsh divider lines.
- **Active Route Highlighting Parity**: Implemented `isRouteActive` helper supporting Expo Router route variations (`/share`, `/scan`, `/profile`, `/`), styling active rows with `#F0F9F7` surface fill, `#159A83` bold label, and a 3.5px solid teal left vertical indicator pill.
- **Responsive Geometry & Accessibility**: Clamped phone drawer width to `Math.min(width * 0.80, 310)` (preserving ≥ 20% backdrop for thumb dismiss) and tablet drawer width to `Math.min(width * 0.42, 360)` with full WCAG 2.2 AA accessibility states (`accessibilityRole="button"`, `accessibilityState={{ selected: active }}`, `maxFontSizeMultiplier={1.3}`).
- **Pinned Footer & Version Stamp**: Pinned destructive Sign Out row and non-interactive `MedRec v1.0.0 • Sovereign Health Vault` micro-caption to the bottom safe area.

## [0.9.4] — Codebase Modernization, Dead Code Elimination & Architecture Consolidation
- **Domain Types & Category Map Centralization**: Created canonical `mobile/types/record.ts` (`MedicalRecord`, `RecordSection`) and `mobile/constants/records.ts` (`RECORD_TYPE_ASSETS`, `RECORD_TYPE_LABELS`, `CATEGORY_FILTERS`, `RECORD_TYPE_OPTIONS`), eliminating duplicate type declarations and asset dictionaries across 6+ screen files.
- **Shared Date & Age Utilities**: Created `mobile/utils/dateUtils.ts` containing pure, tested formatters (`calculateAge`, `formatDateLong`, `formatDateShort`, `formatTimeAgo`) with explicit UTC timezone flags, replacing copy-pasted date parsing in profile, emergency ID, records dashboard, and detail views.
- **Auth Bootstrap Deduplication**: Consolidated user state resolution in `mobile/context/AuthContext.tsx` by eliminating redundant `Promise.all([api.getMe(), api.getProfile()])` blocks in favor of `refreshUser()`.
- **API Client Generics**: Added `<T = any>` response typing to `request()` in `mobile/lib/api.ts` for type-safe API communication.
- **Dead Code & Template Pruning**: Safely removed 14 unused Expo starter boilerplate files (~1,800 lines of dead code), legacy boilerplate theme objects, and unreferenced packages (`@react-navigation/elements`, `expo-symbols`).
- **Render Performance**: Stabilized `keyExtractor` across `FlatList` components in records dashboard, scan viewer, and notification center modal.

## [0.9.3] — Login & Register Visual Design Restoration & Safe-Area Header Alignment
- **Login Visual Design Restoration (`01acaad`)**: Restored the canonical 320pt hero graphic with 75×75pt brand logo mark, 24pt bold wordmark, 30pt "Welcome Back!" title, 57.5pt input rows, primary teal CTA, Google sign-in card, and outlined "Create an Account" action.
- **Top Safe-Area Branding Alignment**: Adjusted `brandRow` in `login.tsx` to anchor at the top of the hero header (`top: insets.top > 0 ? insets.top + 5 : 40`, `left: -20`), providing seamless hardware notch/status bar clearance.
- **Register Visual Design Restoration (`0b579ad`)**: Restored the 210pt pure hero graphic banner with image transform (`translateY: 60`, `scale: 1.03`), 30pt "Create your Account" title, 57.5pt input rows, and bottom "Already have an Account? Sign In" transition row without extraneous header branding.
- **Preserved Core Security & Functionality**: Maintained active 5-attempt lockout countdown (`30s`), strict password complexity validation (min 8 chars, numbers, uppercase), and `useResponsive` integration.

## [0.9.2] — Global Header Toolbar & Notification Dot Alignment
- **Universal Toolbar Button Geometry**: Standardized top toolbar touch targets across all tab views (`Records`, `Profile`, `Share`, `Scan`, and `ScreenHeader.tsx`) with `padding: 4`, `minWidth: 40`, `minHeight: 40`, and `25×25px` icon containment.
- **Consistent Notification Dot Offsets**: Harmonized active notification dot badge dimensions and positioning to `right: 8`, `top: 5`, `width: 10`, `height: 9`, `borderRadius: 5` across all screens and camera overlay headers.
- **Top Safe-Area Alignment**: Unified `cameraTopBar` and `ScreenHeader` top padding to `insets.top + 12` with interactive haptic feedback (`Haptics.selectionAsync()`) on bell triggers.

## [0.9.1] — Automated Startup Database Migration Guard & Schema Synchronization
- **Startup Migration Execution**: Integrated programmatic `runMigrations()` in `server.js` to automatically verify database catalog alignment and execute non-destructive schema migrations upon every service boot.
- **Idempotent Column Alterations**: Added explicit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` clauses in `schema.sql` for all recently evolved entities: `medical_records.attachment_url`, `user_profiles.avatar_url`, `user_profiles.height`, `user_profiles.weight`, `user_profiles.organ_donor`, `shared_access.allowed_types`, and `shared_access.record_ids`.
- **Eliminated Undefined Column Errors**: Resolved runtime PostgreSQL 42703 exceptions (`column "attachment_url" of relation "medical_records" does not exist`) by executing live migrations across development and production PostgreSQL instances.

## [0.9.0] — App-Wide Responsive Architecture & Clinical Data Integrity Pass
- **Partial Profile Upsert Isolation**: Re-architected `profileModel.js` and `profileController.js` to dynamically update only explicitly provided fields, preventing demographic updates from overwriting emergency medical ID baselines (blood type, allergies, emergency contacts) and vice versa.
- **Physical Metrics Support**: Added `height VARCHAR(20)` and `weight VARCHAR(20)` to `user_profiles` schema, controllers, and profile edit forms with persistent storage and display.
- **Medical Record Attachments**: Added `attachment_url TEXT` to `medical_records` schema, accepted `attachmentUrl` in record creation endpoints, and rendered attached document / scanned photos in Record Details (`record/[id].tsx`).
- **Dynamic API Base URL Resolution**: Replaced hardcoded local hostname with `process.env.EXPO_PUBLIC_API_URL` and cross-platform fallback (`10.0.2.2:4000` for Android, `localhost:4000` for iOS/Web).
- **Auth Revocation Performance**: Removed per-request write locks (`DELETE`) from `tokenModel.isRevoked` to eliminate database contention on authenticated read requests.
- **Enhanced Rate Limiting**: Added rate limiting middleware to sensitive endpoints (`PUT /profile/password`, `POST /share`, `GET /share/:token`).
- **Development Postgres SSL**: Configured SSL in `db.js` to automatically disable in local/test environments unless explicitly set.
- **App-Wide Responsive UI**: Comprehensive adaptive layout across compact phones, standard phones, and tablets with stepped typography bounds, 2-column bento grids on tablets, floating pill tab bar, and centered modal sheets.

## [0.8.7] — Continuous Scrollable Profile Architecture
- **Continuous Scroll Surface**: Refactored the Profile screen (`mobile/app/(tabs)/profile.tsx`) so that the "Profile" title and subtitle scroll away naturally with the profile content inside a single continuous `<ScrollView>`, significantly increasing usable vertical viewport height.
- **Fixed Global Navigation Toolbar**: Preserved the fixed top header containing the Burger Menu drawer trigger and Notification Bell with dynamic unread indicator dot directly under the safe area.
- **Clean Safe-Area Clearance**: Retained 110px bottom navigation clearance and verified zero nested scrolling or layout jumps across sections.

## [0.8.6] — Records Screen Layout Overhaul & Quick Category Carousel
- **Full-Width Search Bar**: Replaced cramped header search input with a prominent full-width `<RecordSearchBar />` supporting instant real-time filtering and clear (X) reset.
- **Category Quick Chips Carousel**: Enhanced horizontal category filter row with dynamic, live record distribution count badges (e.g., `All (14)`, `Labs (5)`, `Prescriptions (3)`), allowing immediate 1-tap filtering without repetitive modals.
- **Clean Card Chevron Presentation**: Preserved signature classic record cards while removing the circular background highlight tint from the right chevron arrow for a calmer, cleaner aesthetic.
- **Enhanced Top Toolbar & Multi-Select**: Added an explicit "Select" toolbar toggle button alongside row long-press for multi-record QR sharing, with floating "Share Selected" CTA button.

## [0.8.5] — App-Wide UI/UX Consistency Pass & Design System Centralization
- **Centralized Design System**: Overhauled `mobile/constants/theme.ts` with comprehensive canonical tokens:
  - `Colors`: Canonical teal (`#159A83`), ink (`#12343B`), mint/light (`#DDF5EE`), canvas (`#F4FAF9`), surface (`#FFFFFF`), border (`#E5F0EE`), AI blue (`#1976D2`), alert red (`#D92D20`), and modal affordance colors.
  - `Typography`: Pre-configured `LexendDeca` typography styles (`display`, `title1`, `title2`, `sectionHeader`, `body`, `caption`, `button`).
  - `Spacing`: Standardized grid tokens with `screenPadding: 20` and `tabBarClearance: 110`.
  - `Radii`: Standardized component border radii (`card: 16`, `button: 12`, `pill: 10`, `sheet: 24`).
- **Unified Reusable UI Suite (`mobile/components/ui/`)**:
  - `ScreenHeader.tsx`: Universal top toolbar for all tab roots with Burger Menu (left drawer trigger), Notification Bell with dynamic unread indicator dot, 28px `LexendDeca-Bold` title, and subtitle.
  - `DragHandle.tsx`: Standardized 38×4px `#CBD5E1` pill affordance for sliding sheet modals.
  - `Button.tsx`: Unified multi-variant button component with haptic feedback, loading state, and consistent touch targets (48px height, 12px radius).
  - `Card.tsx`: Standardized 16px radius card container with `#E5F0EE` hairline border.
- **Resolved Color Divergences**: Replaced divergent non-canonical greens (`#1D9E75`, `#085041`, `#f0f7f4`) in `mobile/app/(tabs)/scan.tsx` with canonical MedRec tokens (`#159A83`, `#12343B`, `#F4FAF9`).
- **Standardized Screen Geometries**: Harmonized horizontal padding to universal `20px` (`Spacing.screenPadding`) across `index.tsx`, `share.tsx`, `scan.tsx`, `profile.tsx`, `record/[id].tsx`, and `record/add.tsx`, and enforced `110px` tab clearance across all scroll containers.
- **Universal Modal Drag Handles**: Standardized modal sheet handles with `<DragHandle />` across `ProfileEditModal`, `ChangePasswordModal`, `EmergencyIdModal`, `NotificationCenterModal`, `add.tsx`, and `index.tsx` sort sheet.
- **Redesigned**: Restructured the Share Records tab (`mobile/app/(tabs)/share.tsx`) using the Adaptive Hero and Cardless Flat Timeline architecture:
  - **Tier 1 (Adaptive Hero)**: Dynamically transitions between the primary blue generation hero card (`#1976D2`) with horizontal QR icon and the living white QR preview card (`#FFFFFF`, `QRCode` 142px) with clean countdown text and instant revocation action.
  - **Tier 2 (Active Shares)**: Displays secondary live doctor access sessions with active timers and one-tap QR inspection.
  - **Tier 3 (Past Sessions)**: Replaced repetitive individual multi-border cards and enterprise audit ledgers with a calm, unboxed typography list rendered directly on the `#F4FAF9` canvas, separated by 1px hairline dividers (`#E5F0EE`).
- **Streamlined**: Eliminated repetitive 39px QR icons, drop shadows, and heavy pill badges on historical entries in favor of clean, right-aligned status typography (`Revoked` in soft red `#D92D20`, `Expired` in muted slate `#64748B`).
- **Progressive Disclosure**: Implemented automatic collapsing for long history feeds, displaying up to 3 past sessions by default with an expandable `"Show full history (N sessions)"` toggle.

## [0.8.3] — Unified Blue AI Cards, Share Card Restructure & Record Type Carousel
- **Restructured**: Redesigned the "Share your records with your Doctor" card in `mobile/app/(tabs)/share.tsx` into a balanced horizontal top row layout (`generateTopRow`, `flexDirection: 'row', alignItems: 'center', gap: 12`) pairing the white QR icon (`qr-white.png`) beside the title with responsive `flex: 1` text wrapping, expiration notice underneath, and full-width white CTA at bottom.
- **Unified**: Standardized all AI feature cards (`mobile/app/record/[id].tsx` AI Medical Insights, `mobile/app/record/add.tsx` Scan Health Document, and `mobile/app/(tabs)/share.tsx` Share Card) to use the signature `#1976D2` blue background, white typography, white action CTA buttons, and direct icon rendering with all background highlight pills removed.
- **Streamlined**: Converted the multi-line record type selector grid in `mobile/app/record/add.tsx` into a single-line horizontal scrolling carousel (`ScrollView horizontal`, `showsHorizontalScrollIndicator={false}`) with edge-to-edge full-bleed padding, reducing vertical height above the fold and improving form accessibility.

## [0.8.2] — Universal Sliding Modal Drag Handles & Profile Input Placeholder Refinement
- **Standardized**: Implemented universal subtle grey drag handle affordance (`38×4px`, `borderRadius: 2`, `#D1D5DB`, `marginBottom: 12`) across all sliding sheets/modals in the application:
  - `ProfileEditModal.tsx` (Demographics & Medical ID editing)
  - `ChangePasswordModal.tsx` (Security & Password change)
  - `EmergencyIdModal.tsx` (First Responder Emergency ID)
  - `mobile/app/record/add.tsx` (Add Health Record form)
  - `mobile/app/(tabs)/index.tsx` (Filter & Sort Records sheet)
  - `mobile/app/(tabs)/scan.tsx` (Shared Record Inspection sheet)
- **Refined**: Adjusted placeholder font size across all Profile edit and password change input fields to a lighter, more compact `12.5px` (`fontSize: 12.5`), ensuring long medical prompts fit cleanly while entered text retains standard `14px` clarity.

## [0.8.1] — Add Record Scan Hero Blue AI Theming
- **Updated**: Styled the "Scan Health Document" hero card in `mobile/app/record/add.tsx` with signature AI blue (`#1976D2`), matching the AI Health Summary card on the Records tab and AI Medical Insights on Record Details.
- **Retained**: Preserved the standard healthcare green/teal palette (`#159A83` / `#DDF5EE`) across record type chips, form field icons, primary Save CTA button, and attached document cards.

## [0.8.0] — Profile Tab Modernization, Avatar Upload & Persistent Storage
- **Redesigned**: Rebuilt `mobile/app/(tabs)/profile.tsx` with an iOS-inspired Inset Grouped architecture, removing visual clutter, outer card containers, and heavy background highlights behind text (e.g. red blood pills, green action icon boxes, full-width red logout buttons).
- **Added**: Unboxed Profile Hero with centered 72×72px avatar, 20px patient name, 13px muted email, single-line bullet metadata summary, and understated "Edit Profile" link.
- **Added**: 4 clean Inset Grouped Cards (`borderRadius: 16`, `borderColor: '#E5F0EE'`) with hairline row dividers (`#F0F5F4`):
  - *Emergency & Medical ID*: Blood Type, Known Allergies, Chronic Conditions, Maintenance Meds, Primary Emergency Contact with 1-tap dial, and First Responder Digital QR ID.
  - *Personal Information*: Date of Birth (with calculated age), Biological Sex, Phone Number, and Address.
  - *Security & Preferences*: Active QR Shares, Change Password, Export Health Vault (JSON Archive), Biometric App Unlock toggle, Push Notifications toggle, and About MedRec & Disclaimer.
  - *Account Actions & Footer*: Clean Sign Out row and subtle, centered Delete Account & Health Vault link.
- **Added**: Interactive profile photo upload using `expo-image-picker` with camera badge affordance, 1:1 square crop, direct `PHPickerViewController` invocation, and immediate preview.
- **Added**: Dynamic bottom navigation Profile tab avatar displaying the user's uploaded circular image (`28×28px`, `cover`, `borderRadius: 14`, with 1.5px `#159A83` active border), falling back to default `profile-active.png`/`profile-inactive.png` icons when no photo exists.
- **Added**: Global `avatarUrl` session state in `AuthContext` with parallel backend hydration (`api.getMe()` + `api.getProfile()`) across navigation and app restarts.
- **Added**: Backend `avatar_url` database column in PostgreSQL `user_profiles` table, left-joined lookups in `userModel.js`, controller handling in `authController.js` and `profileController.js`, and test coverage in `profile.test.js`.
- **Linked**: Integrated `ExpoImagePicker (17.0.11)` and `EXImageLoader (6.0.0)` into CocoaPods (`mobile/ios/Podfile.lock`), added `NSPhotoLibraryUsageDescription` in `Info.plist`, and increased Express JSON limit to `10mb`.

## [0.7.0] — Privacy-Conscious In-App Notification Center & Modal Refinement
- **Added**: Interactive notification bell trigger and dynamic unread badge dot across Records Overview (`index.tsx`) and Share Center (`share.tsx`).
- **Added**: In-App Notification Center modal (`NotificationCenterModal.tsx`) with segmented filter tabs (All / Unread), pull-to-refresh, 1-tap batch read action, and reassuring empty state.
- **Added**: Subtle neutral grey drag handle affordance (`38×4px`, `borderRadius: 2`, `#D1D5DB`) integrated directly into the header card with compact vertical spacing for clear swipe-down dismiss guidance.
- **Added**: Categorized notification card components (`NotificationCard.tsx`) with high-contrast icon badges, relative timestamps, and one-tap deep linking to records (`/record/[id]`), active sharing (`/(tabs)/share`), emergency profile (`/(tabs)/profile`), or AI summaries.
- **Added**: Global notification state provider (`NotificationContext.tsx`) with optimistic local updates and server synchronization.
- **Added**: Backend notification engine with PostgreSQL `notifications` table, indexed queries, authenticated REST API routes (`/notifications`), and automated event triggers on record creation, share generation/revocation, security updates, and AI summarization.

## [0.6.0] — Functional Burger Navigation & Text-Only Menu Refinement
- **Added**: Reusable left-slide navigation drawer (`mobile/components/menu/SideMenuModal.tsx`) with hardware-accelerated translation, backdrop fade, and dismiss gestures.
- **Added**: Text-only navigation row component (`mobile/components/menu/SideMenuItem.tsx`) using pure typography (`Lexend Deca`), spacious padding, and subtle active highlights rather than icons or emojis.
- **Added**: Authentic MedRec app logo branding (`assets/logo/logo.png`) and user demographic summary in the drawer header.
- **Added**: Comprehensive destination routing to Home/Records (`/(tabs)`), Share (`/(tabs)/share` with active shares badge), Doctor QR Scanner (`/(tabs)/scan`), Add Record (`/record/add`), Profile (`/(tabs)/profile`), Emergency Medical ID (`/(tabs)/profile`), AI Health Summary, Vault JSON Export, About MedRec with clinical disclaimers, and secure Sign Out.
- **Connected**: Universal top toolbar burger icon triggers across Records (`index.tsx`), Share (`share.tsx`), and Scanner (`scan.tsx`).

## [0.5.0] — Camera & Document Scanning Experience Redesign
- **Added**: Modular camera subsystem in `mobile/components/camera/` (`DocumentCamera.tsx`, `DocumentPreview.tsx`, `ViewfinderOverlay.tsx`, `CameraControls.tsx`, `AttachedDocumentCard.tsx`).
- **Added**: 3:4 aspect ratio document viewfinder overlay with darkened vignette mask (`rgba(10, 18, 17, 0.62)`), high-contrast rounded teal corner guides (`#159A83`), and an animated scanning indicator.
- **Added**: Essential document camera controls including Flash/Torch toggle (`enableTorch`), dual-ring tactile shutter button with haptic feedback (`Haptics.impactAsync`), and visual shutter flash animation.
- **Added**: Photo Library / Gallery alternative button (`expo-image-picker`) in both the camera viewport and Add Record hero card for importing existing records.
- **Added**: Dedicated Document Preview screen with mandatory quality/legibility self-check prompt (*"Is this document legible?"*), Retake button, and Confirm ("Use Document") button.
- **Added**: In-form Attached Document Card with 64×64px thumbnail, zoom preview trigger, retake/replace action, and destructive delete with confirmation.
- **Improved**: Refactored `mobile/app/record/add.tsx` into a clean controller, ensuring form fields (`title`, `date`, `description`, `type`) persist reliably across camera transitions.
- **Added**: Auto-suggested title formatting (`Scanned Document — <Date>`) when confirming a captured document into an empty form.
- **Added**: Camera permission denial recovery flow with direct deep-linking to system settings (`Linking.openSettings()`).

## [0.4.0] — Profile Tab, Emergency Medical ID & Data Governance
- **Added**: Complete native Profile tab (`app/(tabs)/profile.tsx`) with user initials avatar, demographic details, and quick metrics badges.
- **Added**: Emergency Medical ID card & modal (`components/EmergencyIdModal.tsx`) featuring Blood Type, life-critical allergy highlights, chronic conditions, maintenance medications, and 1-tap direct dial for primary emergency contacts.
- **Added**: Offline-scannable First Responder QR code encoding vital clinical facts for zero-friction emergency triage.
- **Added**: In-place edit modal (`components/ProfileEditModal.tsx`) for demographics and medical attributes with input validation and pickers.
- **Added**: Authenticated Password Change modal (`components/ChangePasswordModal.tsx`) with complexity rules.
- **Added**: Health Vault full JSON export using native `Share.share` and account self-service deletion with cascade cleanup.
- **Added**: Backend `user_profiles` schema, `profileModel.js`, `profileController.js`, and `profileRoutes.js` mounted on `/profile`.
- **Added**: Dynamic user greeting in home screen header (`index.tsx`) resolving real authenticated user first name.
- **Added**: Automated Jest integration test suite (`tests/profile.test.js`) verifying all profile endpoints.

## [0.3.2] — Add Record Modal Drag Handle Affordance
- **Added**: iOS-style centered horizontal drag handle pill (`#CBD5E1`, 38×4px, `pointerEvents="none"`) at the top of the Add Record modal sheet (`record/add.tsx`) to provide visual dismiss/drag affordance without intercepting native swipe gestures.

## [0.3.1] — Record Details Metadata & Layout Redesign
- **Changed**: Reorganized Record Details (`record/[id].tsx`) overview card with a compact two-column horizontal metadata row for Date of Event and Logged in MedRec with an inline divider.
- **Improved**: Established modular card hierarchy with dedicated sections for Overview, Clinical Notes & Observations, and AI Medical Insights.
- **Refined**: Preserved MedRec design tokens, Lexend Deca typography, curated asset icons, and safe-area insets while significantly reducing vertical footprint.

## [0.3.0] — Backend Core & Testing Suite
- **Added**: Complete Node/Express 5 REST API with Auth, Records, Sharing, and AI route modules.
- **Added**: PostgreSQL schema migrations (`schema.sql`) with user, record, share, and audit tables.
- **Added**: Jest and Supertest test environment setup (`tests/setupEnv.js`).
- **Added**: Express security hardening with Helmet, CORS, and Rate Limiting middleware.

## [0.2.0] — Mobile Client Scaffold & Navigation
- **Added**: React Native Expo SDK 52 application setup with Expo Router v4.
- **Added**: Tab navigation (`(tabs)/index.tsx`, `share.tsx`, `scan.tsx`) and auth screens (`login.tsx`, `register.tsx`).
- **Added**: Responsive scaling utility (`hooks/useResponsive.ts`) and custom themed UI components.

## [0.1.0] — Obsidian Research & Product Design Vault
- **Added**: 18-module Obsidian knowledge vault in `MedRec/` documenting clinical problem spaces, patient needs, and regulatory requirements.
