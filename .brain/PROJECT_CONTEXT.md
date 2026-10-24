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
last_updated: 2026-10-24
---

# 🏥 MedRecord_App (MedRec) — Project Context

## 📌 Overview & Purpose
**MedRec** is a full-stack personal medical health records management and clinical sharing platform. It empowers patients to securely store, organize, categorize, and temporarily share their longitudinal health data (doctor visits, diagnoses, lab results, prescriptions, and medications) with healthcare providers via time-expiring QR codes and cryptographically signed access tokens. The application integrates AI features powered by OpenAI to summarize dense clinical notes, explain complex medical jargon in plain language, and automatically categorize health documents.

---

## 🎯 Current Status
- **v2 rebuild (2026-10-24, DD-44)**: New stack in `apps/api` (Cloudflare Worker + Neon + R2 + Gemini + Gmail OTP) and `apps/mobile` (Expo SDK 54). Feature-complete for records, AI reading, sharing, Medical ID, exports, app lock and 2FA; verified locally (37 API + 7 app tests, live `wrangler dev` probe, headless UI run). Not yet deployed; legacy `backend/` and `mobile/` below remain the shipped v1 until cut-over. See [apps/README.md](../apps/README.md).
- **Status**: Local implementation and UI polish complete for the existing record flows; deployment and real-device QA remain open.
- **2026-10-14 UX pass**: Four-step onboarding redesigned with sliding pages, staggered sample cards, QR scanning/pulsing, animated progress, pause control, and live Reduce Motion/background handling. Login/register share labeled responsive forms; dashboard has primary record intake, a Medical ID shortcut, compact record rows, actionable errors/empty states, and scrollable AI summaries. Bottom navigation has visible labels and consistent vector icons.
- **Finished features**: Native biometric/passcode app lock (SecureStore preference per account, cold-start/resume enforcement, protected modal suppression), actual JSON file export, and printable PDF history. Exports fetch every page, remove temporary access URLs, and explicitly exclude attachment bytes.
- **Integrity fixes**: Complete authorized sharing/ZIP scope; stable patient pagination; real civil-date checks; web photo upload to private storage; scoped QR labels and 15/30/60-minute duration choice; expired QR/viewer cleanup; typed session-expiry handling that preserves wrong-password and stale-request cases.
- **Verification**: Backend 144 tests across 12 suites pass. Mobile 39 Node test entries pass, including app-lock, export/pagination, UI flows, shared buttons, API discovery, simulator compatibility, and signup retry checks. TypeScript has no errors. Lint has zero errors and 30 pre-existing warnings. Web, iOS, and Android bundles export successfully. CocoaPods links the new native modules; native build status and device QA are recorded in the latest decisions entry.
- **Dependency audit**: Backend production dependencies have zero audit findings. Compatible mobile updates remove critical findings; 44 findings remain (24 high, 20 moderate), primarily inherited build tooling. A broader compatible SDK/tooling upgrade is still needed.
- **Sign-in audit (2026-10-14)**: Stale local API IP reproduced and removed; development now follows Metro/browser host. Live registration/login/identity/logout/re-login checks pass. Backend has deterministic environment loading, private shared JWT configuration, strict versioned HS256 sessions, bounded database waits, and DB readiness checks. See [AUTH_AUDIT.md](AUTH_AUDIT.md).
- **Signup retry recovery**: A registration conflict after a freshly created account now recovers via normal password login, requiring the matching password and preserving the existing identity. Duplicate submit is synchronously guarded; session-save failure clearly distinguishes account creation from device sign-in. Initial client failure remains unconfirmed.
- **Xcode 27 launcher**: SDK 54 CLI's Simulator.app discovery fails against Device Hub. A guarded, repeatable upstream backport is applied on dependency install/start; installed Xcode prerequisite and seven launcher checks pass (34 total mobile entries). Interactive launch still needs verification.
- **Open product work**: Native Google sign-in UI/configuration, actual email/password recovery delivery, theme parity, production database/R2 deployment, and real-device verification. Recovery endpoints return 503 honestly; missing R2 upload configuration fails with 503 outside tests.

---

## 💻 Tech Stack & Dependencies

### Mobile Frontend (`mobile/`)
- **Framework**: React Native (Expo SDK 54, Expo Router v6 file-based routing)
- **Language**: TypeScript
- **Navigation**: Expo Router Tabs (`(tabs)`), Stack Navigation (`_layout.tsx`)
- **Authentication & Secure Storage**: SecureStore (`expo-secure-store`), `@react-native-google-signin/google-signin`, custom `AuthContext.tsx`
- **File I/O**: `expo-file-system/legacy` (download), `expo-sharing` (native share sheet)
- **Icons & UI**: Expo Vector Icons (`@expo/vector-icons`), custom themed components, `useResponsive.ts`
- **Typography**: Bundled Lexend Deca fonts
- **Camera**: `expo-camera` (`CameraView`) for QR scanning and document capture; `expo-image-picker` for gallery import and avatar selection

### Backend API (`backend/`)
- **Runtime & Framework**: Node.js, Express.js v5.x
- **Database**: Direct PostgreSQL (`pg` connection pool) — `public.users` (with `google_id` & `auth_provider`), `public.user_profiles`, `public.medical_records`, `public.shared_access`, `public.notifications`
- **Authentication**: Backend-Owned JWT (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`, salt 10), Google ID token verification (`google-auth-library`), `token_version` session invalidation on password change, logout, AND Google account link
- **Security**: `helmet`, CORS whitelisting, `express-rate-limit` (user-keyed + IP-keyed)
- **Cloud Storage**: Cloudflare R2 (AWS SDK v3 S3-compatible) — private bucket, presigned PUT upload, 15-min signed GET download, streaming for ZIP export
- **ZIP Export**: `jszip` (CJS-compatible) for shared record bundle archives
- **AI**: OpenAI Node SDK (`gpt-4o`) for clinical summarization (with deterministic fallback)
- **Testing**: Jest + Supertest — 143 tests / 12 suites / 100% pass rate

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
  - `onboarding.tsx`: Animated four-step tour with focused feature previews, first-launch guard, and authenticated replay.
  - `(tabs)/index.tsx`: Records dashboard — search, category carousel, Master-Detail on tablet.
  - `(tabs)/profile.tsx`: Patient demographics, Emergency Medical ID, avatar (R2), password change, and onboarding replay guide.
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
- Production database/R2 deployment remains unverified. Missing R2 upload credentials fail honestly outside tests.
- Native Google SSO requires actual Google Cloud Client IDs configured in environment variables and runs in native development builds (`npx expo run:ios` / `npx expo run:android`), not standard Expo Go.
- OpenAI API key required for live AI summaries; deterministic fallback active when key is absent. AI summaries disclose when input is limited to the latest 25 records.
- Recovery email/token delivery is not implemented; endpoints return unavailable errors.
- Native app lock and PDF printing require a development build with the installed native modules. Computer-use approval denied Safari/Device Hub access in this pass, so visual/touch/device QA has not been claimed.
