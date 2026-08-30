---
project: MedRec
type: design
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - design
  - navigation
  - routing
related:
  - "[[Information Architecture]]"
  - "[[User Flow]]"
  - "[[Product Design MOC]]"
  - "[[Digital Medical Records]]"
  - "[[Record Sharing]]"
  - "[[Emergency Access]]"
---

# Navigation

## Overview
This document defines the application navigation hierarchy, screen routing patterns, tab bar layout, modal presentations, and deep-linking conventions for MedRec.

---

## 📱 Mobile App Navigation Framework

### 1. Bottom Tab Bar (Primary Persistent Navigation)
The core navigation pattern uses a persistent bottom navigation bar:

| Tab | Label | Target Screen / Module | Key Actions |
| :--- | :--- | :--- | :--- |
| **Tab 1** | **Records** | Dashboard Overview & Records List | Recent records, active share links, search, AI summary |
| **Tab 2** | **Share** | QR / Link Sharing Center | Generate share QR code, manage active access tokens |
| **Tab 3** | **Add** | Record Capture Modal | Document camera, 3:4 viewfinder, gallery ingestion |
| **Tab 4** | **Scan** | Doctor QR Scanner | Live camera QR scanner for inspecting shared patient records |
| **Tab 5** | **Profile** | User Profile & Settings | Demographics, emergency ID, security settings, vault export |

---

### 2. Top-Left Burger Navigation Drawer (`SideMenuModal`)
A lightweight, left-slide animated overlay providing fast access to operational actions and secondary vault tools without fighting with the bottom tab bar:
- **Branding Header**: Displays the authentic MedRec app logo (`assets/logo/logo.png`), application title, and close `(X)` button.
- **User Demographic Summary**: Name, email, and direct link to the Profile tab.
- **Text-Only Navigation**: Individual items are strictly **text-only** (no row icons, emojis, or decorative symbols). Visual hierarchy is driven by typography (`Lexend Deca`), spacious padding, subtle active highlights (`#F0F9F7`), and clean horizontal dividers (`#EDF4F3`).
- **Destination Groups**:
  - *Primary Routes*: Home, My Records, Share Records (with active shares badge), Scan Doctor QR, Add Health Record, Profile, Emergency Medical ID.
  - *Vault Actions*: AI Health Summary (OpenAI engine trigger), Export Health Vault (JSON archive sharing).
  - *Information*: About MedRec & Clinical Disclaimers.
  - *Footer*: Destructive Sign Out with session invalidation confirmation.
- **Dismissal Physics**: Smooth 230ms ease-out slide in / 180ms ease-out dismissal via backdrop tap, top close button, or Android hardware back button.

---

### 3. Top-Right Notification Bell & In-App Notification Center (`NotificationCenterModal`)
An authenticated in-app notification center triggered by the toolbar bell on Home and Share screens:
- **Dynamic Bell Indicator**: Visual teal dot (`notificationDot`) displayed only when `unreadCount > 0`.
- **Slide-Up Sheet Presentation (`pageSheet`)**: Features a centered neutral grey drag handle (`#D1D5DB`, `40×4px`, `borderRadius: 2`) at the top as an intuitive visual affordance for downward swipe-to-dismiss.
- **Header Actions**: Live unread count summary, 1-tap "Mark all as read" button (`#159A83`), and close `(X)` button.
- **Filtering & Audit**: Segmented filter tabs (`All` vs `Unread`) and categorized notification cards with 1-tap deep links to records (`/record/[id]`), active sharing (`/(tabs)/share`), emergency profile (`/(tabs)/profile`), or AI summarization.

---

## 🗂️ Navigation Hierarchy (Stack Models)

```
Root App Container
 ├── Auth Stack (Unauthenticated)
 │    ├── Welcome / Onboarding Screen
 │    ├── Login Screen
 │    ├── Registration Screen
 │    └── Password Reset Modal
 └── Main App Stack (Authenticated)
      ├── Main Tab Navigator (Home, Records, Share, Profile)
      ├── Record Detail View Modal / Push Screen
      │    ├── Fullscreen Document Viewer
      │    └── Record Edit Screen
      ├── Upload Flow Modal (Step 1: Capture -> Step 2: Metadata -> Step 3: Confirm)
      ├── Share Generator Modal (Scope Selection -> Token Generated)
      └── Emergency ID Card View (High-Contrast Presentation)
```

---

## ⚡ Interaction & Modal Conventions
- **Upload Flow**: Presented as a full-screen modal with a clear `Cancel` / `X` dismiss button to prevent accidental data loss.
- **Document Previews**: Swipe-down gesture to dismiss full-screen image / PDF viewers.
- **Deep Links**:
  - `medrec://record/{id}` -> Opens specific record detail.
  - `medrec://share/new` -> Opens share creation wizard.
  - `https://medrec.app/share/{token}` -> Public responsive web viewer for healthcare providers.

---

## 🔗 Related Notes
- Structural Hierarchy: [[Information Architecture]]
- Step-by-step Journeys: [[User Flow]]
- Parent Hub: [[Product Design MOC]]
