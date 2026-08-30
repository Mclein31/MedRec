---
project: MedRec
type: decision
status: active
created: 2026-08-24
updated: 2026-08-29
tags:
  - medrec
  - decision
  - product-design
  - ux
  - architecture
related:
  - "[[Decision Log]]"
  - "[[Product Design MOC]]"
  - "[[UX Problems]]"
  - "[[User Flow]]"
---

# Design Decisions

## Overview
This document serves as the master index of all core product and UX design decisions made for MedRec. Every significant architectural, layout, or interaction trade-off is recorded here with context, alternatives considered, and rationale.

*Solo Developer Note*: As design decisions are finalized, individual atomic decision notes (e.g., `DD-01 Bottom Tab Bar vs Drawer`) will be created and linked into this index.

---

## 📋 Design Decision Index

| Decision ID | Decision Title | Status | Primary Rationale | Linked Note |
| :--- | :--- | :--- | :--- | :--- |
| **DD-01** | **No App Install Required for Doctors** | `Active` | Healthcare providers will reject high friction apps during short consults; web-first QR viewer is mandatory. | [[07 - Product Design/Design Decisions#DD-01|DD-01]] |
| **DD-02** | **Bottom Navigation Bar with Center FAB** | `Active` | Provides immediate one-thumb access to core tabs and universal (+) record upload from any screen. | [[07 - Product Design/Design Decisions#DD-02|DD-02]] |
| **DD-03** | **Time-Bounded Self-Expiring Share Links** | `Active` | Protects patient privacy by default so access is not permanently left open to external parties. | [[07 - Product Design/Design Decisions#DD-03|DD-03]] |
| **DD-04** | **Standardized Clinical Categories over Freeform Tags** | `Active` | Medical records need immediate clinical taxonomy for doctors to parse quickly without unstructured noise. | [[07 - Product Design/Design Decisions#DD-04|DD-04]] |
| **DD-05** | **Compact Metadata Row & Modular Cards for Record Details** | `Active` | Prevents oversized date cards from pushing clinical notes below the fold on mobile viewports. | [[07 - Product Design/Design Decisions#DD-05|DD-05]] |
| **DD-06** | **Text-Only App Drawer Navigation with Logo Branding** | `Active` | Eliminates visual icon clutter and duplicate navigation noise by using pure typography and official logo branding. | [[07 - Product Design/Design Decisions#DD-06|DD-06]] |
| **DD-07** | **In-App Notification Center & Privacy-First Audit Alerts** | `Active` | Enforces two-tier health privacy by keeping audit trails in-app with generic copy and providing actionable one-tap deep links. | [[07 - Product Design/Design Decisions#DD-07|DD-07]] |
| **DD-08** | **Inset Grouped Profile Architecture & Avatar Persistence** | `Active` | Eliminates visual clutter and text highlight boxes in favor of clean iOS-style grouped cards and persistent photo uploads. | [[07 - Product Design/Design Decisions#DD-08|DD-08]] |
| **DD-09** | **Universal Sliding Sheet Drag Handle & Compact Input Placeholders** | `Active` | Communicates downward drag dismissibility consistently across all sliding modals without vertical dead space, paired with compact input placeholders for long medical terms. | [[07 - Product Design/Design Decisions#DD-09|DD-09]] |

---

## 📝 Detailed Decision Records

### DD-09: Universal Sliding Sheet Drag Handle & Compact Input Placeholders
- **Context**: Multiple sliding sheets (`pageSheet` presentations) across Profile edit, Change Password, Emergency Medical ID, Add Record, Scan Detail, and Sort/Filter lacked a unified visual cue indicating they can be swiped down to dismiss. Additionally, long clinical placeholder prompts were crowding mobile input boxes.
- **Alternatives Considered**: (A) Inconsistent handles or no handles, (B) Text labels such as "Swipe down", (C) Standardized subtle grey drag handle (`38×4px`, `borderRadius: 2`, `#D1D5DB`) integrated into the header row, paired with conditional `12.5px` placeholder sizing.
- **Decision**: Option C — Standardize drag handle dimensions and spacing across all 7 sliding modal surfaces, and reduce placeholder font size to 12.5px while retaining 14px user text.
- **Rationale**: Provides clear ergonomic affordance for touch gestures without introducing dead whitespace or layout shifts, ensuring long medical examples fit comfortably on all mobile screens.

### DD-08: Inset Grouped Profile Architecture & Avatar Persistence
- **Context**: Patient Profile tab required modern, calm visual hierarchy for sensitive clinical emergency data, demographic details, security settings, and personal photo identification.
- **Alternatives Considered**: (A) Heavy stacked cards with colored badge pills and red containers, (B) Unstructured plain list, (C) Unboxed hero section with structured Inset Grouped Cards (`#FFFFFF`, `borderRadius: 16`) and hairline dividers.
- **Decision**: Option C — Unboxed hero (avatar, name, email, bullet metadata) paired with 4 clean Inset Grouped Cards and interactive photo upload.
- **Rationale**: Eliminates "box-in-a-box" anti-patterns and visual fatigue while highlighting life-critical emergency data and allowing patients to personalize their medical vault.

### DD-01: Zero App Requirement for Doctors
- **Context**: Patients need to share records with doctors in clinics.
- **Alternatives Considered**: (A) Doctor companion mobile app, (B) Web-based portal with doctor login, (C) Ephemeral web viewer via QR code without doctor registration.
- **Decision**: Option C — Instant responsive web view rendered directly from secure token.
- **Rationale**: Doctors have zero time to register or install software during a 10-minute patient consultation.

### DD-02: 4-Tab Bottom Nav with Central Floating Upload Action
- **Context**: Structuring high-level mobile navigation.
- **Alternatives Considered**: Hamburger drawer menu vs Bottom tab bar.
- **Decision**: Bottom tab bar (Home, Records, Share, Profile) with center upload trigger.
- **Rationale**: Mobile ergonomic research shows hamburger menus reduce engagement by >40%; health tracking requires persistent, discoverable navigation.

### DD-05: Compact Horizontal Metadata & Modular Card Architecture for Record Details
- **Context**: Mobile record details view needed to display clinical notes, metadata (event date and creation date), AI translation, and deletion actions cleanly.
- **Alternatives Considered**: (A) Full-width stacked date cards, (B) Header-integrated metadata, (C) Compact 2-column horizontal metadata row below title with modular section cards.
- **Decision**: Option C — Compact 2-column horizontal row with subtle divider and dedicated cards for Clinical Notes and AI Medical Insights.
- **Rationale**: Mobile ergonomic testing showed stacked date cards consumed >120px of vertical height, forcing users to scroll to read clinical notes. A compact horizontal metadata row provides instant scanning while preserving immediate visibility for clinical details.

### DD-06: Text-Only App Drawer Navigation with App Logo Branding
- **Context**: Top-left burger icon needed to provide access to secondary actions (AI summary, vault export, emergency ID, sign out) without overwhelming the primary bottom tab bar.
- **Alternatives Considered**: (A) Icon-heavy multi-level drawer, (B) Duplicate full-screen tab list with colored icons, (C) Minimal text-only drawer with official MedRec logo branding.
- **Decision**: Option C — Text-only navigation rows using pure typography, spacious padding, and subtle active background pills, anchored by the official MedRec app logo (`assets/logo/logo.png`) in the header.
- **Rationale**: Removing decorative icons from secondary menu rows eliminates visual competition with primary bottom tabs, prevents icon fatigue, and creates a lightweight, clean navigation experience.

### DD-07: In-App Notification Center & Two-Tier Privacy Architecture
- **Context**: Patients need real-time awareness of doctor sharing token creation/revocation, medical record logging, and security events without compromising medical confidentiality.
- **Alternatives Considered**: (A) Aggressive marketing push notifications, (B) Ephemeral OS push notifications with detailed lab results, (C) Authenticated in-app notification center modal with generic high-level summaries and one-tap deep linking.
- **Decision**: Option C — Slide-up in-app notification center (`NotificationCenterModal`) with downward swipe drag handle affordance, categorized cards, and strict omission of raw diagnostic metrics.
- **Rationale**: Exposing specific diagnostic labels or drug names on external preview surfaces violates patient privacy and regulations (HIPAA/GDPR). An in-app center provides an authenticated permanent ledger with zero privacy leakage.

---

## 🔗 Related Notes
- Global Decision Log: [[Decision Log]]
- UX Challenges Addressed: [[UX Problems]]
- Interaction Flows: [[User Flow]]
- Parent Hub: [[Product Design MOC]]
