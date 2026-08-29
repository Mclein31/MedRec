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

---

## 📝 Detailed Decision Records

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

---

## 🔗 Related Notes
- Global Decision Log: [[Decision Log]]
- UX Challenges Addressed: [[UX Problems]]
- Interaction Flows: [[User Flow]]
- Parent Hub: [[Product Design MOC]]
