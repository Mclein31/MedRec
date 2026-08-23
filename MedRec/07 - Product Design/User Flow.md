---
project: MedRec
type: design
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - design
  - user-flow
  - ux
related:
  - "[[User Journey]]"
  - "[[Information Architecture]]"
  - "[[Navigation]]"
  - "[[Product Design MOC]]"
  - "[[Record Upload]]"
  - "[[Record Sharing]]"
  - "[[Record Viewing]]"
  - "[[Authentication]]"
---

# User Flow

## Overview
This document outlines the step-by-step user interaction flows for the primary tasks in MedRec. These flows guide UI state transitions, routing logic, and error handling across both patient and doctor interfaces.

---

## 🚀 Key Flows (Specification Template)

### 1. Patient Onboarding & Authentication Flow
- **Entry Point**: App initial launch
- **Steps**:
  1. Splash screen & value proposition carousel
  2. Sign Up / Sign In option ([[Authentication]])
  3. Enter email & password (or biometric enrollment)
  4. Minimal profile setup: Name, Date of Birth, Emergency Contact baseline
  5. Land on Home Dashboard
- **Exit Point**: Authenticated session on Home Dashboard

### 2. Document Capture & Record Upload Flow
- **Entry Point**: Floating Action Button (+) or "Add Record" button on Home / Category screen
- **Steps**:
  1. Select input method: Camera Scan, Photo Library, or PDF Document Picker
  2. Capture/Select pages -> In-app edge crop & page reordering
  3. Fill minimal metadata: Category ([[Medical Record Categories]]), Visit Date, Title / Doctor Name
  4. Tap "Save Record" -> Background upload with progress bar
- **Exit Point**: Record stored and displayed at top of Recent Records list

### 3. Record Sharing Flow (In-Clinic Consultation)
- **Entry Point**: "Share Records" button on Home or specific record detail
- **Steps**:
  1. Select scope: "Entire Health Summary", "Recent Visit", or "Custom Selection"
  2. Set expiration window (e.g., "1 Hour", "24 Hours")
  3. Generate QR Code / Link ([[Record Sharing]], [[QR Code Access]])
  4. Present QR Code to Healthcare Provider for scanning
  5. Receive real-time "Viewed by Doctor" toast confirmation
  6. Option to "Revoke Access Immediately"
- **Exit Point**: Provider finishes review, token expires or is revoked

### 4. Record Viewing & Search Flow
- **Entry Point**: Search bar or Category card on Dashboard
- **Steps**:
  1. Enter keyword or tap category filter chip ([[Search Medical Records]])
  2. Tap record card from results list
  3. Open full-screen high-res viewer ([[Record Viewing]]) with pinch-to-zoom
  4. Quick actions: Share, Export PDF, Edit, Delete
- **Exit Point**: Return to filtered list or home

---

## 📌 Flow Diagram Placeholder
```
[User App Launch] ──► [Auth Check] ──┬──► (Not Authenticated) ──► [Sign Up / Login] ──► [Setup Profile] ──┐
                                     │                                                                  │
                                     └──► (Authenticated) ──────────────────────────────────────────────┴──► [Home Dashboard]
                                                                                                                   │
                                                                   ┌───────────────────────┬───────────────────────┤
                                                                   │                       │                       │
                                                           [Upload Record]         [Browse / Search]         [Share Records]
                                                           (Camera/PDF)            (Filter & Viewer)         (QR Code / Web)
```

---

## 🔗 Related Notes
- High-level Journey: [[User Journey]]
- Structure: [[Information Architecture]]
- Screen Navigation: [[Navigation]]
- Parent Hub: [[Product Design MOC]]
