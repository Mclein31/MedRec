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
  - cloudflare-r2
last_updated: 2026-09-04
---

# 🏛️ MedRecord_App (MedRec) — Architecture

## 📐 System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Mobile App                         │
│                    (Expo Router SDK 54 / TypeScript)                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Patient View:                    │ Doctor/Recipient View:              │
│ - Dashboard & Medical Records    │ - QR Code Scanner                   │
│ - Record Upload (R2) & AI        │ - Read-Only Shared Clinical History │
│ - Generate Sharing QR Token      │ - AI Clinical Summary               │
│ - Demographics & Emergency ID    │ - Per-Record & ZIP Bundle Download  │
│ - Notification Sidebar           │ - Terminate Access Session          │
└─────────────────┬────────────────┴──────────────────┬──────────────────┘
                  │                                   │
                  │ HTTPS REST (Bearer JWT Auth)      │ Direct Binary S3 PUT
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Node.js / Express 5 API Server                     │
├───────────────────┬───────────────────┬────────────────┬───────────────┤
│ /api/auth         │ /api/records      │ /api/share     │ /api/storage  │
│ - Register/Login  │ - Records CRUD    │ - Create QR    │ - Presigned   │
│ - Bcrypt & JWT    │ - Category Filter │ - Verify Token │   Upload/Get  │
│ - Logout (invalidate)│ - Edit Metadata│ - AI Summary   │               │
├───────────────────┴───────────────────┴────────────────┴───────────────┤
│ /api/profile                                           │ /api/ai       │
│ - Demographics, Medical ID, Password (bcrypt verify),  │ - Summarize   │
│   Avatar (R2), Account Deletion                        │ - Explain     │
│ /api/notifications                                     │               │
│ - In-App Audit Logs, Event Triggers, Read/Unread Status│               │
└───────────────────┬───────────────────────────────────┬────────────────┘
                    │                                   │
                    ▼                                   ▼
      ┌───────────────────────────┐       ┌───────────────────────────┐
      │    PostgreSQL Database    │       │   Cloudflare R2 Storage   │
      │  - users (Bcrypt & JWT    │       │  - Private S3-Compatible  │
      │    + token_version)       │       │  - Presigned PUT (upload) │
      │  - user_profiles (1:1)    │       │  - 15-min Signed GET URLs │
      │  - medical_records        │       │  - Path Prefix Isolation  │
      │  - shared_access (Tokens) │       │  - Streaming for ZIP      │
      │  - notifications (Ledger) │       └───────────────────────────┘
      └───────────────────────────┘
```

---

## 🗄️ Database Schema (`backend/src/migrations/schema.sql`)

1. **`public.users`**: Backend-owned user credentials, bcrypt-hashed passwords (`bcryptjs`, salt 10), `token_version INT` for instant session invalidation, and primary identity. `token_version` is atomically incremented on password change **and** on logout (`incrementTokenVersion`).
2. **`public.user_profiles`**: 1:1 linked demographic and clinical baseline (DOB, sex, height, weight, blood type, allergies, conditions, maintenance medications, emergency contact name/relation/phone, phone, address, `avatar_url`, organ donor status). Auto-provisioned by `on_user_created` PostgreSQL trigger.
3. **`public.medical_records`**: Individual clinical records (title, category type, date, `attachment_url` R2 storage key, notes). `type` CHECK constraint enforced both inline and via idempotent `DO $$` block for pre-existing databases (`medical_records_type_check`).
4. **`public.shared_access`**: Cryptographic access tokens, `user_id`, expiration timestamps, optional `allowed_types` and specific `record_ids`, revocation flag (`revoked_at`). Maximum 5 active sessions enforced by `pruneExcessActiveShares` before every new token creation.
5. **`public.notifications`**: User notifications and audit ledger with compound indexes on `(user_id, created_at DESC)` and `(user_id, read) WHERE read = FALSE`.

Schema is idempotent: all column additions use `ADD COLUMN IF NOT EXISTS`. Migrations run automatically on server startup via `runMigrations()` in `server.js`.

---

## 🔐 Security & Access Control

1. **JWT Authentication**: Bcrypt (salt 10) + `jsonwebtoken`. JWT embeds `userId` and `tokenVersion`. `requireAuth` middleware (`authMiddleware.js`) validates signature, expiry, and `token_version` against the DB on every protected request.
2. **Password Change Verification**: `changePassword` in `profileController.js` calls `bcrypt.compare(currentPassword, user.password_hash)` and returns `401` if incorrect, before updating.
3. **Server-Side Logout Invalidation**: `logout` calls `userModel.incrementTokenVersion(req.user.id)`, immediately invalidating the issued JWT for the rest of its 7-day natural window.
4. **Patient Sharing**: Patient selects records → Backend validates ownership via atomic SQL `verifyOwnership` → Generates high-entropy crypto token with custom TTL → QR rendered in `share.tsx`. Active sessions capped at 5.
5. **Doctor Record Access**: Doctor scans QR → `getByToken` validates token expiry and revocation → Returns scoped records with short-lived (15 min) signed R2 download URLs via `attachSignedUrlIfNeeded`.
6. **Storage Security**: R2 bucket is strictly private. Upload uses user-prefix-isolated presigned PUT (`{userId}/{uuid}.{ext}`). Download uses 15-minute presigned GET. **Presigned `https://` URLs are never stored back in PostgreSQL** — `updateRecord` and `updateRecordForUser` guard against this explicitly.

