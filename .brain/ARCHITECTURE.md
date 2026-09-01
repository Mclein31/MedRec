---
type: architecture
title: MedRecord_App Architecture
project: MedRecord_App
tags:
  - architecture
  - healthcare
  - mobile
  - react-native
  - express
  - postgresql
last_updated: 2026-08-28
---

# 🏛️ MedRecord_App (MedRec) — Architecture

## 📐 System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Mobile App                         │
│                    (Expo Router SDK 52 / TypeScript)                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Patient View:                    │ Doctor View:                        │
│ - Dashboard & Medical Records    │ - QR Code Scanner                   │
│ - Record Upload & AI Summary     │ - Read-Only Shared Patient History  │
│ - Generate Sharing QR Token      │ - Temporary Access Session          │
└──────────────────────────────────┴─────────────────────────────────────┘
                                   │
                                   │ HTTPS / REST (JWT Bearer Token)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Node.js / Express 5 API Server                     │
├───────────────────┬───────────────────┬────────────────┬───────────────┤
│ /api/auth         │ /api/records      │ /api/share     │ /api/ai       │
│ - Register/Login  │ - Records CRUD    │ - Create QR    │ - Summarize   │
│ - JWT Issuance    │ - Category Filter │ - Verify Token │ - Explain     │
├───────────────────┴───────────────────┴────────────────┴───────────────┤
│ /api/profile                                                           │
│ - Get Profile & Stats, Update Demographics/Medical ID, Password, Delete│
├────────────────────────────────────────────────────────────────────────┤
│ Security & Startup: Helmet, CORS, Rate Limit, Auth Validator,          │
│                     Automatic Idempotent Schema Migration on Boot      │
└───────────────────┬─────────────────────────────────────┬──────────────┘
                    │                                     │
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │    PostgreSQL Database    │         │      OpenAI API Cloud     │
      │  - users                  │         │  - gpt-4o Summarization   │
      │  - user_profiles          │         │  - Medical Terms Decoder  │
      │  - medical_records        │         └───────────────────────────┘
      │  - shared_access          │
      │  - revoked_tokens         │
      └───────────────────────────┘
```

---

## 🗄️ Database Schema (`backend/src/migrations/schema.sql`)
1. `users`: Stores user credentials, hashed passwords (`bcryptjs`), and primary identity.
2. `user_profiles`: 1:1 linked demographic and clinical baseline (DOB, sex, height, weight, blood type, allergies, conditions, maintenance medications, emergency contact name/relation/phone, phone, address, avatar_url, organ donor status).
3. `medical_records`: Stores individual clinical records (title, category: `diagnosis`, `prescription`, `lab`, `consultation`, `medication`, `appointment`, `other`, record date, `attachment_url` for captured document images, notes, AI summary).
4. `shared_access`: Stores cryptographically generated access tokens, associated `user_id`, expiration timestamps, and revocation flags.
5. `revoked_tokens`: Stores revoked JWT `jti` identifiers with TTL for instant session invalidation on logout.
6. `notifications`: Stores user notifications and audit logs with compound indexes on `(user_id, created_at DESC)` and `(user_id, read)`.

---

## 🔐 Security & Access Control Flow
1. **Patient Sharing**: Patient selects records to share $\rightarrow$ Backend generates a high-entropy random token with a custom TTL (e.g. 1 hour) $\rightarrow$ Rendered as a QR code in `mobile/app/(tabs)/share.tsx`.
2. **Emergency Medical ID**: Offline scannable QR code encodes public emergency facts directly for instant first responder scanning without authentication barrier.
3. **Doctor Verification**: Doctor scans QR code $\rightarrow$ Backend validates token expiration and active status $\rightarrow$ Grants scoped read-only access to authorized records.
4. **Token Invalidation**: Tapping Sign Out immediately writes JWT token `jti` to `revoked_tokens` table.

---

## 📷 Document Capture Subsystem (`mobile/components/camera/`)
1. `DocumentCamera.tsx`: Full-screen camera viewport mounting `CameraView` with flashlight/torch control, shutter flash animation, haptic tap, and photo library ingestion fallback (`expo-image-picker`).
2. `ViewfinderOverlay.tsx`: 3:4 aspect ratio document framing guide with ambient vignette masking (`rgba(10, 18, 17, 0.62)`), high-contrast teal corner markers, and animated scan line.
3. `CameraControls.tsx`: Dual-ring tactile shutter button, torch toggle button, and gallery picker trigger.
4. `DocumentPreview.tsx`: Full-resolution image review screen with quality self-check prompt, retake action, and confirmation action.
5. `AttachedDocumentCard.tsx`: Interactive in-form attachment card rendered on `record/add.tsx` with 64×64px thumbnail, zoom preview modal, replace/retake, and delete actions.

---

## 🧭 Drawer Menu Subsystem (`mobile/components/menu/`)
1. `SideMenuModal.tsx`: Lightweight left-slide animated drawer overlay (`-DRAWER_WIDTH -> 0`) with backdrop fade, official MedRec logo branding (`assets/logo/logo.png`), user summary, and text-only routing for primary tabs and secondary vault tools.
2. `SideMenuItem.tsx`: Text-only interactive row component with active route highlight (`#F0F9F7`), dynamic badge support (e.g. active shares count), and haptic selection feedback.

---

