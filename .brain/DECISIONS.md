---
type: decisions-log
title: MedRecord_App Decisions
project: MedRecord_App
tags:
  - decisions
  - architecture
  - backend
  - mobile
last_updated: 2026-11-15
---

# MedRecord_App (MedRec) — Technical Decisions

Newest first. This file holds the decisions for the current v2 implementation (`apps/mobile` + `apps/api`, DD-44 onward). Product/design decisions such as DD-01 live in the Obsidian vault (`MedRec/07 - Product Design/Design Decisions.md`).

## 2026-11-15 — First-use setup that personalizes the app (DD-52)

At the user's request, first use is no longer a five-scene feature tour. `src/screens/Setup.tsx` is a welcome, four optional questions and a finish that lists what the answers changed. **This supersedes DD-46's "no progress bar, no Skip" for first use**: setup has a four-segment progress bar and every question can be skipped ("Skip for now" keeps the defaults).

Every answer changes something real (`src/personal.ts`, pure and unit-tested; stored on the device in prefs as `personal`, never sent to the API):
- **Name** → greets by first name and prefills "Full name" on registration.
- **Goal** (organize / understand / visits / emergency) → the empty Records headline and body, plus one shortcut row on the Records home (Ask Remy, Share, or Medical ID). Sharing needs a record, so that shortcut is not offered on the empty state.
- **Record types** (multi-select, order kept) → the first two picks replace Lab results/Prescriptions as the Records tabs; picks lead the category sheet and the record form's type chips.
- **Comfort** → the existing appearance / larger text / gentler motion prefs, applied live.

Remy replies to each answer in a caption bubble; copy only promises what the app then does. The finish fires a success haptic and reveals the summary lines in sequence. Profile gains "Personalize MedRec" (`/personalize`, the same flow minus welcome and name). The old tour (`src/screens/Onboarding.tsx`) stays as Profile → "How MedRec works" (`/tour`).

Finish calls `router.replace` **before** `markOnboarded()`: marking first removes the route and the navigator's fallback (sign-in) wins over the requested register screen.

Verified: typecheck, 37 mobile tests, and a full web run (answers, skip-all, back, dark switch, finish → register with name prefilled, reload stays onboarded). Not verified: native iOS/Android run of the new flow (keyboard on the name step, haptic), the personalized Records home with a signed-in account, and `validation/onboarding/` native UI tests, which still target the old tour as first use.

---

## 2026-11-04 — Profile editing that saves what people type, and in-app account deletion (DD-51)

The profile edit form dropped list entries (allergies, conditions, medications) that were typed but not confirmed with the small Add link, and saved silently. List drafts are now controlled by the screen and merged on save (`src/listDraft.ts`, unit-tested). The user's own `phone` column was never editable; it now is, with read-only email and photo on the same screen. Medical ID and Profile both open `profile-edit` (`section=medical` changes only the title and hides personal-only fields). Validation runs client-side with the server's limits; server field errors still map to fields.

