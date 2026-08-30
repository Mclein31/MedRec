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
│ Security Middleware: Helmet, CORS, Rate Limit, Auth Validator          │
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
   - `NotificationCenterModal.tsx`: Slide-up sheet (`pageSheet`) with centered grey drag handle (`40×4px`, `#D1D5DB`), unread filter tabs, pull-to-refresh, and one-tap deep linking.
   - `NotificationCard.tsx`: Category icon badges, 4px teal unread indicator bar, relative timestamps, and action hints.
