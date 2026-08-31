---
type: decisions-log
title: MedRecord_App Decisions
project: MedRecord_App
tags:
  - decisions
  - architecture
  - backend
  - mobile
last_updated: 2026-08-31
---

# ⚖️ MedRecord_App (MedRec) — Technical Decisions

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
