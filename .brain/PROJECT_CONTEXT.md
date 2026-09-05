---
type: project-brain
title: MedRecord_App Project Context
project: MedRecord_App
status: active
tags:
  - project
  - healthcare
  - mobile
  - react-native
  - expo
  - express
  - postgresql
  - cloudflare-r2
  - ai
last_updated: 2026-09-05
---

# 🏥 MedRecord_App (MedRec) — Project Context

## 📌 Overview & Purpose
**MedRec** is a full-stack personal medical health records management and clinical sharing platform. It empowers patients to securely store, organize, categorize, and temporarily share their longitudinal health data (doctor visits, diagnoses, lab results, prescriptions, and medications) with healthcare providers via time-expiring QR codes and cryptographically signed access tokens. The application integrates AI features powered by OpenAI to summarize dense clinical notes, explain complex medical jargon in plain language, and automatically categorize health documents.

---

## 🎯 Current Status
- **Status**: `Production-Ready (Awaiting Cloud Deployment)`
- **Completed**: Full backend implementation, multi-platform responsive UI (Phone, Tablet Portrait, iPad Landscape), Cloudflare R2 cloud storage, comprehensive record management (CRUD + edit metadata + lightbox), sharing system (QR, scoped access, AI summary, ZIP download, session termination), notification sidebar, native Google Sign-In with backend ID token verification, and security audit remediation.
- **Security**: All P0/P1/P2 security and data integrity findings from formal code review resolved and verified (bcrypt password verification, presigned URL guard, R2 orphan cleanup, logout JWT invalidation, pre-account takeover protection on Google SSO, silent upload fallback removal).
- **Testing**: 71/71 backend tests passing (8 suites). TypeScript: 0 errors.
- **Next Phase**: Production PostgreSQL & Cloudflare R2 Credentials Deployment & Real Device QA.

---

## 💻 Tech Stack & Dependencies

### Mobile Frontend (`mobile/`)
- **Framework**: React Native (Expo SDK 54, Expo Router v6 file-based routing)
- **Language**: TypeScript
- **Navigation**: Expo Router Tabs (`(tabs)`), Stack Navigation (`_layout.tsx`)
- **Authentication & Secure Storage**: SecureStore (`expo-secure-store`), `@react-native-google-signin/google-signin`, custom `AuthContext.tsx`
- **File I/O**: `expo-file-system/legacy` (download), `expo-sharing` (native share sheet)
- **Icons & UI**: Expo Vector Icons (`@expo/vector-icons`), custom themed components, `useResponsive.ts`
- **Typography**: Google Fonts (Lexend Deca)
- **Camera**: `expo-camera` (`CameraView`) for QR scanning and document capture; `expo-image-picker` for gallery import and avatar selection

