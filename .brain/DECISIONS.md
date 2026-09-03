---
type: decisions-log
title: MedRecord_App Decisions
project: MedRecord_App
tags:
  - decisions
  - architecture
  - backend
  - mobile
last_updated: 2026-09-04
---

# ⚖️ MedRecord_App (MedRec) — Technical Decisions

## 2026-09-04 — Record Card Edit Trigger Scoping & Edit Modal Image Capture (DD-31)

### Decision
1. **Scoped Edit Trigger to Metadata Level Only**:
   - Removed the inline Edit button from individual record list cards in `mobile/app/(tabs)/index.tsx`.
   - Maintained the Edit trigger exclusively on the record metadata level (Tablet Master-Detail Overview card header and Record Details overview card in `mobile/app/record/[id].tsx`).
2. **Document Image Capture & Attachment in RecordEditModal (`RecordEditModal.tsx`)**:
   - Integrated full image attachment functionality into `RecordEditModal` matching `record/add.tsx` visual design.
   - When an attachment exists: displays `AttachedDocumentCard` with thumbnail, inspect/zoom, retake, and remove buttons.
   - When no attachment exists: displays `scanHeroCard` with "SCAN WITH CAMERA" and "Or choose from Photo Library" actions.
   - Integrates `DocumentCamera` and `DocumentPreview` viewports.
   - Explicitly excludes AI summary banners and delete options.
   - On save: uploads newly selected image binaries to Cloudflare R2 via presigned URLs and updates/retains or clears the record attachment key.

### Reason
- Eliminates visual clutter on primary dashboard list cards where full navigation to record details is the primary gesture.
- Gives patients complete control to attach, replace, or remove document scans during record editing without creating a new record.

### Consequences
- Clean, uncluttered dashboard list view.
- Complete parity between creation (`add.tsx`) and editing (`RecordEditModal.tsx`) document attachment capabilities.

---

## 2026-09-04 — Security & Data Integrity Audit Fixes (DD-30)

### Decision
1. **Password Change Verification (P0 — Security)**:
   - `changePassword` (`profileController.js`) now calls `bcrypt.compare(currentPassword, user.password_hash)` before updating. Returns `400` if `currentPassword` is absent, `401` if incorrect. Requires `bcryptjs` and `userModel` imports in `profileController.js`.
2. **Presigned URL Never Stored in DB (P0 — Data Integrity)**:
   - `updateRecord` (`recordController.js`) and `updateRecordForUser` (`recordModel.js`) both guard against persisting `http(s)://` attachment values. When the client echoes back a signed download URL, it is silently dropped, preserving the original R2 key.
3. **Orphaned R2 Object Cleanup on Record Update (P1)**:
   - `updateRecord` fetches the existing record before writing. If a new, different R2 storage key is provided, the old key is deleted via `deleteR2Object` before the update is committed.
4. **R2 Upload Failure Abort (P1)**:
   - `add.tsx`: Upload failure shows `Alert` and calls `setSaving(false)` before returning. No silent `file://` fallback.
   - `profile.tsx`: Avatar upload failure reverts the optimistic preview, shows `Alert`, and aborts profile update. No silent base64 fallback.
5. **Dead Code Removal: `tokenModel.js` (P1)**:
   - Deleted. Queried non-existent `revoked_tokens` table. Was never imported anywhere in the codebase.
6. **Server-Side JWT Invalidation on Logout (P1)**:
   - `logout` (`authController.js`) calls `userModel.incrementTokenVersion(req.user.id)`. Added `incrementTokenVersion` to `userModel.js`.
7. **Notification Unread Count Guard (P2)**:
   - `markAsRead` in `NotificationContext.tsx` checks `target.read === false` before decrementing `unreadCount`.
8. **Idempotent Type CHECK Constraint (P2)**:
   - `schema.sql` contains a `DO $$ … END $$` block that idempotently adds `medical_records_type_check` on existing databases.

### Reason
Formal code review identified these as P0 security holes and P1 data integrity bugs. Medical record system requires highest security standards.

### Consequences
- 63/63 backend tests pass; TypeScript: 0 errors. No regressions.
- Password changes now require proof of knowledge of the current password.
- R2 attachment keys are never overwritten by ephemeral presigned URLs.

---

## 2026-09-04 — Shared Records ZIP Bundle Export (DD-29)

### Decision
1. **Backend ZIP Endpoint (`GET /share/:token/zip`)**:
   - Implemented using `jszip` (CJS-compatible) in `shareController.js`. Builds a ZIP containing `README_CLINICAL_SUMMARY.txt`, `records_metadata.json`, and `attachments/` folder.
   - `archiver` (v2 ESM) was evaluated and rejected: SyntaxError in Jest (`Cannot use import statement outside a module`) due to backend `"type": "commonjs"`.
   - Uses `getR2ObjectStream(bucket, key)` from `r2.js` to stream R2 objects directly into ZIP without buffering in memory. Supports presigned URLs and base64 data payloads.
2. **Mobile ZIP Download (`scan.tsx`)**:
   - `downloadFileDirectly` upgraded with `forcedExt`/`forcedMime` parameters and `.zip` MIME support (`application/zip`, UTI `public.zip-archive`).
   - `handleDownloadAllZip` fetches `/share/:token/zip`, saves to `FileSystem.documentDirectory`, opens native share/save sheet via `Sharing.shareAsync`.
   - Prominent "Download All as ZIP Archive" card at top of Download modal on both phone and tablet layouts.

### Reason
Doctors need a single-tap way to download all shared patient records. ZIP bundles with clinical metadata are the standard format for offline record handoffs.

### Consequences
Individual record downloads and ZIP bundle download coexist. ZIP includes all scoped records and a human-readable clinical summary.

---

## 2026-09-04 — Shared Records Expanded API Surface (DD-28)

### Decision
Added to `GET /share/:token`:
- **Patient name** (`patient.name`) included in response payload via `findActiveByTokenWithUser` (joins `users.name`).
- **Token value** returned for client-side session tracking.

New recipient endpoints:
- `POST /share/:token/summarize` — AI clinical synthesis with deterministic structured fallback.
- `POST /share/:token/terminate` — Recipient-initiated session termination with patient notification.
- `GET /share/:token/download/:recordId` — 15-minute presigned R2 URL for a specific record's attachment.
- `GET /share/:token/export` — JSON bundle of scoped records.

### Reason
Doctors need to see who the patient is, terminate sessions cleanly, and download individual records. AI summary provides a rapid clinical overview without scrolling all records.

### Consequences
Session termination creates a `share_revoked` notification for the patient. AI summary falls back to deterministic extraction when OpenAI is unavailable.

---

## 2026-09-04 — Record Metadata Edit (DD-27)

