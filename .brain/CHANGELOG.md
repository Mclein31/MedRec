---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-08-29
---

# 📜 MedRecord_App (MedRec) — Changelog

## [0.7.0] — Privacy-Conscious In-App Notification Center & Modal Refinement
- **Added**: Interactive notification bell trigger and dynamic unread badge dot across Records Overview (`index.tsx`) and Share Center (`share.tsx`).
- **Added**: In-App Notification Center modal (`NotificationCenterModal.tsx`) with segmented filter tabs (All / Unread), pull-to-refresh, 1-tap batch read action, and reassuring empty state.
- **Added**: Subtle neutral grey drag handle affordance (`40×4px`, `borderRadius: 2`, `#D1D5DB`) centered at the top of the notification modal sheet for clear swipe-down dismiss guidance.
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
