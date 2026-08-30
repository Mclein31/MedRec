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
| **DD-10** | **Unified Blue AI Card Layout & Horizontal Category Carousel** | `Active` | Creates a shared visual language for AI cards (rich blue, horizontal icon/title row, white CTA) and single-line category carousel preserving vertical form space. | [[07 - Product Design/Design Decisions#DD-10|DD-10]] |
| **DD-11** | **Adaptive Share Hero & Cardless Flat Access History** | `Active` | Focuses 75% of visual weight on instant QR generation/scanning while de-cluttering past activity into a calm, unboxed typography timeline without cards, pills, or repetitive icons. | [[07 - Product Design/Design Decisions#DD-11|DD-11]] |
| **DD-12** | **Centralized Design System Tokens & Universal Screen Header** | `Active` | Enforces single-source-of-truth tokens (`theme.ts`), universal `ScreenHeader` with drawer and notification triggers, 20px screen gutters, and 110px tab bar clearance. | [[07 - Product Design/Design Decisions#DD-12|DD-12]] |
| **DD-13** | **Records Screen Layout & Quick Category Carousel** | `Active` | Replaces cramped search inputs and redundant sort modals with a full-width search bar and direct horizontal category quick chips with live counts. | [[07 - Product Design/Design Decisions#DD-13|DD-13]] |
| **DD-14** | **Continuous Scrollable Profile Content & Compact Fixed Navigation Toolbar** | `Active` | Moves the Profile title into the top-level scrollable content while keeping a compact global navigation toolbar fixed at the top, unlocking maximum usable vertical space. | [[07 - Product Design/Design Decisions#DD-14|DD-14]] |

---

## 📝 Detailed Decision Records

### DD-14: Continuous Scrollable Profile Content & Compact Fixed Navigation Toolbar
- **Context**: The Profile tab previously rendered a static header (`ScreenHeader`) containing the large "Profile" title and subtitle above the scroll container, permanently consuming significant vertical screen space and reducing visible profile information on smaller iPhone viewports.
- **Alternatives Considered**: (A) Shrinking avatar and profile card sizes, (B) Fully collapsible sliver app bar with complex animation interpolations, (C) Compact fixed global navigation toolbar (Burger Menu + Notification Bell) paired with a single, continuous scrollable profile surface containing the natural scrolling title, unboxed hero, and inset grouped cards.
- **Decision**: Option C — Keep the global top navigation toolbar fixed directly under the safe area, and place the 28px "Profile" title and subtitle inside the single `<ScrollView>` to scroll away naturally.
- **Rationale**: Gives the Profile tab substantially more usable vertical space, feels like a natural modern iOS profile screen, avoids complex scroll-jumping glitches, and preserves fixed access to global app drawers and notifications.

### DD-13: Records Screen Layout & Quick Category Carousel
- **Context**: The Records tab had a cramped 120px search input placed beside titles, an undiscoverable long-press sort gesture, and potential modal fatigue when filtering. Record cards also had extraneous background highlight pills on trailing chevrons.
- **Alternatives Considered**: (A) Heavy multi-step filter modal sheets with sort options, (B) Dense micro-rows removing cards completely, (C) Preserving the signature record card design (category badge, squircle icon box, clinical event date, folder footer) while enhancing the layout with a full-width `<RecordSearchBar />`, direct horizontal quick-filter category carousel with live count badges (`All (14)`, `Labs (5)`), and removing the chevron background highlight.
- **Decision**: Option C — Deploy full-width search, direct single-tap category carousel filtering with real-time distribution counts, remove redundant sort modal sheets, and clean up card chevron presentation.
- **Rationale**: Reduces cognitive friction, avoids nested modal flows, provides immediate categorical feedback, and preserves familiar clinical card identity.

### DD-12: Centralized Design System Tokens & Universal Screen Header
- **Context**: The mobile application had minor visual inconsistencies: divergent green color values in the scan tab (`#1D9E75` vs `#159A83`), disparate horizontal margins (24px vs 20px), varying header implementations, and missing drawer menu/notification center affordances on the Doctor Scan and Profile tabs.
- **Alternatives Considered**: (A) Ad-hoc screen-by-screen inline styles, (B) Fully autonomous dark mode styling engine, (C) Centralized design system (`mobile/constants/theme.ts`) exporting canonical `Colors`, `Typography`, `Spacing`, `Radii`, and shared core UI components (`ScreenHeader`, `DragHandle`, `Button`, `Card`).
- **Decision**: Option C — Overhaul `mobile/constants/theme.ts` with centralized tokens, resolve palette discrepancies, standardize screen gutters to `20px` (`Spacing.screenPadding`), and unify tab screen headers with `<ScreenHeader />` featuring the Burger Menu drawer trigger and Notification Bell with dynamic unread dot.
- **Rationale**: Eliminates styling drift, ensures visual cohesion across the patient and doctor workflows, guarantees universal access to side drawer and notification features from every tab, and prevents UI overlaps above the bottom navigation bar.

### DD-11: Adaptive Share Hero & Cardless Flat Access History
- **Context**: The Share Records screen had visual repetition and card fatigue: every past expired or revoked share rendered as a large standalone 100px+ bordered card with a repetitive 39px teal QR icon. An initial proposal to wrap them in an enterprise audit ledger created a dense, dashboard-like table feel unsuitable for a consumer healthcare app.
- **Alternatives Considered**: (A) Stacking 10+ standalone bordered cards with giant icons, (B) Heavy enterprise audit ledger table inside an enclosed outer card with badges and hashes, (C) Segmented control hiding history entirely, (D) Adaptive Hero Surface (75% visual weight) paired with an unboxed, cardless flat timeline (25% visual weight) directly on the `#F4FAF9` background canvas.
- **Decision**: Option D — Implement the Adaptive Hero Surface that transitions between the primary blue generation card and active living QR card, paired with an unboxed, typography-driven past session timeline with 1px hairline dividers and progressive disclosure.
- **Rationale**: Keeps the primary clinical action (generating/scanning QR codes) front-and-center in high-stress triage situations, while presenting historical logs as reassuring, lightweight plain text (`Revoked` in soft red, `Expired` in muted slate) without card or badge clutter.

### DD-10: Unified Blue AI Card Layout & Horizontal Category Carousel
- **Context**: AI feature entry points across the app (Record List summary, Share QR access, Record Details AI insights, Add Record scanner) had fragmented container styles, button treatments, and icon background highlights. Additionally, multi-line record type chip grids pushed form fields below the fold.
- **Alternatives Considered**: (A) Heterogeneous card layouts with icon highlight boxes, (B) Multi-line wrapped category grids taking 2+ rows, (C) Unified AI design system (rich `#1976D2` blue container, direct icon rendering without highlight pills, white CTA button) paired with a single-line edge-to-edge category carousel.
- **Decision**: Option C — Standardize all AI cards on the unified blue layout system and convert record type selection into a horizontal carousel.
- **Rationale**: Reinforces AI branding consistency across all touchpoints, eliminates visual clutter from icon background boxes, and keeps primary form input fields immediately visible above the fold on mobile screens.

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
