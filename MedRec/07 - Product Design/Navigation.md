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
The core navigation pattern uses a persistent 4-tab bottom navigation bar:

| Tab | Label | Target Screen / Module | Key Actions |
| :--- | :--- | :--- | :--- |
| **Tab 1** | **Home** | Dashboard Overview | Recent records, active share links, quick stats |
| **Tab 2** | **Records** | Category & Document List | Full-text search, category filters, folders |
| **Tab 3** | **Share** | QR / Link Sharing Center | Generate share QR code, manage active access tokens |
| **Tab 4** | **Profile** | User Profile & Settings | Demographics, emergency ID, security settings |

*Note*: The central action button (Floating Action Button / center tab bump) triggers the **"Upload Record" Modal** from anywhere in the app.

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
