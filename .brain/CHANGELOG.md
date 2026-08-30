---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-08-30
---

# 📜 MedRecord_App (MedRec) — Changelog

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
