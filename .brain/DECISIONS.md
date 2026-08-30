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