### Backend API (`backend/`)
- **Runtime & Framework**: Node.js, Express.js v5.x
- **Database**: Direct PostgreSQL (`pg` connection pool) — `public.users` (with `google_id` & `auth_provider`), `public.user_profiles`, `public.medical_records`, `public.shared_access`, `public.notifications`
- **Authentication**: Backend-Owned JWT (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`, salt 10), Google ID token verification (`google-auth-library`), `token_version` session invalidation on password change, logout, AND Google account link
- **Security**: `helmet`, CORS whitelisting, `express-rate-limit` (user-keyed + IP-keyed)
- **Cloud Storage**: Cloudflare R2 (AWS SDK v3 S3-compatible) — private bucket, presigned PUT upload, 15-min signed GET download, streaming for ZIP export
- **ZIP Export**: `jszip` (CJS-compatible) for shared record bundle archives
- **AI**: OpenAI Node SDK (`gpt-4o`) for clinical summarization (with deterministic fallback)
- **Testing**: Jest + Supertest — 71 tests / 8 suites / 100% pass rate

---

## 📂 Key Files & Structure
- `backend/src/server.js` & `backend/src/app.js`: Express initialization, middleware, and auto-migration on startup.
- `backend/src/config/db.js`: PostgreSQL connection pool with TLS enforcement.
- `backend/src/config/r2.js`: R2 client, presigned upload/download, object deletion, and object streaming.
- `backend/src/migrations/schema.sql`: Idempotent PostgreSQL schema with users, profiles, records, shares, notifications, FK cascades, triggers, and compound indexes.
- `backend/src/models/`: `userModel.js` (with `incrementTokenVersion`), `profileModel.js`, `recordModel.js` (presigned URL guard), `shareModel.js` (session pruning), `notificationModel.js`.
- `backend/src/controllers/`: `authController.js` (logout invalidation), `profileController.js` (bcrypt verify on password change), `recordController.js` (R2 cleanup + URL guard), `shareController.js` (AI summary, ZIP, terminate, per-record download).
- `backend/src/routes/`: `authRoutes.js`, `profileRoutes.js`, `recordRoutes.js` (PUT+PATCH), `shareRoutes.js` (summarize, terminate, download, zip, export), `storageRoutes.js`, `aiRoutes.js`, `notificationRoutes.js`.
- `backend/tests/`: `auth.test.js`, `profile.test.js`, `record.test.js`, `share.test.js`, `storage.test.js`, `notification.test.js`, `security.test.js`, `integration.test.js`.
- `mobile/app/`:
  - `(tabs)/index.tsx`: Records dashboard — search, category carousel, Master-Detail on tablet.
  - `(tabs)/profile.tsx`: Patient demographics, Emergency Medical ID, avatar (R2), password change.
  - `(tabs)/share.tsx`: QR code generator, active sessions, share history.
  - `(tabs)/scan.tsx`: Doctor QR scanner, shared record viewer, AI summary, per-record download, ZIP bundle download, terminate session.
  - `record/[id].tsx`: Record detail — attachment lightbox, metadata, clinical notes, AI insights, edit button.
  - `record/add.tsx`: New record form — document camera, R2 upload (aborts with Alert on failure), category carousel.
- `mobile/components/`:
  - `records/RecordEditModal.tsx`: Edit modal for record title, category (horizontal carousel), date, notes.
  - `notifications/NotificationCenterModal.tsx`: Full-screen sliding notification sidebar.
  - `notifications/NotificationCard.tsx`: Notification card with centered enlarged category icons.
  - `menu/SideMenuModal.tsx`: Left-slide animated burger nav drawer.
  - `camera/`: `DocumentCamera.tsx`, `DocumentPreview.tsx`, `AttachedDocumentCard.tsx`, etc.
  - `ui/`: `ScreenHeader.tsx`, `DragHandle.tsx`, `Button.tsx`, `Card.tsx`.
- `mobile/context/`: `AuthContext.tsx`, `NotificationContext.tsx` (guarded unread count decrement).
- `mobile/lib/api.ts`: Centralized fetch client with all backend endpoint methods.
- `mobile/constants/theme.ts`: Design tokens (`Colors`, `Typography`, `Spacing`, `Radii`).
- `mobile/constants/records.ts`: Record type taxonomy (`RECORD_TYPE_ASSETS`, `RECORD_TYPE_LABELS`, etc.).

---

## 🔗 Related Projects & Links
- 🌐 [[Personal Website]] — Showcases *MedRec* in the 3D coverflow portfolio gallery.
- 🗺️ [[_BRAIN/PROJECT_INDEX|Master Project Index]]
- 🐙 **Repository**: [github.com/Mclein31/MedRec](https://github.com/Mclein31/MedRec.git)

---

## ⚠️ Known Limitations
- Backend operates on local PostgreSQL; production cloud database hosting (Neon/Render) not yet configured.
- Native Google SSO requires actual Google Cloud Client IDs configured in environment variables and runs in native development builds (`npx expo run:ios` / `npx expo run:android`), not standard Expo Go.
- OpenAI API key required for live AI summaries; deterministic fallback active when key is absent.