## 🔔 In-App Notification Subsystem
1. **Database & API**: PostgreSQL `notifications` table with compound indexes on `(user_id, created_at DESC)` and `(user_id, read)`. Authenticated endpoints mounted at `/notifications` (`GET /`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`).
2. **Automated Event Triggers**: Server controllers automatically generate notifications on record uploads (`record_added`), QR sharing access (`share_created`, `share_revoked`), Emergency ID modifications (`emergency_updated`), security changes (`security_alert`), and AI synthesis (`ai_summary_ready`).
3. **State Management (`mobile/context/NotificationContext.tsx`)**: Centralized React Context managing `notifications`, `unreadCount`, and optimistic mark-as-read state.
4. **UI Components (`mobile/components/notifications/`)**:
   - `NotificationCenterModal.tsx`: Dual-architecture notification presentation:
     - **Tablet (Portrait & Landscape)**: Two-layer architecture with an independent stationary fading backdrop (`backdropFadeAnim` opacity) and a right-anchored floating sheet (`panelSlideAnim` translating from `+panelWidth` to `0`), cleanly anchored near the top-right toolbar notification trigger.
     - **Phone UI (`!isTablet`)**: Native bottom `pageSheet` modal with integrated drag handle.
   - `NotificationCard.tsx`: Category icon badges, 4px teal unread indicator bar, relative timestamps, and action hints.

---

## 📱 Tablet & iPad Adaptive Architecture Subsystem
1. **Phone & Portrait Quarantine Invariant**: All tablet landscape adaptive behavior is guarded by `isTablet && isLandscape` (or `isTabletLandscape`), guaranteeing zero layout shifts, visual regressions, or performance overhead on mobile phones (`!isTablet`) and tablet portrait (`isTablet && !isLandscape`).
2. **Navigation Adaptive Partitioning**:
   - **Tablet Landscape (`isTablet && isLandscape`, 88pt)**: Left Navigation Rail (`TabletLandscapeNavRail.tsx`) with Burger Menu button anchored at top, 38×38 MedRec brand glyph, 5 primary vertical tabs (Records, Share with badge, Add Record `add-record.png`, Scan, Profile) with pure active/inactive icon swapping, and bottom utility cluster (AI Health Summary trigger, Emergency Medical ID trigger, Patient Avatar/Monogram). Header features a single right-aligned Notification Bell.
   - **Tablet Portrait (`isTablet && !isLandscape`)**: Fixed global top toolbar at screen root (`paddingTop: insets.top + 12`, `paddingLeft/Right: Math.max(insets, screenPadding)`) hosting Burger button on left and Notification Bell on right with `space-between`, and floating bottom tab bar (`maxWidth: 480pt`, `height: 68pt`, `borderRadius: 24`).
   - **Phone (`!isTablet`)**: Standard bottom tab bar (`height: 85pt`, `tabBarClearance: 110pt`).
3. **Master-Detail Workspace Archetype**:
   - **Records Dashboard (`index.tsx`)**: 360pt master list with search, category filters with live distribution badges, and multi-select banner on left; Live clinical detail canvas on right starting at `paddingTop: 0` (when attachment exists: balanced 2-column split with document photo inspect/zoom with `Colors.blue` accent on left and clinical notes + AI insights on right; when no attachment: full-width bounded clinical notes + AI insights).
   - **Doctor Scanner (`scan.tsx`)**: Pre-scan centered 280pt 1:1 camera viewfinder (with right-aligned notification bell and burger in sidebar); Post-scan Master-Detail workspace (Left 340pt: authorized records list; Right Flex 1: complete read-only clinical notes, metadata, read-only notice, and floating "Scan Another Patient QR" CTA).
4. **2-Column Clinical & Intake Studios Archetype**:
   - **Record Intake (`add.tsx`)**: Centered 960pt 2-column intake studio (`transparentModal`, dimmed backdrop `rgba(0,0,0,0.45)`) pairing Left 48% (classification chips, title, date, multiline clinical notes with KeyboardAvoidingView) and Right 52% (camera capture hero / AttachedDocumentCard with `Colors.blue` accent, AI analysis badge, sovereign vault notice).
   - **Sharing Center (`share.tsx`)**: Centered 1040pt 2-column sharing studio pairing Left 44% (high-contrast living QR code with 15s countdown ticker and instant revoke) and Right 56% (active doctor access sessions ledger + past history timeline).
   - **Record Details (`record/[id].tsx`)**: Centered 1040–1100pt 2-column clinical split pairing Left 44% (overview + document photo preview with tap-to-inspect zoom modal + delete action) and Right 56% (clinical notes & observations + AI medical insights).
   - **Patient Profile (`profile.tsx`)**: Centered 1040pt dual-column studio pairing Left 48% (Emergency Medical ID, clinical baseline, 1-tap ICE call button) and Right 52% (unboxed identity hero, personal demographics, security & preferences with JSON export, account & legal actions).
5. **Content-Driven Clamped Modals Archetype**:
   - **Emergency Medical ID (`EmergencyIdModal.tsx`)**: 680pt max width 2-column triage placard with auto-height sizing (`flexGrow: 0, flexShrink: 1`).
   - **Profile Edit (`ProfileEditModal.tsx`)**: 640pt max width 2-column paired form dialog with content-driven height.
   - **Change Password (`ChangePasswordModal.tsx`)**: 480pt max width centered card with `flexGrow: 0` auto-sizing.
   - **Notification Center (`NotificationCenterModal.tsx`)**: 420pt right slide-over panel with independent stationary backdrop.