---

## ☁️ Cloudflare R2 Storage (`backend/src/config/r2.js`)

- **Client**: AWS SDK v3 S3-compatible (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) targeted at `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.
- **Upload**: `POST /api/storage/upload-url` → `generatePresignedUploadUrl` → Returns signed PUT URL. Client (`add.tsx`, `profile.tsx`) uploads binary directly to R2, bypassing server memory.
- **Download**: `generatePresignedDownloadUrl(bucket, key, 900)` → 15-minute signed GET URL. Applied by `attachSignedUrlIfNeeded` when reading records or returning shared records.
- **Streaming for ZIP**: `getR2ObjectStream(bucket, key)` → Streams raw R2 object data; used by `downloadSharedBundleZip` to populate ZIP attachments without buffering entire files in memory.
- **Object Lifecycle**: On `DELETE /records/:id`, `deleteR2Object(bucket, key)` removes the R2 object. On `PUT /records/:id`, if a new, different R2 key is provided, the old key is also deleted before writing the update.
- **Path Convention**: `{userId}/{uuid}.{ext}` for medical records; `{userId}/avatar/{uuid}.jpg` for avatars.

---

## 📁 Medical Records

- **CRUD**: `POST /records` (create), `GET /records` (list with type filter + pagination), `GET /records/:id` (single), `PUT /records/:id` / `PATCH /records/:id` (metadata update), `DELETE /records/:id` (with R2 cleanup).
- **Attachment Flow**: Mobile client requests presigned upload URL → uploads binary directly to R2 → sends the R2 key (path) as `attachmentUrl` to the create/update endpoint → stored in `medical_records.attachment_url`.
- **Presigned URL Guard**: On edit, if the client sends back the previously-received `https://` signed download URL, the backend ignores it (both controller and model layer guards), preserving the original R2 key in the DB.
- **Edit Metadata Modal (`RecordEditModal.tsx`)**: Edits title, category type (horizontal carousel), event date, and clinical notes. Does not expose or modify `attachment_url` — sent payload intentionally omits it.
- **Lightbox**: `record/[id].tsx` displays the attachment with a tap-to-expand fullscreen lightbox with instant `withTiming(0ms)` spring animation.

---

## 🤝 Shared Records (`/api/share`)

### Patient-Facing (authenticated)
- `POST /share` — Create access token (scoped by types/record IDs, TTL in minutes, max 5 sessions enforced).
- `GET /share` — List all shares (active + history).
- `DELETE /share/:id` — Revoke a share (sets `revoked_at`).

### Recipient-Facing (token-authenticated, no JWT required)
- `GET /share/:token` — Returns token validity, patient name, expiry, and scoped records with signed attachment URLs.
- `POST /share/:token/summarize` — Returns AI-generated clinical summary (medications, diagnoses, key notes). Falls back to deterministic structured synthesis if OpenAI is unavailable.
- `POST /share/:token/terminate` — Recipient-initiated session termination. Creates `share_revoked` notification for the patient.
- `GET /share/:token/download/:recordId` — Returns a 15-minute presigned R2 download URL for a specific record's attachment.
- `GET /share/:token/zip` (alias: `GET /share/:token/download-all`) — Streams a ZIP archive (`application/zip`) containing `README_CLINICAL_SUMMARY.txt`, `records_metadata.json`, and `attachments/` folder. Built with `jszip` (CJS-compatible; `archiver` rejected due to ESM incompatibility with Jest).
- `GET /share/:token/export` — Returns JSON export bundle of shared records with signed URLs.