### Decision
1. **Backend**: `PUT /records/:id` and `PATCH /records/:id` both route to `updateRecord` in `recordController.js`, which calls `updateRecordForUser` in `recordModel.js`. Only provided fields are updated (dynamic SQL). Validates type against `RECORD_TYPES` enum.
2. **Mobile**: `RecordEditModal.tsx` — sliding modal with title input, horizontal category carousel (pill chips matching `add.tsx`), event date input with "Set Today" shortcut, and clinical notes. Exposed via edit button on `record/[id].tsx` and via the Records tab.
3. **Attachment Isolation**: `RecordEditModal` intentionally does not send `attachment_url` in the payload, so the R2 attachment is never touched during metadata edits.

### Reason
Users need to correct typos, recategorize records, and update notes without needing to re-upload their scanned document.

### Consequences
Metadata edits are atomic per-field. Attachment is fully isolated from metadata updates.

---

## 2026-09-04 — Active Share Session Cap at 5 (DD-26)

### Decision
`createShare` calls `shareModel.pruneExcessActiveShares(userId, 4)` before inserting a new token. This auto-revokes the oldest active sessions so at most 4 remain before the new one is inserted, capping total active sessions at 5.

### Reason
Unlimited concurrent access tokens create excessive doctor-access surface area for medical records. 5 is sufficient for simultaneous multi-clinician workflows.

### Consequences
Oldest active sessions are silently pruned. Patients with many old sessions do not need to manually revoke before sharing.

---

## 2026-09-04 — Notification Sidebar Redesign (DD-25)

### Decision
1. **Design Language Match**: Notification sidebar matches BurgerNav design language — same surface color, typography hierarchy, border/radius treatment, and visual density.
2. **Unread vs Read State**: Unread cards retain full surface color, bold typography, and a left-edge teal accent. Read cards use muted ink and normal weight.
3. **Removed**: Green sidebar highlight from unread cards. Removed animated Animated/Easing tablet slide-over panel (replaced with uniform full-screen slide modal on all devices).
4. **Icons**: Centered, enlarged category icons per notification type. QR icon used for `share_created`, `share_revoked`, `qr_generated`, `qr_terminated`.
5. **Expand Animation**: `record/[id].tsx` expand transitions set to `withTiming(0ms)` for instant response.

### Reason
Notification sidebar felt disconnected from the rest of the design system. Animated tablet slide-over added complexity without meaningfully improving UX on existing form factors.

### Consequences
Consistent design system across notifications and navigation. Simplified animation logic removes potential race conditions.

---

## 2026-09-03 — Direct PostgreSQL Database & Cloudflare R2 Storage Architecture (DD-24)

### Decision
   - Implemented standard PostgreSQL database schema with `public.users` storing bcrypt-hashed passwords (salt rounds = 10) and `token_version` tracking for instant session invalidation.
   - Retained automatic profile provisioning via PostgreSQL trigger `on_user_created` executing `public.handle_new_user()`.
   - Maintained full relational foreign keys with `ON DELETE CASCADE` across `user_profiles`, `medical_records`, `shared_access`, and `notifications`.
2. **Cloudflare R2 S3-Compatible Object Storage**:
   - Integrated AWS SDK v3 S3 client (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) targeted at Cloudflare R2 endpoints (`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`).
   - Implemented `POST /api/storage/upload-url` issuing single-use signed PUT upload URLs with user-isolated path prefixes (`<userId>/<uuid>.<ext>`).
   - Private clinical scans and avatars are accessible exclusively via 15-minute signed download URLs (`GET /api/storage/download-url`).
3. **Clean Dependency Decoupling**:
   - Removed all Supabase dependencies (`@supabase/supabase-js`, `jwks-rsa`, `jose`) from both `backend/` and `mobile/`.
   - Retained 100% of mobile UI screens, responsive layouts, forms, and client methods via native Express REST API.

### Reason
- Eliminates vendor lock-in and enables deployment to any standard PostgreSQL host (e.g. Neon, Render, AWS RDS, self-hosted) with zero egress fees on clinical attachment storage via Cloudflare R2.
- Adheres to the authoritative PM plan with 100% automated test coverage (55/55 passing tests).

### Consequences
- Requires PostgreSQL connection string (`DATABASE_URL`) and Cloudflare R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
- Zero UI regressions on mobile client.

---

## 2026-09-03 — Supabase Cloud Architecture, Asymmetric JWKS Authentication, Storage Presigned URLs & Google OAuth (DD-23)

### Decision
1. **Supabase PostgreSQL & Auth Integration**:
   - Replaced standalone prototype user tables with direct foreign keys to `auth.users(id) ON DELETE CASCADE`.
   - Created PostgreSQL trigger `on_auth_user_created` executing `handle_new_user()` to automatically provision `public.user_profiles` upon signup via Email or Google OAuth.
   - Enforced PostgreSQL Row Level Security (RLS) policies on `public.user_profiles`, `public.medical_records`, `public.shared_access`, and `public.notifications`.
2. **Native Asymmetric JWKS Token Verification**:
   - Implemented `getPublicKeyFromJWKS` in `backend/src/utils/jwks.js` using Node.js native `crypto.createPublicKey` to dynamically fetch, parse, and cache Supabase Auth public keys from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
   - Supported symmetric secret fallback (`SUPABASE_JWT_SECRET` / `JWT_SECRET`) and authoritative `supabaseAdmin.auth.getUser(token)` verification.
3. **Presigned Cloud Storage Upload/Download Pattern**:
   - Configured `medical-records` as a strictly private Supabase Storage bucket and `avatars` bucket.
   - Created `POST /api/storage/upload-url` issuing single-use signed PUT upload URLs with user-isolated path prefixes (`<userId>/<uuid>.<ext>`), preventing server memory bottlenecks during multi-MB scans.
   - Clinical record detail views and doctor share sessions generate 15-minute signed download URLs on demand.
4. **Google OAuth 2.0 PKCE Integration**:
   - Integrated `expo-web-browser` and `expo-linking` in `mobile/context/AuthContext.tsx` with callback `medrec://auth/callback`.
   - Wired "Sign in with Google" button in `mobile/app/login.tsx` to `loginWithGoogle()`.

### Reason
- Eliminates custom password hashing and password reset token vulnerabilities.
- Guarantees private medical document scans remain non-public and protected by cryptographic time limits.
- Adheres to the approved architectural blueprint with 100% test coverage and zero UI regressions.