Account deletion is a store requirement for apps with sign-up. `DELETE /api/auth/account` requires the current password, deletes every R2 object (record files and avatar) first, then the user row; FK cascades remove all owned rows including append-only activity (RI cascades are not blocked by the app role's RLS — verified by test). Sign-out now carries a reason (`passwordChanged`, `deleted`) that sign-in shows as a calm notice. Records can be created without a document and pages can be attached later via the existing attach endpoint; pages added later are not AI-read.

Coordinated with the concurrent motion session (DD-50): it owns core/form/layout/motion/Sheet/theme, the tab and records layouts, root layout and `share/new`; this pass only appended `Toggle` to `form.tsx`. Google/Apple sign-in stay disabled. Not verified here: native camera/photo pickers for avatar and page attachment on device, and the page-attach sheet's iOS present-after-dismiss delay (400 ms).

---

## 2026-11-04 — Purposeful navigation and interaction motion (DD-50)

Motion now says where things live and what changed, and stays off the JS thread.

- **Navigation:** drill-down routes use the platform push (`animation: 'default'`, edge swipe-back). Activity, profile-edit, summary and Ask Remy present as native sheets (previously they inherited the root `fade` and cross-dissolved). Add record and the tour cover from below. Root auth/app swaps keep the 180 ms fade. Under system Reduce Motion or in-app Gentler motion, every route fades.
- **Tabs:** tab content keeps the short fade (peers never slide). One persimmon marker travels between tabs (`useSlidingMarker` in `src/ui/motion.tsx`, 240 ms ease-in-out, transform only) instead of per-tab underlines fading independently. The Records filter `TextTabs` uses the same marker. All tab-bar items share a 40 pt icon slot, label and 3 pt underline row, so the Add record label shares the baseline.
- **Curves:** `curves` in `theme.ts` and `ease` in `motion.tsx` replace `Easing.out(cubic)`: strong ease-out for entrances and state changes, ease-in-out for on-screen movement, the iOS sheet curve for sheets. Never ease-in on UI.
- **Press:** 120 ms press-in, 160 ms release, scale 0.97, `pressRetentionOffset` 16. Reduced/gentler motion swaps scale for opacity. `Tappable transition` opts into 150 ms background/border colour easing (Chip, Choice). Field focus borders use the same CSS transition. Colour still changes under calm motion, which explains state.
- **Sheet:** Modal `animationType="none"`. Scrim and card share one progress value: 320 ms in on the sheet curve, 220 ms out, unmount after exit, and reversal mid-exit. Calm motion fades only.
- **Lists:** `Enter` (layout `entering`) runs only for a row's first appearance among the first six rows (max 250 ms stagger). Virtualization remounts and pagination never replay entrances. The Records header crossfades from the loading state.
- **Choreographed swaps (`Swap` in motion.tsx):** when one region changes state, the outgoing content clears out (110 ms, 6 pt drift back), then the incoming content settles in (200 ms from 10 pt ahead, ease-out), for about 310 ms end to end. `order` makes step flows travel sideways: forward moves left, Back moves right. Each state remounts so it starts at the top. Outgoing content ignores touches, so a second tap can't repeat its action. Mid-exit changes retarget or reverse. Calm motion swaps at once. Used for: Add record steps (pages → reading → review → saved, whole screen incl. header/footer), record view ↔ edit, live share → access ended, Ask Remy intro → conversation, and health summary intro → result / rewrite. Not used for first-load → content where the header is unchanged.
- **Lists reflow:** Records rows removed by a filter fade out (110 ms). Remaining rows glide into the gap (`itemLayoutAnimation` LinearTransition, 220 ms, native only), and rows newly brought in by the filter enter. The seen-row record resets on filter change, not on focus reloads. Banners settle in from 6 pt above.
- **Sheet insets:** `useTopInset()` (layout.tsx) drops the status-bar inset for iOS page-sheet routes (`SHEET_ROUTES`, kept in sync with `sheet` in app/_layout.tsx). It reads the screen's own route, so the tab underneath keeps its inset.
- Not yet verified on a device or simulator: tab-marker travel, sheet exit/reversal, swap timing/interruption, page-sheet top spacing, and push/sheet gestures need a release-build feel check on iPhone and a low-end Android.

## 2026-11-03 — Distinct first-use and authenticated arrivals, native startup preview (DD-49)

Replace the single preload with a brief first-use document-gathering story around Remy, and a shorter returning/login folio opening using the actual RecordSkeleton. Durations are 1640/720 ms plus 240/180 ms fades; no fake progress. Wait for splash dismissal, layout and active app state before counting visible intro time. Background pauses remaining motion; reduced motion uses the settled composition without the minimum delay. Exit still requires real startup readiness. A confirmed signed-in user triggers the login arrival; password/OTP challenges do not. Track completion per signed-in user and reset on logout. Dismiss the keyboard before committing authenticated state.

Expo Go substitutes its own app-icon loader and obscured review of the requested preload. Generate the native iOS project through Expo CNG, remove the native splash image, preserve a matching plum first frame with `withLaunchBackground.cjs`, and install the real MedRec 2.0.0 Release app on iPhone 16 Pro. Register the custom storyboard mod BEFORE expo-splash-screen because the provider must be last; this also lets the custom action repair the white background/dangling constraints left by SDK 54's image-removal path. Generated native files remain ignored.

Xcode 27 requires a 15.1 deployment-target override for older resource pods. Local simulator signing must be enabled (`CODE_SIGN_IDENTITY=-`): the unsigned build stalled reading Keychain state, while the signed build played the full intro and reached onboarding. No publishing or store signing was performed. Native auto-linked dependencies include the existing Apple-authentication package; provider buttons and backend OAuth remain disabled.

29 mobile tests, TypeScript, all-platform exports and native Release compilation pass. Direct native screenshots/video show the complete first-use story and onboarding handoff. The login arrival and normal navigation/sign-out were exercised with an isolated local empty-account fixture, with no real email/account traffic; the fixture was then stopped. Do not wrap native navigation in a dynamically accessibility-hidden view or leave `accessibilityViewIsModal` on the transient animated overlay: the latter left the native accessibility tree empty after exit. Source, captures, rebuild instructions and native QA target are in `apps/mobile/validation/preload/`.

---

## 2026-11-03 — Prevent the iOS strong-password cover (DD-48)

The new-password field could display UIKit's yellow "Automatic Strong Password cover view text" and accept only the first character. Treat this as a blocking input bug, not a visual-test exception. In shared `Field`, opt out of automatic password generation on iOS secure new-password inputs from their initial render (`textContentType="none"`, `autoComplete="off"`). The earlier attempt to change hints only after reveal could not clear an already-created cover. Apply the policy consistently to registration, reset and password change; retain saved-login autofill and Android/web hints. Secure fields default to no autocorrect/spellcheck.

The native regression check now types a full masked registration password, verifies it after reveal, appends text, then repeats hide/show and checks preservation. This passes alongside sign-in typing, Remy reactions and auth navigation. 25 mobile tests, TypeScript and three-platform exports pass. Proof: `apps/mobile/validation/remy/screenshots/12-registration-password-fixed.png`. Revisit automatic generation only after a reliable native integration is verified; manual entry remains functional.

---

## 2026-11-03 — Remy acting and password reactions (DD-47)

Use generated transparent six-frame atlases for each existing main pose, plus eye-cover and one-eye-peek sequences. Keep the folder and feet planted, with sparse blinks, glances and wrist gestures instead of a perpetual body bounce. Preserve the original PNGs as loading/static fallbacks and for tiny logos. Animate atlas transforms on the UI thread rather than swapping decoded images with JavaScript timers.

Password focus covers Remy's eyes. The visibility toggle maintains input focus and selects peek/covered expressions; blur reverses the hand motion. Remy receives only attention/busy/visibility state, never password contents. Inactive/background auth routes stop acting; system and in-app reduced motion use static expressions. A shared live OS motion signal prevents stale initial queries from overriding subsequent setting changes.

Sign-in and registration use a 200 ms native fade, with no vertical form entrance, eliminating the combined diagonal movement. Measured alpha bounds and foot centers fit every Remy frame/original to a fixed visible height and baseline; both auth slots are 88 points. The shared social previews use matching 48-point controls, 16-point labels, 20-point marks, 24-point icon slots and 10-point gaps, centering each complete logo/text group. Replace the native Apple preview's fixed typography with the same custom disabled layout as Google. Keep Apple black and the registration CTA white. Password eye icons show current state (crossed out when hidden).

Verification: 25 mobile tests, TypeScript and web/iOS/Android exports pass. Native Xcode checks cover hidden/revealed fields, both auth routes and the focus/peek cycle; actual graphics and fade frames were visually reviewed. Typed-text preservation is checked on sign-in. Registration typing separately exposed the iOS 18.6 simulator's strong-password cover overlay; a temporary autofill adjustment did not resolve it and was reverted. Physical-device AutoFill remains unverified. Captures and a short sign-in recording live in `apps/mobile/validation/remy/`. Expo Go retained an older running JS preview until a cold restart; refresh the current Metro URL and dismiss its developer tutorial before visual checks. The atlases were made with built-in image generation; prompts/provenance are saved beside the assets.

---

## 2026-11-03 — Remy-led first use, standard-size sign-in, and removal of legacy apps (DD-46)

### Decision
Use `apps/mobile` and `apps/api` exclusively. At the user's explicit request, delete root `mobile/` and `backend/`; uninstall MedRec 1.0.0 from the iPhone 14 Plus simulator and stop its old port-8081 Metro server. Keep the new v2 preview on port 8092. Root and app READMEs now describe only the active stack.

Onboarding has a welcome plus records, Remy, sharing and Medical ID scenes, with **no progress bar and no Skip intro shortcut**. Reuse actual RecordRow, Question/Answer, ShareReceipt and MedicalIdCard components with labeled example data. The sample QR never grants record access. Use a shared gesture-tracked position and spring settling, fixed header/actions, and a footer caption that cannot be cut off by the preview viewport. Back moves to the header to give previews more room. LaunchReadyContext gates first-use entrances; scoped motion pauses on request, background, blur, or reduced-motion settings. Native/web accessibility hides inactive scenes and makes preview controls inert on web.

Sign-in has a compact Remy greeting and standard 48-point fields with 16-point input text. Auth actions follow the form rather than obscuring scroll content. Google and Apple buttons remain **disabled UI previews**, as requested after the initial social-auth request. No provider backend flow, credentials, entitlement activation or production deployment was added. The Apple button uses expo-apple-authentication on supported iOS devices; other surfaces show a disabled preview.

### Verification and limits
15 mobile tests and 38 v2 API integration tests pass; both projects typecheck. Web/iOS/Android bundles export. Native Xcode checks cover all scenes, Back/reverse swipes, pause/resume, standard field sizing and disabled provider controls. Screenshots and repeatable native test target: `apps/mobile/validation/onboarding/`. The audit retains 34 pre-existing findings (6 high); actual provider sign-in, store submission and a full physical-device/accessibility matrix are outside this UI pass.

---

## 2026-10-26 — "Warm folio" UI with Remy, honest Ask Remy (DD-45)

### Decision
Rebuild every `apps/mobile` screen to the Figma handoff in `design/medrec-uiux-handoff/` (ivory/aubergine/persimmon, DM Sans/Sora/Manrope bundled under OFL, compact text category tabs, centre Add record tab, plain MedRec wordmark, top-right Ask Remy). Remy is one component (`src/ui/Remy.tsx`) with six original poses and motion presets driven by shared values, never layout `entering` animations (DD-44 web crash). At the user's request every screen has an animated Remy; launch and onboarding get extra motion (hop with squash, sparkles, Remy riding the progress bar). Clinical facts stay in front of the art, and an access-ended state uses a calm pose, not a celebration.

> **Partly superseded.** The onboarding progress bar (and Remy riding it) and the welcome + 4-step onboarding were replaced by DD-46 (five-scene Remy-led introduction, no progress bar, no Skip). The single preload was replaced by DD-49's two startup stories. The whole-body bounce was replaced by DD-47's atlas acting. The "never layout `entering`" rule now applies to web only: DD-50's list `Enter` uses layout `entering` on native and falls back to a plain view on web.

Motion: 180 ms routine, 220 ms onboarding. System Reduce Motion plus an in-app "Gentler motion" setting (`src/prefs.ts`) stop all decorative movement. The preload shows only while session/first-launch state loads and always clears (timer fallback if frames are throttled).

Ask Remy has no chat model. `src/remy/answer.ts` answers only from the user's own records (API search), terms the AI already explained in a saved record, a small labelled general glossary, and fixed MedRec help. Personal-advice and urgent questions get fixed refusals that point to a clinician or emergency care; everything else gets "can't answer yet".

### Alternatives
- A new LLM chat endpoint: out of scope for a visual migration; needs its own guardrails and authorisation.
- Keeping 1-day and 7-day share links: dropped from the app UI because the design and spec fix 15/30/60 minutes. The API still accepts the longer values.

### Consequences
Design tokens keep the old key names (`accent`, `ink3`, …) so nothing else had to change shape; new roles are `persimmon`, `gold`, `panel`. QR receipts are always ink-on-white so they scan in dark mode. A free-form conversational backend remains an open gap.

---

## 2026-10-24 — v2 rebuild on Workers, Neon, R2, Gemini and emailed codes (DD-44)

### Decision
Rebuild in `apps/api` + `apps/mobile`, leaving `backend/` and `mobile/` intact until cut-over. _(Cut-over superseded by DD-46: the legacy apps were deleted on 2026-11-03 with no v1→v2 data migration.)_ API is a Hono Worker; Neon via the HTTP driver (one transaction per statement that first sets `app.user_id`/`app.role`); RLS is forced on every table and the Worker role cannot bypass it, so a missing WHERE clause leaks nothing. Activity is append-only for the app role.

Sign-in = password + 6-digit email code, sent like AdvanCare (Gmail SMTP App Password over `cloudflare:sockets`; development logs codes only when `ENVIRONMENT=development`). Trusted devices skip the code for 30 days per device. Refresh tokens rotate; a rotated token is rejected. PBKDF2-SHA256 (100k, Workers cap) with per-hash cost.

Files never get public URLs: R2 objects are streamed by the Worker for HMAC-signed paths (15 min; capped at share expiry on doctor pages). Upload content type comes from magic bytes. Pages upload as drafts, are read by Gemini (`gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` fallback, JSON schema, guardrails against diagnosis/injection), then attached atomically on save; drafts older than 24 h are purged hourly.

Doctors use a server-rendered page (DD-01, "no app install required for doctors", recorded in the Obsidian vault `MedRec/07 - Product Design/Design Decisions.md`) with CSP nonce, no-store, no framing. Medical ID is a separate minimal page (emergency facts only). The Scan tab is replaced by a Medical ID tab: doctors open links with any camera.

### Limits
Not end-to-end/zero-knowledge encrypted: the server can read records (needed for AI reading and doctor pages). Physical-device biometric/camera QA, real Gmail delivery and a live Neon/R2/Gemini deployment have not been verified. Reanimated entering animations are native-only (web cleanup crash).

---

## Archived v1 decisions

The 46 decisions below (2025-02-10 to 2026-10-14) concern the deleted v1 stack (root `mobile/` Expo SDK 52 app and `backend/` Express + PostgreSQL). All are **superseded by DD-44** (v2 rebuild) and the code was removed by DD-46. They were moved verbatim to [archive/DECISIONS_ARCHIVE.md](archive/DECISIONS_ARCHIVE.md) on 2026-11-15. Ideas still carried into v2 (PostgreSQL over NoSQL, separate Medical ID, privacy-conscious notifications, 15/30/60-minute shares, Expo + Expo Router) are restated in the v2 entries above.

- 2026-10-14 — Recover interrupted signup through password verification (DD-43)
- 2026-10-14 — Wi-Fi-independent development sign-in and deterministic backend configuration (DD-42)
- 2026-10-14 — Restore visible shared action buttons (DD-41)
- 2026-10-14 — Animated patient onboarding and complete existing flows (DD-40)
- 2026-09-12 — Automatic First-Launch Stack Priority & Login Screen Onboarding Decoupling (DD-39)
- 2026-09-07 — Pre-SignIn Patient Onboarding Flow & First-Launch Guard (DD-38)
- 2026-09-06 — Hierarchical Touch Dispatch & Cross-Platform Modal Insets (DD-37)
- 2026-09-06 — Floating Bottom Navigation Bar Redesign (DD-36)
- 2026-09-05 — Tablet Notification Modal Dual-Layer Animation Decoupling (DD-35)
- 2026-09-05 — Google Sign-In & Backend ID Token Verification Architecture (DD-34)
- 2026-09-05 — Selection Mode Done Button Visual Parity & Resilience Hardening (DD-33)
- 2026-09-04 — Records Selection Mode Normal-Layout Alignment & Scoped AI Architecture (DD-32)
- 2026-09-04 — Record Card Edit Trigger Scoping & Edit Modal Image Capture (DD-31)
- 2026-09-04 — Security & Data Integrity Audit Fixes (DD-30)
- 2026-09-04 — Shared Records ZIP Bundle Export (DD-29)
- 2026-09-04 — Shared Records Expanded API Surface (DD-28)
- 2026-09-04 — Record Metadata Edit (DD-27)
- 2026-09-04 — Active Share Session Cap at 5 (DD-26)
- 2026-09-04 — Notification Sidebar Redesign (DD-25)
- 2026-09-03 — Direct PostgreSQL Database & Cloudflare R2 Storage Architecture (DD-24)
- 2026-09-03 — Supabase Cloud Architecture, Asymmetric JWKS Authentication, Storage Presigned URLs & Google OAuth (DD-23)
- 2026-09-02 — Tablet Authentication UI Refinement & Landscape Brand Showcase Expansion (DD-22)
- 2026-09-01 — Full-Stack Production Security, AI Defense & Session Invalidation Architecture (DD-21)
- 2026-09-01 — Tablet Dual-Layer Notification Panel & Independent Dimming Architecture (DD-19)
- 2026-09-01 — Global Top Toolbar Canonical Positioning Pattern (DD-18)
- 2026-09-01 — Tablet Landscape UI Redesign & Content-Driven Layout Archetypes (DD-17)
- 2026-09-01 — Tri-State Tablet Landscape UI Architecture & Split Workspaces
- 2026-09-01 — Orientation-Invariant Device Classification & Modal Animation Lifecycle Architecture (DD-20)
- 2026-09-01 — Single-Column Tablet Redesign for Share Records & Record Details
- 2026-09-01 — Single-Column Tablet Add Health Record Modal & Content-Driven Dialog Architecture
- 2026-08-31 — Tablet & iPad UI Redesign (Adaptive Layout, Master-Detail & Sidebar Navigation)
- 2026-08-31 — Burger Navigation Drawer Hierarchy, Iconography & Active Parity
- 2026-08-31 — Mobile Codebase Modernization, Taxonomy Centralization & Boilerplate Elimination
- 2026-08-31 — Automated Startup Database Migration Guard & Schema Drift Elimination
- 2026-08-31 — Partial Profile Upsert Isolation & Physical Metric Persistence
- 2026-08-31 — Medical Record Attachment Architecture & Cross-Platform API Configuration
- 2026-08-30 — Inset Grouped Profile Architecture & Avatar Image Persistence
- 2026-08-30 — Privacy-Conscious In-App Notification Center & Two-Tier Content Architecture
- 2026-08-30 — Text-Only Drawer Menu Architecture with App Logo Branding
- 2026-08-30 — Document-First Camera & Mandatory Pre-Commit Legibility Review
- 2026-08-30 — Modular In-Modal Viewport State Management
- 2026-08-30 — Dual-Identity Separation & Emergency Medical ID Architecture
- 2026-08-30 — SQL-Level Date Formatting for Date of Birth (`to_char`)
- 2026-08-29 — Compact Horizontal Metadata & Modular Card Hierarchy for Record Details
- 2025-02-10 — React Native with Expo SDK 52 & Expo Router
- 2025-02-18 — Dedicated PostgreSQL over NoSQL Document Store
