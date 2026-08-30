---
type: decisions-log
title: MedRecord_App Decisions
project: MedRecord_App
tags:
  - decisions
  - architecture
  - backend
  - mobile
last_updated: 2026-08-29
---

# ⚖️ MedRecord_App (MedRec) — Technical Decisions

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