### Mobile Shared Records UI (`scan.tsx`)
- QR scanning via `expo-camera` → calls `/share/:token` → renders Patient header, record list, and action bar.
- Per-record download: `GET /share/:token/download/:recordId` → presigned URL → `downloadFileDirectly` → native device save/share sheet.
- ZIP bundle download: `GET /share/:token/zip` → streams ZIP → saved to `FileSystem.documentDirectory` → `Sharing.shareAsync`.
- AI Summary: `POST /share/:token/summarize` → modal with structured clinical data.
- Terminate Session: `POST /share/:token/terminate` → removes token from active sessions + patient notification.

---

## 🔔 Notification System

### Backend
- **Table**: `public.notifications` (id, user_id, type, title, body, read BOOL, data JSONB, created_at).
- **Event Types**: `record_added`, `share_created`, `share_revoked`, `emergency_updated`, `security_alert`, `ai_summary_ready`.
- **API**: `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`.
- All writes are non-blocking `try/catch` — notification failures never break the primary action.

### Mobile (`NotificationContext.tsx`)
- Centralized React Context: `notifications[]`, `unreadCount`, `loading`.
- `markAsRead(id)`: Checks `target.read === false` before decrementing `unreadCount` (prevents negative counts on double-tap). Optimistic update; rolls back via `refreshNotifications()` on API error.
- `deleteNotification(id)`: Removes from list; decrements count only if `!target.read`.
- `markAllAsRead()`: Zeroes `unreadCount` and marks all in state.

### Notification Sidebar UI (`NotificationCenterModal.tsx`)
- Universal full-screen sliding modal (`animationType="slide"`, `presentationStyle="pageSheet"` on phone; `overFullScreen` transparent on tablet).
- Matches BurgerNav design language: same surface color, typography, spacing, and border treatment.
- **Unread cards**: Retain full surface color, bold typography, left-edge teal accent.
- **Read cards**: Muted ink (`Colors.muted`), normal weight, no left accent.
- **Icons**: Centered, enlarged category icons per notification type (including QR icon for `share_created` / `share_revoked` / `qr_generated` / `qr_terminated` types).
- Filter tabs: "All" / "Unread" with live counts.
- Pull-to-refresh via `RefreshControl`.

---

## 📷 Document Capture & Storage

1. `DocumentCamera.tsx`: Full-screen `CameraView` with torch, haptic shutter, and library picker.
2. `add.tsx`: Requests presigned PUT URL from Express → uploads binary directly to R2 → stores R2 key in record. **Upload failure aborts record creation** with `Alert` (no silent `file://` fallback).
3. `profile.tsx`: Uploads avatar to R2 via presigned PUT → stores R2 key in `user_profiles.avatar_url`. **Upload failure reverts the optimistic preview** and shows `Alert` (no silent base64 fallback).

---

## 📱 Responsive Layout Engine

Three strictly isolated runtime UI states:
- **Phone** (`!isTablet`): Single-column, bottom tab bar (85pt), edge-to-edge sheets.
- **Tablet Portrait** (`isTablet && !isLandscape`): Single-column/bento grids, centered 480pt floating pill nav.
- **Tablet Landscape** (`isTablet && isLandscape`): 88pt left nav rail, Master-Detail workspaces, 2-column studios.

`isTablet` determined by `Math.min(width, height) >= 600` (physical shorter-dimension classification).

---

## 🧪 Testing

- **Backend**: Jest + Supertest. 63 tests across 8 suites: `auth.test.js`, `profile.test.js`, `record.test.js`, `share.test.js`, `storage.test.js`, `notification.test.js`, `security.test.js`, `integration.test.js`. All 63/63 passing.
- **Mobile**: TypeScript compilation (`npx tsc --noEmit`) — 0 errors.
