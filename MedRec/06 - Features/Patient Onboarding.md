---
project: MedRec
type: feature
status: active
created: 2026-09-07
updated: 2026-09-12
tags:
  - medrec
  - feature
  - onboarding
  - ux
  - mobile
  - first-launch
related:
  - "[[Authentication]]"
  - "[[User Flow]]"
  - "[[Design Decisions]]"
  - "[[Emergency Access]]"
  - "[[QR Code Access]]"
  - "[[Digital Medical Records]]"
  - "[[Patients]]"
---

# Patient Onboarding

## Purpose
Provides an authentic, high-trust introductory experience for first-time patients downloading MedRec. It clearly demonstrates the four core pillars of the platform—unified records with AI summaries, instant doctor QR sharing, emergency medical safety, and zero-knowledge privacy—prior to account creation or login, while offering an on-demand replay guide for existing users.

## Problem it Solves
New users downloading a personal health records application face high skepticism regarding privacy, security, and immediate clinical utility. Dropping new users directly onto a cold login/registration form causes high abandonment. Patient Onboarding overcomes this by presenting authentic interactive UI mini-replicas of the real app features, establishing confidence and clarity before asking for credentials.

## Target User
- [[Patients]] (New): Downloading the app for the first time on iOS or Android devices.
- [[Patients]] (Returning/Replaying): Seeking a refresher on platform capabilities via the Profile tab.

## Core Clinical Value Slides

### Slide 1: Unified Health Vault & AI Insights
- **Badge**: `ALL-IN-ONE HEALTH VAULT`
- **Headline**: Your Complete Health History, Unified & Clarified
- **Subtitle**: Organize lab tests, doctor visits, and medications in one secure timeline with automated AI clinical summaries.
- **Visual Composition**: Category filter chips (`Labs`, `Consultations`, `Prescriptions`), authentic CBC lab result card with `NORMAL` badge, Cardiology review card, and Gemini AI clinical summary callout card with patient vitals explanation.

### Slide 2: Frictionless Doctor QR Sharing
- **Badge**: `FRICTIONLESS SHARING`
- **Headline**: Share Instantly with Doctors via Secure QR
- **Subtitle**: Provide doctors instant, temporary read-only access during consultations. No accounts needed and links auto-expire.
- **Visual Composition**: Consultation Pass card with Dr. Sarah Mitchell, centered stylized QR code with teal alignment brackets, active 14:59 expiring countdown pill, and 1-tap instant access revocation badge.

### Slide 3: Critical Safety & Emergency Medical ID
- **Badge**: `CRITICAL SAFETY`
- **Headline**: Emergency Medical ID Ready When Seconds Count
- **Subtitle**: Keep your blood type, severe allergies, and emergency contacts accessible to first responders right from your phone.
- **Visual Composition**: Red-accented emergency pass, medical shield insignia, O+ blood type badge, high-contrast critical allergy alert (Penicillin anaphylaxis, Peanuts), chronic condition baseline, and paramedic emergency access note.

### Slide 4: Patient-First Zero-Knowledge Privacy
- **Badge**: `PATIENT-FIRST PRIVACY`
- **Headline**: Your Health Data Belongs Only to You
- **Subtitle**: Zero ads, zero data selling, and zero AI training on your private files. Bank-grade encryption safeguards your health.
- **Visual Composition**: Padlock halo emblem, 3 privacy guarantee cards (Zero Ads & Zero Data Selling, Private AES-256 Cloudflare R2 Vault, Time-Expiring Access Tokens), regulatory compliance seal (HIPAA architecture), and dual CTAs ("Get Started" ➔ `/register`, "Already have an account? Sign In" ➔ `/login`).

## First-Launch Guard & State Architecture
- **Persistent Storage**: Backed by `medrec_onboarding_completed_v1` stored in Expo `SecureStore` (iOS/Android) and `localStorage` (Web).
- **Bootstrap Hydration**: `AuthContext.tsx` reads `[getToken(), getHasCompletedOnboarding()]` in parallel during app initialization.
- **Root Routing Guard (`_layout.tsx`)**:
  - `!token && !hasCompletedOnboarding`: Positions `<Stack.Screen name="onboarding" />` at root stack index 0, followed by `<Stack.Protected guard={!token}>` (`login`, `register`).
  - `hasCompletedOnboarding`: Moves `login` to root position and places `onboarding` at the trailing position for in-app replay.
  - `SplashScreen.preventAutoHideAsync()` is held until custom fonts (`Lexend Deca`) and persistent storage resolve concurrently, preventing visual flashes (`preload -> onboarding -> login/register`).
  - Completely decoupled from `login.tsx` (no manual onboarding buttons or triggers on authentication screens).
- **Completion Trigger**: Calling `completeOnboarding()` occurs strictly on explicit user action ("Skip", "Get Started", or "Sign In").

## In-App Replay Mode
- Authenticated patients can revisit the onboarding guide at any time under **Profile > Security & Preferences > App Tour & Feature Guide**.
- When launched in replay mode (`token !== null`):
  - Top header "Skip" button adapts into an accessible "Close" button (`router.back()`).
  - Slide 4 CTAs adapt to "Finish Tutorial" returning cleanly to the Profile screen.

## Accessibility & Design Standards
- **Touch Target Dimensions**: All navigation buttons, indicator dots, and CTA links declare calibrated `hitSlop` exceeding WCAG 2.5.5 and Apple HIG minimum $44 \times 44\text{pt}$ touch boundaries.
- **Screen Reader Support**: Every interactive control includes explicit `accessibilityRole="button"`, `accessibilityLabel`, and descriptive `accessibilityHint` strings.
- **Gesture Synchronization**: The horizontal carousel binds both `onMomentumScrollEnd` and `onScrollEndDrag` to eliminate low-velocity flick desynchronization on Android devices.
- **Orientation Resilience**: A `useEffect` hook realigns the carousel offset `scrollTo({ x: activeIndex * width, animated: false })` on device rotation or dimension change.
- **Production Safety**: Developer QA reset triggers (`onLongPress`) are gated behind `__DEV__ ? ... : undefined` and tree-shaken in release builds.
- **Full-Screen Responsive Architecture & Form-Factor Bounding**: On phones, hero preview cards expand with `flex: 1`, `minHeight: 280`, and `width: 100%` centered vertically on screen. On tablets and iPads, `maxContentWidth` is bounded to `Math.min(width - 48, 580)` to maintain authentic mobile card replica proportions and prevent widescreen line-length distortion.
- **Editorial Typography & Card Grouping**: Category badges and headlines are centered, while narrative descriptions (`subtitleText`, `aiBodyText`, `pillarDescText`) use `textAlign: 'justify'` with `alignSelf: 'stretch'`. Multi-card list feeds (Slide 1 records stack, Slide 3 emergency data cluster) are enclosed in dedicated containers (`gap: 8`) to eliminate gap dispersion on tall viewports.

## Dependencies
- [[Authentication]]: Downstream sign-up and sign-in routes triggered upon onboarding completion.
- [[User Flow]]: Step-by-step user onboarding and first-launch interaction specification.
- [[Design Decisions]]: Architectural and UX decisions recorded in DD-19.
- [[Emergency Access]]: Emergency Medical ID feature showcased in Slide 3.
- [[QR Code Access]]: Doctor QR sharing feature showcased in Slide 2.
- [[Digital Medical Records]]: Health vault feature showcased in Slide 1.

## Related Notes
- User Flows: [[User Flow]]
- Design Decisions: [[07 - Product Design/Design Decisions#DD-19|DD-19 (Pre-SignIn Patient Onboarding Flow)]]
- Architecture Navigation: [[Navigation]]
