---
project: MedRec
type: decision
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - decisions
  - frontend
  - mobile
  - ui
  - adr
related:
  - "[[Frontend]]"
  - "[[Decision Log]]"
  - "[[Technical Architecture]]"
  - "[[User Flow]]"
  - "[[Product Design MOC]]"
---

# Decision - Frontend Technology

## 1. Decision Status
- **Status**: 🟡 Proposed (OPEN — Under Evaluation)
- **Date**: 2026-08-24
- **Decider**: Solo Developer

---

## 2. Context & Problem Statement
**MedRec** is designed as a patient-centric personal medical record manager. The primary interaction occurs at doctor visits, clinic check-ins, and emergency encounters, making **mobile-first** accessibility mandatory.

Key constraints & requirements:
1. **Device Hardware Access**: Native document scanning (camera), biometric auth (FaceID/Fingerprint), local filesystem sandbox access, and QR code generation/scanning.
2. **Cross-Platform Target**: Must ideally support iOS and Android without maintaining two independent native codebases as a solo developer.
3. **High Performance UI**: Smooth scrolling through lengthy medical timelines, PDF rendering, and responsive search.
4. **Developer Velocity**: Fast iteration speed, rich component ecosystem, and strong typing (TypeScript or Dart).

---

## 3. Options Considered

### Option A: React Native (with Expo) + TypeScript
- **Overview**: Use React Native / Expo to compile a cross-platform mobile application using TypeScript.
- **Pros**:
  - Huge ecosystem for UI components, navigation, and local storage (Expo SQLite, SecureStore).
  - Fast iteration cycle with Expo Go and instant updates.
  - Easy to share validation logic or models with web/backend if needed.
- **Cons**:
  - Bridge overhead for complex image processing/OCR if not using native modules.

### Option B: Flutter + Dart
- **Overview**: Use Google's Flutter framework with Dart for compiled cross-platform native binaries.
- **Pros**:
  - Consistent rendering across iOS and Android with high 60/120fps UI performance.
  - Robust out-of-the-box Material and Cupertino widget libraries.
- **Cons**:
  - Requires context-switching to Dart (if backend is in Python/TypeScript/Go).
  - Slightly smaller ecosystem for niche healthcare/crypto plugins compared to JS/TS.

### Option C: Progressive Web App (PWA) / Responsive Web (Next.js / Tailwind)
- **Overview**: Build a responsive web app using Next.js/Tailwind, packaged as a PWA.
- **Pros**:
  - Fastest to prototype; universal access on any browser without app store review.
- **Cons**:
  - Limited offline storage quotas on iOS Safari; restricted background processing and hardware APIs (biometrics, secure enclave access).
  - Not optimal for patient emergency access in connectivity dead zones.

### Option D: Fully Native (Swift for iOS / Kotlin for Android)
- **Overview**: Build separate native applications for iOS and Android.
- **Pros**:
  - Maximum performance, best platform integration, direct access to Apple HealthKit / Google Health Connect.
- **Cons**:
  - Double the development and maintenance effort — unsustainable for a solo developer MVP.

---

## 4. Current Working Hypothesis & Recommendation

> [!NOTE]
> **Working Hypothesis**: Option A (**React Native + Expo**) is the most pragmatic choice for solo development. It balances native device capability (camera, biometrics, secure storage, local SQLite) with rapid iteration and single-language TypeScript ergonomics.

*Decision will be finalized following a lightweight UI/camera spike.*

---

## 5. Consequences & Trade-offs (Anticipated)
- Choosing React Native / Expo allows shipping both iOS and Android from one codebase.
- Heavy computational tasks (such as client-side OCR) will need either native TurboModules or cloud processing delegation.

---

## 6. Related Nodes
- [[Frontend]] — Frontend architecture overview
- [[Decision Log]] — Master ADR index
- [[Technical Architecture]] — Tech stack selection
- [[Product Design MOC]] — UI design guidelines and components
- [[User Flow]] — Mobile interaction flows