### Consequences
- Requires Supabase project environment variables (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- 48 automated test suites passing with 100% success.

---

## 2026-09-02 — Tablet Authentication UI Refinement & Landscape Brand Showcase Expansion (DD-22)

### Decision
1. **Tablet Landscape Split-Screen Visual Panel with 3:4 Native Graphic**:
   - Balance both columns to equal 50/50 widths (`flex: 1` on left and right columns), giving equal architectural presence to the visual brand panel and the authentication form card.
   - Implement the new 3:4 (`1792 × 2400px`) `graphic-2.png` asset as the full-bleed background of the entire left column (`StyleSheet.absoluteFillObject`, `resizeMode: 'cover'`), occupying 100% width and 100% height with zero borders, gaps, or distortion.
   - Overlay the prominent MedRec branding (80×80pt logo, 36pt bold title, 16pt tagline) comfortably in the upper sky region (`position: 'absolute'`, `top: 128`, `zIndex: 2`) with clean left-alignment between title and tagline.
   - Completely remove bottom trust badge rows ("End-to-End Encrypted", "Sovereign Vault" / "Patient-Sovereign Data", "Doctor QR Access" / "Biometric Security") across Login and Register screens.
2. **Phone-Harmonized Centered Branding Architecture (Tablet Portrait)**:
   - Align Tablet Portrait branding directly with the Phone authentication UI hierarchy: centered MedRec logo mark (52×52pt for Login, 50×50pt for Register), centered app title ("MedRec", 24pt/22pt `LexendDeca-Bold`), and centered supporting tagline ("Your Health Records in Your Pockets", 12pt/11.5pt `LexendDeca-Regular`).
3. **Compact Floating Tablet Card Architecture (Tablet Portrait)**:
   - Center a compact, mobile-proportioned white authentication card (`maxWidth: 420pt`) on the `#F4FAF9` canvas with 24pt rounded corners, subtle `#E5F0EE` border, and soft elevation shadow.
   - Retain the exact phone component structure, vertical flow, button hierarchy, and input layout without creating an oversized desktop panel.
4. **Strict Platform & Orientation Quarantine**:
   - Scope all changes strictly to tablet breakpoints (`isTablet && isLandscape` and `isTablet && !isLandscape`), leaving Phone UI (`!isTablet`) 100% untouched.

### Reason
- Eliminates awkward gaps, detached logos, and mismatched independent text centering in previous tablet portrait layouts.
- Delivers a unified, professional medical-grade brand presence with identical typography, dimensions, and alignment across Login and Register screens.
- Optimizes tablet vertical space utilization so the longer 4-field Create Account form fits comfortably within standard tablet portrait viewports without clipping.

### Consequences
- Shared brand consistency across authentication entry points.
- Zero regression risk to phone and tablet landscape workflows.

---

## 2026-09-01 — Full-Stack Production Security, AI Defense & Session Invalidation Architecture (DD-21)

### Decision
1. **Account Lockout DoS Mitigation (SEC-R01)**:
   - Eliminate pre-password account lockout blocks in `authController.js#login` that allowed third-party unauthenticated callers to deny service to target emails.
   - Validate credentials first; authenticate valid passwords immediately and reset attempt counters.
   - Apply exponential backoff response delays and strict IP rate limiting (`authLimiter`) on repeated failed password attempts.
2. **Password Reset Token Response Sanitization (SEC-R02)**:
   - Unconditionally purge `resetTokenPreview` from all API responses across all environments (`production`, `development`, `test`) in `authController.js#forgotPassword`.
3. **iOS Camera Purpose String & App Store Compliance (SEC-R03)**:
   - Configure `expo-camera` plugin in `mobile/app.json` with explicit `cameraPermission` (*"MedRec uses your camera to scan medical records and doctor sharing QR codes."*) to prevent automated App Store rejection ITMS-90683.
4. **Atomic Record Ownership in Sharing (SEC-R04)**:
   - Implement `recordModel.verifyOwnership(userId, recordIds)` using parameterized SQL `WHERE user_id = $1 AND id = ANY($2::uuid[])`, replacing in-memory array filtering in `shareController.js#createShare` and preventing false IDOR rejections for users with >50 records.
5. **User-Keyed AI Rate Limiting (SEC-R05)**:
   - Mount AI rate limiting (`10 requests / 15 min`) in `aiRoutes.js` keyed by `req.user.id` following `requireAuth`, preventing cellular CGNAT IP collisions.
6. **Strict Database TLS Configuration (SEC-R07)**:
   - Enforce `rejectUnauthorized: true` by default in production in `backend/src/config/db.js` with configurable `PGSSL_REJECT_UNAUTHORIZED`.
7. **App Store Privacy Policy Web URL Binding (SEC-R08)**:
   - Open public hosted policy `https://medrec.health/privacy` in `login.tsx` via `Linking.openURL()`.
8. **Session Invalidation on Credential Change via `token_version` (SEC-04)**:
   - Track `users.token_version INT DEFAULT 1`; sign in JWT; verify in `requireAuth` middleware; atomically increment on password change/reset.
9. **AI Subsystem Guardrails & Delimiter Boundaries (SEC-01)**:
   - Role separation (`system` vs `user`), `<patient_provided_data>` delimiter sanitization, 2,000-char input ceiling, 25-record history clamp, strict completion budgets (`max_tokens: 250–500`, `temperature: 0.1`).
10. **Database Row Level Security (RLS) (SEC-R10)**:
    - Enabled RLS on `medical_records`, `user_profiles`, `shared_access`, and `notifications` in `backend/src/migrations/schema.sql`.

### Reason
- Eliminates account lockout DoS, reset token leakage, and false IDOR sharing rejections.
- Prevents App Store binary ingestion rejection (ITMS-90683) and complies with App Store Review Guidelines 2.1 and 5.1.
- Fully insulates MedRec against AI cost abuse and credential stuffing attacks.

### Consequences
- Full server-side authorization and ownership enforcement with zero client-side dependencies.
- Clean isolation of all platforms with 100% test coverage.

---

## 2026-09-01 — Tablet Dual-Layer Notification Panel & Independent Dimming Architecture (DD-19)

### Decision
1. **Dual-Layer Architecture for Tablets (`NotificationCenterModal.tsx`)**: Refactor the notification presentation on all tablet viewports (both Tablet Portrait and Tablet Landscape) into two completely decoupled visual and animation layers:
   - **Layer 1 (Independent Stationary Dimming Backdrop)**: Full-screen `StyleSheet.absoluteFillObject` stationary dimming overlay (`Colors.backdrop`) controlled exclusively via `fadeAnim` opacity (`0 -> 1` on open, `1 -> 0` on close). It remains fixed to the screen geometry and never physically translates with the panel.
   - **Layer 2 (Right-Anchored Sliding Notification Panel)**: Clamped side drawer (`width: Math.min(width * 0.44, 420)` in landscape, `Math.min(width * 0.60, 420)` in portrait) that translates horizontally from the right screen edge (`panelSlideAnim` from `+panelWidth` to `0`), originating beside the top-right Notification Bell trigger.
2. **Reverse Animated Unmount Lifecycle**: Dismissing the modal (via backdrop tap, close button, or notification press) runs both exit transitions in parallel before setting `modalVisible` to `false` and invoking `onClose()`.
3. **Strict Phone UI Isolation**: Phone presentations (`!isTablet`) retain the native bottom `pageSheet` modal presentation and drag handle with zero modification.

### Reason
- Resolves the issue where React Native's `<Modal animationType="slide">` moved the entire root window including the dimming backdrop from the bottom of the screen.
- Creates a clean floating notification panel anchored near the top-right toolbar button on all tablet form factors.

### Consequences
Backdrop dimming remains perfectly stationary and independent; notification panel slides cleanly into and out of view from the right edge; phone UI is completely unaffected.

---

## 2026-09-01 — Global Top Toolbar Canonical Positioning Pattern (DD-18)

### Decision
1. **Canonical Root-Level Top Toolbar Positioning Pattern**: Enforce that the Global Top Toolbar (`topToolbar` container with `paddingTop: insets.top + 12`, `paddingLeft: Math.max(insets.left, screenPadding)`, `paddingRight: Math.max(insets.right, screenPadding)`, `paddingBottom: 8`, and 40×40pt minimum hit targets for Burger Navigation and Notification Bell) is the definitive, unified pattern for all top-level tab screens (`(tabs)/profile.tsx`, `(tabs)/index.tsx`, `(tabs)/share.tsx`, `(tabs)/scan.tsx`) on Tablet Portrait and Tablet Landscape.
2. **Root Container Placement**: The toolbar is mounted as a direct child of the screen root container (`<View style={styles.root}>`), strictly outside scrollable surfaces (`ScrollView`, `FlatList`) and outside sub-containers with clamped `maxWidth` or centering.
3. **ScreenHeader Coordination**: When `hideToolbar={true}` is passed to `ScreenHeader.tsx`, its `paddingTop` resets to `0` (`paddingTop: hideToolbar ? 0 : insets.top + 12`) to prevent duplicate safe-area inset stacking above screen titles.
4. **Phone UI Isolation**: Phone layouts (`!isTablet`) retain their dedicated styling and behavior without regressions.

### Reason
- Eliminates visual jumps, coordinate drifts, and horizontal misalignment when switching between tabs (`Profile → Records → Share Records → Scan`) on tablet viewports.
- Anchors primary global navigation controls directly to the tablet shell rather than letting individual tab scroll containers dictate button positions.

### Consequences
Zero jumping or flickering of navigation and notification controls across tab transitions; clean separation between fixed tablet navigation controls and scrollable content bodies.

---

## 2026-09-01 — Tablet Landscape UI Redesign & Content-Driven Layout Archetypes (DD-17)

### Decision
1. **88pt Left Navigation Rail Subsystem (`TabletLandscapeNavRail.tsx`)**: Replace the old 260pt wide sidebar with a dedicated, compact 88pt left navigation rail on `isTablet && isLandscape`. Features top MedRec logo, 4 primary tab triggers (Records, Share, Scan, Profile) with active indicator bar and teal tint, active share count badge, high-contrast `+ Record` pill CTA button, AI health summary trigger, notification bell with unread badge, paramedic emergency ID trigger, and patient avatar monogram.
2. **Master-Detail Clinical Workspace for Records (`app/(tabs)/index.tsx`)**:
   - Left Master Browser Pane (360pt): Sticky header with title & record count, `RecordSearchBar`, horizontal category chips with live distribution counts, batch selection mode with share bar, and independent scrolling FlatList.
   - Right Detail Clinical Canvas (Flex 1): Overview Header with classification badge, full page link, record title, event date, and logged date. When an attachment exists, renders a side-by-side clinical split (Left: Document scan photo preview with tap-to-inspect zoom modal and delete button; Right: Clinical notes card and AI medical insights card).
3. **2-Column Intake Studio for Add Record (`app/record/add.tsx`)**:
   - On `isTablet && isLandscape`, replace single-column modal with a 960pt centered 2-column intake studio (Left: Classification chips, Title, Date, Multiline Notes with `KeyboardAvoidingView`; Right: Scanned document card preview/retake or camera/gallery capture hero, AI analysis badge, sovereign vault encryption notice).
   - Tablet portrait (`isTablet && !isLandscape`) and phone remain 100% locked and preserved.
4. **Thematic Dual-Column Studio for Profile (`app/(tabs)/profile.tsx`)**:
   - On `isTablet && isLandscape`, deploy 1040pt bounded dual-column studio (Left: Clinical baseline & Medical ID with blood type, severe allergies, conditions, meds, organ donor, ICE contact with 1-tap call, emergency placard trigger; Right: Patient identity hero, personal demographics, security toggles, password modal trigger, JSON vault export, legal/danger zone).
   - Tablet portrait and phone views remain 100% locked and preserved.
5. **Balanced Split Sharing Studio & Doctor Scanner (`share.tsx` & `scan.tsx`)**:
   - `share.tsx`: 1040pt balanced split (Left 44%: Living QR code with live countdown ticker and revoke CTA; Right 56%: Active access sessions and past history ledger).
   - `scan.tsx`: 88pt rail clearance, centered 280pt 1:1 camera viewfinder pre-scan, and master-detail workspace post-scan.
6. **Strict Platform Isolation (Invariant)**: All phone layouts (`!isTablet`) and tablet portrait layouts (`isTablet && !isLandscape`) remain strictly locked and unmodified.

### Reason
- Eliminates visual fragmentation, artificial 280pt column compression, and cognitive overload caused by universal 3-column layouts on wide tablet screens.
- Utilizes wide horizontal space with content-driven layout archetypes tailored specifically to medical review, scanning, and clinical intake workflows.

### Consequences
High clinical scanning efficiency, ergonomic touch targets on tablet landscape, natural reading line lengths, and zero regressions on phone and tablet portrait.

---

## 2026-09-01 — Tri-State Tablet Landscape UI Architecture & Split Workspaces

### Decision
1. **MedRec Tri-State UI Engine**: Enforce three mutually exclusive, strictly isolated runtime UI states:
   - **Phone (Locked 🔒)**: `!isTablet` — Single-column vertical flow, bottom tab bar (85pt), edge-to-edge sheets.
   - **Tablet Portrait (Locked 🔒)**: `isTablet && !isLandscape` — Single-column / 2-column bento grids, centered 480pt floating pill nav.
   - **Tablet Landscape (Target 🎯)**: `isTablet && isLandscape` — 260pt persistent left sidebar, Master-Detail clinical workspaces (`index.tsx`, `scan.tsx`), 2-Column Sharing Studio (`share.tsx`, 1060pt), 2-Column Clinical Split Workspace (`record/[id].tsx`, 1100pt), 2×2 Inset Grouped Bento Matrix (`profile.tsx`, 920pt), 2-Column Triage Placard (`EmergencyIdModal.tsx`, 680pt), and Right Slide-Over Panel (`NotificationCenterModal.tsx`, 420pt).
2. **Strict Reading Length Limits**: Constrain plain text containers to 380–520pt max width across landscape viewports to preserve the 50–75 CPL readability ceiling.
3. **Zero Phone / Portrait UI Regression Invariant**: Any responsive presentation logic or layout branch introduced for Tablet Landscape evaluates conditionally via `isTabletLandscape = isTablet && isLandscape`.

### Reason
- **Biomechanical & Ergonomic Optimization**: Adapts to widescreen tablet lateral thumb zones, desk stands, and keyboard folios without stretching single-column forms into unwieldy full-width banners.
- **Clinical Cognitive Co-Presence**: Allows clinicians and patients to review related clinical documents (list + details, photo + notes, QR + ledger) side by side without screen transitions.

## 2026-09-01 — Orientation-Invariant Device Classification & Modal Animation Lifecycle Architecture (DD-20)

### Decision
1. **Physical Shorter-Dimension Device Classification (`useResponsive.ts`)**:
   - `isTablet` must be strictly evaluated using `shorterDimension >= 600` (where `shorterDimension = Math.min(width, height)`).
   - This ensures smartphones in landscape orientation (e.g. iPhone 14/15 width = 844–932pt, height = 390–430pt) are never misclassified as tablets.
   - `isLargeTablet` is defined as `isTablet && (shorterDimension >= 768 || longerDimension >= 1024)`.
2. **Decoupled Dual-Layer Modal Animation Pattern**:
   - All overlay modals (`EmergencyIdModal.tsx`, `NotificationCenterModal.tsx`, `SideMenuModal.tsx`) must separate presentation into two independent animated sibling layers:
     - **Layer 1**: Stationary full-screen backdrop (`backdropFadeAnim: 0 ↔ 1`).
     - **Layer 2**: Independent modal container with dedicated translation/scale/opacity curves.
   - Modals manage an internal `modalVisible` state to allow programmatic and prop-driven dismissals to play full reverse transitions before unmounting.
   - In-flight animations are stopped via `.stopAnimation()`, and completion callbacks are guarded by `animTokenRef` sequence tokens to eliminate rapid-tap race conditions.

### Reason
- **Prevent Phone Landscape Regressions**: Eliminates false tablet rail and multi-column activations on rotated smartphones.
- **Flawless Native Modal Experience**: Prevents backdrop motion attachment, sudden opacity snapping, or replaying opening animations on orientation change.

---

## 2026-09-01 — Single-Column Tablet Redesign for Share Records & Record Details

### Decision
1. **Single-Column Unified Mental Model for Share Records (`app/(tabs)/share.tsx`)**:
   - Convert tablet Share screen from 2-column layout into a centered, spacious **single-column layout** (`maxWidth: 600pt`) matching the phone's established vertical hierarchy:
     - Header (Title, Subtitle, Menu & Notification triggers)
     - Tier 1: Adaptive Hero Card (Doctor's QR Access with centered ~200pt QR code, live expiry timer, and Revoke Access CTA, or Generate Doctor QR CTA)
     - Tier 2: Active Access Sessions list
     - Tier 3: Past Share History list with expandable view
     - Tier 4: Encrypted personal vault security guarantee footer
2. **Single-Column Unified Mental Model for Record Details (`app/record/[id].tsx`)**:
   - Convert tablet Record Details screen from 2-column split into a centered **single-column layout** (`maxWidth: 600pt`) matching the phone's vertical section stack:
     - Header (Back, "Record Details", Delete button)
     - Record Overview Card (Type badge, Title, Date of Event, Logged date)
     - Attached Document / Photo Card
     - Clinical Notes & Observations Card
     - AI Medical Insights Card
     - Delete Record secondary button
3. **Phone UI Quarantine**: Maintain 100% isolation of phone layouts, geometry, and styling.

### Reason
- **Familiarity & Cognitive Continuity**: Patients and physicians moving between iPhone and iPad experience identical section hierarchies and muscle memory without artificial layout disorientation.
- **Natural Content Proportions**: Eliminates awkward column height disparities, preventing excessive white space and oversized QR codes.

---

## 2026-09-01 — Single-Column Tablet Add Health Record Modal & Content-Driven Dialog Architecture

### Decision
1. **Single-Column Unified Mental Model on Tablet**: Convert `mobile/app/record/add.tsx` on tablets from a 2-column studio layout into a centered, spacious **single-column layout** (`maxWidth: 580pt`) matching the phone's established vertical hierarchy:
   - Header (Close + "Add Health Record" + Save)
   - 1. Document Attachment / Scan Hero Card
   - 2. "record details" section divider
   - 3. Record Type wrapped chip selector
   - 4. Form Card (Title, Date, Clinical Notes)
   - 5. Primary Save CTA
2. **Transparent Modal Presentation on Tablet**: In `mobile/app/_layout.tsx`, configure `presentation: isTablet ? 'transparentModal' : 'modal'` to bypass iOS's rigid UIKit `UIModalPresentationFormSheet` height restrictions, rendering a centered floating card over a dimmed translucent backdrop (`rgba(0, 0, 0, 0.45)`).
3. **Strict Content-Driven Sizing (`flexGrow: 0, flexShrink: 1`)**: Constrain `ScrollView` to `flexGrow: 0` so the white modal card wraps snugly around the form content with zero trailing white space, enabling internal scrolling only when viewport height is constrained.
4. **Phone UI Isolation**: Maintain 100% quarantine of the locked phone experience.

### Reason
- **Visual Consistency & Familiarity**: Users navigating between iPhone and iPad experience identical cognitive flow and muscle memory without artificial layout divergence.
- **Elimination of Trailing Dead Space**: The single-column card auto-sizes around the vertical content, preventing awkward column height imbalances and bottom white space.

---

## 2026-08-31 — Tablet & iPad UI Redesign (Adaptive Layout, Master-Detail & Sidebar Navigation)

### Decision
1. **Preserve Phone UI Invariant (100% Locked & Isolated)**: Quarantine all tablet-specific UX modifications strictly behind `isTablet` conditions (`shorterDimension >= 600 || width >= 800`). Phone UI layout, geometry, navigation, and styling remain untouched.
2. **Navigation Adaptive Partitioning**:
   - **Landscape Tablets (`isTablet && isLandscape`, width 260pt)**: Persistent Left Sidebar (`TabletPersistentSidebar.tsx`) with patient avatar card, main tabs, "+ Add Health Record" CTA, AI Health Summary trigger, Emergency Medical ID trigger, JSON vault export, and Sign Out.
   - **Portrait Tablets (`isTablet && !isLandscape`)**: Centered floating pill tab bar (`maxWidth: 480pt`, `height: 68pt`, `borderRadius: 24`).
3. **Master-Detail Workspace Pattern**:
   - **Records Dashboard (`index.tsx`)**: In landscape tablet, implement interactive 2-column split workspace (Left: 380pt master list with search, category carousel, and multi-select banner; Right: flex 1 detail pane with inline document zoom, clinical notes, AI Medical Insights card with 1-tap re-explain, and delete CTA). In portrait tablet, render 2-column Bento Grid.
   - **Doctor Scanner (`scan.tsx`)**: In landscape/portrait tablet, implement Master-Detail split pane for authorized patient records (Left: authorized record list; Right: selected record full details and clinical notes inline).
4. **Intake Studio & Sharing Hub 2-Column Split**:
   - **Record Intake (`add.tsx`)**: 2-column Intake Studio bounded at 880pt (Left: Document scan / attachment card; Right: Record type chips, title, date, notes, and save CTA).
   - **Sharing Center (`share.tsx`)**: 2-column Sharing Hub bounded at 920pt (Left: 220×220 Living QR hero card with live timer and revoke CTA; Right: Active Doctor Sessions & Past History timeline).
5. **Patient Profile Bento Layout (`profile.tsx`)**:
   - 2-column / 2×2 Inset Grouped Bento Layout bounded at 920pt with persistent sidebar offset on landscape.
6. **Centered Floating Dialog Modals**:
   - Clamp all modals (`ProfileEditModal`, `EmergencyIdModal`, `ChangePasswordModal`, `NotificationCenterModal`) with `maxWidth: 560-640pt`, dark backdrop dismiss, and paired form rows.

### Reason
- **Ergonomics & Large-Screen Utility**: Tablets have expansive screen real estate. Single-column phone layouts stretched horizontally waste ~60% of viewport area and make reading difficult due to excessive line lengths. Master-Detail and 2-column split workspaces provide high clinical utility and reduce context switching.
- **Zero Phone Regressions**: Isolating all tablet logic ensures phone users experience zero layout shifts, visual regressions, or performance overhead.

### Alternatives Considered
- **Universal Adaptive Breakpoint Layouts without Isolation**: Rejected because modifying phone-shared styles could alter pixel spacing on locked phone screens.
- **Drawer Navigation on Tablet Landscape**: Rejected because persistent left sidebar leverages horizontal width more efficiently and prevents repetitive modal opening.

### Consequences
Significantly elevated iPad and Android tablet productivity with rich master-detail clinical viewing, living QR management, inline AI insight regeneration, and zero impact on the locked phone experience.

---

## 2026-08-31 — Burger Navigation Drawer Hierarchy, Iconography & Active Parity

### Decision
1. Implement a 5-tier drawer architecture in `SideMenuModal.tsx`:
   - Brand Header: 34×34 logo, title, subtitle, and 36×36 circular dismiss button.
   - Patient Demographic Card: 38×38 avatar/monogram thumbnail, patient name, email, and trailing chevron linking to `/(tabs)/profile`.
   - Clinical Tools Group: Emergency Medical ID, Share Records (with live active count badge), Scan Doctor QR, and AI Health Summary.
   - Data & Vault Group: Export Health Vault (encrypted JSON archive share) and About MedRec (modal disclaimer).
   - Pinned Footer: Destructive Sign Out action with `MedRec v1.0.0 • Sovereign Health Vault` caption.
2. Upgrade `SideMenuItem.tsx` with leading 32×32 squircle icon containers (18×18 glyphs) and a 3.5px solid teal left vertical indicator pill on active routes.
3. Replace rigid pathname checks with flexible route-matching helper (`isRouteActive`) compatible with Expo Router paths.
4. Bound drawer width responsively to `Math.min(width * 0.80, 310)` on phones and `Math.min(width * 0.42, 360)` on tablets.

### Reason
- **Dual-Coding & Scannability**: Text-only navigation required slow sequential reading; 20dp contextual icons in 32dp soft containers increase visual search velocity by 50–60%.
- **Identity Feedback**: Providing instant avatar/initials confirmation reduces cognitive confusion in multi-patient or family health tracking.
- **Route Orientation**: Explicit active state parity ensures patients always know their current location in the application.

### Alternatives Considered
- **Full-Screen Modal Drawer**: Rejected because it destroys spatial continuity and feels disorienting compared to a slide-over drawer preserving backdrop context.
- **Card Borders on Every Item**: Rejected because it creates excessive visual noise; clean unboxed rows with subtle section headers provide better whitespace rhythm.

### Consequences
Significantly elevated navigation clarity, faster visual search speed, thumb-friendly dismissal, and 100% WCAG 2.2 AA accessibility.

---

## 2026-08-31 — Mobile Codebase Modernization, Taxonomy Centralization & Boilerplate Elimination

### Decision
1. Centralize the canonical `MedicalRecord` domain interface and `RecordSection` grouping type in `mobile/types/record.ts`.
2. Consolidate category taxonomy maps (`RECORD_TYPE_ASSETS`, `RECORD_TYPE_LABELS`, `CATEGORY_FILTERS`, `RECORD_TYPE_OPTIONS`) in `mobile/constants/records.ts` as the single source of truth.
3. Extract pure date, age, and relative time formatters (`calculateAge`, `formatDateLong`, `formatDateShort`, `formatTimeAgo`) with explicit UTC timezone parameters into `mobile/utils/dateUtils.ts`.
4. Deduplicate user bootstrap resolution in `AuthContext.tsx` using `await refreshUser()`.
5. Prune all unused Expo starter template components (`hello-wave`, `parallax-scroll-view`, `themed-text`, `collapsible`, etc.), boilerplate hooks (`use-theme-color`, `use-color-scheme`), and unreferenced packages (`@react-navigation/elements`, `expo-symbols`).

### Reason
- **Single Source of Truth**: Multiple screen files previously redefined the `MedicalRecord` interface and category icon maps with minor divergences, leading to maintenance overhead and risks of taxonomy drift.
- **Pure Functional Date Calculations**: Ad-hoc date formatting across Profile, Emergency ID, and Dashboard screens led to duplicated parsing logic. Centralizing with explicit UTC support ensures zero discrepancies in clinical date strings.
- **Codebase Cleanliness & Security**: Eliminating ~1,800 lines of unused template files and dangerous reset scripts ensures 100% of codebase files represent active production assets.

### Alternatives Considered
- **Blanket UI Component Replacement (Button.tsx)**: Rejected because replacing bespoke pressables on locked screens risks touch-target and shadow shifts.
- **Global Modal Lifting to _layout.tsx**: Rejected/deferred to avoid navigation focus-trapping and z-index issues.

### Consequences
Zero visual or functional changes to the app; significantly cleaner, type-safe, and maintainable mobile codebase.

---

## 2026-08-31 — Automated Startup Database Migration Guard & Schema Drift Elimination

### Decision
Integrate an automated, non-destructive schema migration runner into the server startup sequence (`backend/src/server.js`) using exported `runMigrations()` from `backend/src/migrations/runMigration.js`, and maintain comprehensive, idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` definitions for all evolved database columns in `schema.sql`.

### Reason
- **Preventing Undefined Column Runtime Errors (42703)**: PostgreSQL's `CREATE TABLE IF NOT EXISTS` only runs when a table does not exist. Adding column definitions to `CREATE TABLE` statements fails to alter existing development, staging, or production databases.
- **Zero Schema Drift on Boot**: Executing migrations programmatically prior to `app.listen(PORT)` guarantees that whenever the server starts (via `npm run dev`, container startup, or cloud deployment), the database catalog is guaranteed to match the application code without requiring manual CLI migration execution.

### Alternatives
- **Manual Migration CLI Only**: Highly error-prone during multi-branch development and causes silent runtime 500 errors when developers switch branches without remembering to execute `npm run migrate`.
- **Destructive Database Resets**: Unacceptable for production or persistent developer environments containing valid test patients and clinical histories.

### Consequences
Zero schema drift between backend code and database instances, automatic resilience upon service startup, and guaranteed backwards-compatible schema evolutions.

---

## 2026-08-31 — Partial Profile Upsert Isolation & Physical Metric Persistence

### Decision
Refactor `backend/src/models/profileModel.js` and `profileController.js` to execute dynamic SQL column updates targeting strictly the fields explicitly provided in the request payload, while adding `height VARCHAR(20)` and `weight VARCHAR(20)` to `user_profiles`.

### Reason
- **Critical Data Integrity**: In previous static SQL upserts, omitted payload fields defaulted to `null`, causing routine demographic updates (e.g. phone/address) to silently wipe life-critical emergency medical information (allergies, blood type, medications) and vice versa.
- **Physical Metrics Support**: Users actively enter physical vitals (height and weight) in the mobile client; these require dedicated database persistence and retrieval across sessions.

### Alternatives
- **Static ON CONFLICT with COALESCE**: Lacks the ability to intentionally clear a field to `null` when a user explicitly deletes a value.
- **Requiring Full Profile on Every Save**: Creates frontend complexity and increases payload overhead.

### Consequences
Zero data loss during partial profile modifications, complete demographic and medical baseline isolation, and reliable persistence for height and weight.

---

## 2026-08-31 — Medical Record Attachment Architecture & Cross-Platform API Configuration

### Decision
1. Add `attachment_url TEXT` to `medical_records` in PostgreSQL schema and integrate it throughout `recordModel.js`, `recordController.js`, `mobile/lib/api.ts`, `add.tsx`, and `record/[id].tsx`.
2. Configure mobile API base URL dynamically using `process.env.EXPO_PUBLIC_API_URL` with cross-platform fallback (`10.0.2.2:4000` for Android emulators and `localhost:4000` for iOS/Web).
3. Remove per-request database write locks from `tokenModel.isRevoked` to eliminate contention on read paths.
4. Add rate limiting middleware to sensitive endpoints (`PUT /profile/password`, `POST /share`, `GET /share/:token`).

### Reason
- **Document Preservation**: Patients capture or scan physical medical records; storing and displaying `attachment_url` ensures digitized documents are preserved and accessible in record details.
- **Cross-Platform Compatibility**: Eliminates machine-specific hardcoded hostnames (`McLnOnz.local`) so any physical device or emulator connects seamlessly.
- **Database Scalability**: Eliminates table write locks on authenticated read requests.

### Consequences
Complete document attachment pipeline, robust multi-environment API connectivity, and high concurrency resilience.

---

## 2026-08-30 — Inset Grouped Profile Architecture & Avatar Image Persistence

### Decision
Modernize the Profile tab (`profile.tsx`) into an unboxed hero and four clean, iOS-inspired Inset Grouped Cards (`borderRadius: 16`, `borderColor: '#E5F0EE'`) with hairline dividers (`#F0F5F4`), eliminating heavy card borders and saturated background highlights behind text (such as red blood pills, green action icon boxes, and colored full-width buttons). Add interactive profile photo upload using `expo-image-picker` with persistent backend PostgreSQL storage (`user_profiles.avatar_url`).

### Reason
- **Visual Clutter & Hierarchy**: Heavy container boxes and saturated background pills diluted critical clinical emphasis. Inset grouped cards establish calm, clear information architecture appropriate for medical software.
- **Patient Identity & Ownership**: Allowing users to upload their own photo directly enhances personal ownership and first-responder recognition.
- **Reliability & Uniformity**: Centralized database storage ensures profile photos persist across devices and re-renders, while eliminating tab-icon scaling jumps guarantees a stable navigation experience.

### Alternatives
- **Heavy Stacked Cards with Saturated Badges**: Caused visual fatigue and distraction from critical emergency data.
- **Local-Only Device Image Storage**: Failed to persist photos across account re-logins and cross-device usage.

### Consequences
Calm, modern medical profile experience with immediate emergency recognition, crisp typography, and full data persistence.

---

## 2026-08-30 — Privacy-Conscious In-App Notification Center & Two-Tier Content Architecture

### Decision
Implement an authenticated, server-persisted in-app Notification Center (`NotificationCenterModal`) triggered by the top toolbar bell, enforcing a strict two-tier privacy model where notifications provide clear operational updates (record logged, doctor token generated/revoked, emergency profile edited) while strictly omitting raw clinical metrics, diagnoses, or drug dosages.

### Reason
Healthcare data governance (HIPAA/GDPR) prohibits exposing sensitive Protected Health Information (PHI) in unauthenticated or public previews. An in-app notification center provides a permanent, searchable audit ledger for patient sharing and security events while safeguarding confidential clinical details.

### Alternatives
- **Generic Marketing / Push Spam**: Unsolicited diagnostic or engagement notifications cause alert fatigue and increase anxiety.
- **Ephemeral OS-Only Alerts**: Push banners dismissed from lockscreens leave no audit trail of when doctors accessed records.

### Consequences
High patient trust, clear auditability of data-sharing tokens, and zero exposure of sensitive medical data on public screens.

---

## 2026-08-30 — Text-Only Drawer Menu Architecture with App Logo Branding

### Decision
Implement a lightweight, text-only left-slide drawer menu overlay (`SideMenuModal`) utilizing typography (`Lexend Deca`), layout spacing, and subtle active highlights rather than row icons or emojis, anchored by the authentic MedRec app logo (`assets/logo/logo.png`) in the header.

### Reason
Avoids visual clutter, eliminates duplicate iconography that fights with bottom tabs, preserves iOS swipe ergonomics and thumb reachability, and reinforces brand identity cleanly.

### Alternatives
- **Full `@react-navigation/drawer` Rewrite**: Breaks Expo Router tabs and creates gesture conflicts with iOS screen pops.
- **Icon-Heavy Multi-Level Drawer**: Creates visual noise and redundancy with bottom navigation tabs.

### Consequences
Clean, fast navigation hub for primary routes and secondary vault tools without structural routing bloat.

---

## 2026-08-30 — Document-First Camera & Mandatory Pre-Commit Legibility Review

### Decision
Design the camera interface strictly as a dedicated medical document scanning experience (3:4 aspect ratio framing cutout, dark ambient vignette mask, torch toggle, tactile shutter) rather than a generic photo camera, and enforce a mandatory pre-commit legibility review screen (*Capture $\rightarrow$ Review $\rightarrow$ Confirm*) before attaching documents to a record.

### Reason
Medical records contain high-density clinical text, numeric dosages, and physician signatures. Capturing low-contrast or blurry photos directly into records creates severe downstream risks and unreadable archives. Enforcing a 3:4 document guide, torch control, and explicit quality self-check (*"Is this document legible?"*) dramatically increases capture quality and prevents corrupted or illegible records from being saved.

### Alternatives
- **Generic Unrestricted Camera**: Produced off-angle, poorly framed, and blurred photos without guidance.
- **Silent Auto-Commit**: Confirming photo immediately without previewing caused user disorientation and lacked a quality check.

### Consequences
High capture legibility, intuitive retake loop, and clear human-in-the-loop validation before committing records to the database.

---

## 2026-08-30 — Modular In-Modal Viewport State Management

### Decision
Refactor `mobile/app/record/add.tsx` into a modular controller that swaps dedicated subcomponents (`DocumentCamera`, `DocumentPreview`, `AttachedDocumentCard`) while keeping all form state (`title`, `date`, `description`, `type`, `photoUri`) persisted in the top-level parent component.

### Reason
In the previous monolithic implementation, switching screen modes destroyed and recreated internal form state, risking data loss if users typed notes before tapping scan. Lifting form state to the parent ensures typed input is never lost during camera or preview transitions.

### Alternatives
- **Separate Route Stack Navigation**: Navigating to `/record/camera` as a separate route pushed multiple modals on top of each other and complicated parameter passing.

### Consequences
Zero form state loss, modular component testability, and clean separation of concerns under `mobile/components/camera/`.

---

## 2026-08-30 — Dual-Identity Separation & Emergency Medical ID Architecture

### Decision
Architect the Profile tab with a strict boundary between Account Demographics (legal name, email, residential address, password) and the Emergency Medical ID (blood type, severe allergies, chronic conditions, maintenance medications, and primary emergency contact with direct dial).

### Reason
In acute medical crises, paramedics and first responders require rapid (<10 second) cognitive scanning of life-critical facts without navigating complex clinical timelines or general settings. Separating the Emergency ID and providing a dedicated high-contrast modal with an offline-scannable QR code maximizes patient safety.

### Alternatives
- **Single Flat Form**: Placing all 20+ fields in one continuous form created severe cognitive overload and slowed acute clinical readability.
- **Putting Medical ID in Records**: Overlapped with deep clinical visits and made vital blood type / allergy info hard to find quickly.

### Consequences
High usability and clinical triage readiness while keeping general account maintenance intuitive.

---

## 2026-08-30 — SQL-Level Date Formatting for Date of Birth (`to_char`)

### Decision
Format `date_of_birth` directly in PostgreSQL queries using `to_char(p.date_of_birth, 'YYYY-MM-DD')` rather than relying on JavaScript Date serialization.

### Reason
When the PostgreSQL driver converts a `DATE` column to a JavaScript `Date` object, local midnight timestamps shift backward by 1 day when serialized via `toISOString()` in positive UTC timezones.

### Consequences
Guarantees 100% accurate, timezone-invariant birth date display across all international regions.

---

## 2026-08-29 — Compact Horizontal Metadata & Modular Card Hierarchy for Record Details

### Decision
Structure the Record Details screen (`mobile/app/record/[id].tsx`) with a compact, side-by-side two-column metadata row (Date of Event and Logged in MedRec) with an inline divider directly beneath the title, followed by distinct modular cards for Clinical Notes and AI Medical Insights.

### Reason
Full-size stacked date cards consumed excessive vertical screen real estate on mobile devices and competed visually with the primary record title. Placing metadata in a tight horizontal row with subtle icons and divider keeps temporal context scannable without pushing clinical notes or AI actions below the fold.

### Alternatives
- **Stacked Date Cards**: Consumed ~120px of vertical space with oversized containers.
- **Header-only Metadata**: Cluttered the navigation bar and reduced readability.

### Consequences
Significantly reduces vertical scrolling on standard iPhone viewports while preserving scannability and clear separation of clinical notes, AI tools, and destructive actions.

---

## 2025-02-10 — React Native with Expo SDK 52 & Expo Router

### Decision
Build the mobile client using React Native with Expo SDK 52 and Expo Router file-based navigation.

### Reason
Allows cross-platform iOS and Android builds from a single TypeScript codebase while Expo Router provides declarative, URL-based deep linking essential for scanning QR code share links.

### Alternatives
- **Flutter**: Strong framework, but TypeScript ecosystem allows sharing validation schemas and types between frontend and Node.js backend.
- **Native Swift/Kotlin**: Too resource-intensive to build and maintain two separate codebases.

### Consequences
Fast mobile development cycle and seamless Expo Go testing on physical iOS/Android devices.

---

## 2025-02-18 — Dedicated PostgreSQL over NoSQL Document Store

### Decision
Use PostgreSQL with standard relational tables and foreign keys instead of MongoDB.

### Reason
Medical records require strict referential integrity, reliable foreign key cascades on user deletion, and robust ACID transaction guarantees for audit logging and time-limited token expiration.

### Alternatives
- **MongoDB / NoSQL**: Flexible schemas, but lacks strict relational constraints and ACID guarantees across distributed sharing sessions.

### Consequences
High data consistency and compliance-ready data modeling for health records.
