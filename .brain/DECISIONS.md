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
