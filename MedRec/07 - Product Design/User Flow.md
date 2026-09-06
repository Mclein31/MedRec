---
project: MedRec
type: design
status: proposed
created: 2026-08-24
updated: 2026-09-07
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
  - "[[Patient Onboarding]]"
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
- **Entry Point**: First app launch after installation (or "App Tour & Feature Guide" in Profile)
- **First-Launch Guard**:
  - App bootstrap checks `tokenStorage.getHasCompletedOnboarding()` (`medrec_onboarding_completed_v1`).
  - Brand-new installs automatically launch into `/onboarding` at root index 0 before sign-in.
  - Returning or authenticated users completely bypass onboarding and route straight to `/login` or `/(tabs)`.
- **Steps**:
  1. **Slide 1 — Unified Health Vault**: Authentic mini-UI previewing categorized lab tests (Complete Blood Count with Normal badge), cardiology consultation, and Gemini AI clinical summaries.
  2. **Slide 2 — Frictionless QR Sharing**: Live doctor consultation pass preview with stylized QR code, 14:59 expiring countdown, and 1-tap instant revocation callout.
  3. **Slide 3 — Critical Safety & Emergency ID**: Emergency Medical ID pass preview with O+ blood type, high-contrast critical allergy warnings (Penicillin anaphylaxis), chronic conditions, and paramedic emergency access note.
  4. **Slide 4 — Patient-First Privacy**: Padlock vault emblem and three core guarantees (zero ads/data selling, private Cloudflare R2 AES-256 storage, and time-expiring doctor access tokens).
  5. **Actions & Transitions**:
     - *Pre-SignIn Navigation*: Users can tap "Skip" at any point or complete Slide 4 with "Get Started" (routes to `/register`) or "Sign In" (routes to `/login`). Either action calls `completeOnboarding()` to persist state.
     - *In-App Replay Mode*: Authenticated patients can replay the guide via Profile > Security & Preferences. The Skip button adapts to an accessible "Close" button (`router.back()`), and Slide 4 displays "Finish Tutorial" returning to Profile.
  6. **Authentication & Home**: Enter credentials or biometric unlock via [[Authentication]] -> land on Home Records dashboard.
- **Exit Point**: Authenticated session on Home Dashboard (or `/login` / `/register`)

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
