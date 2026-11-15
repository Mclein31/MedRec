---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-11-15
---

# MedRecord_App (MedRec) — Changelog

Newest first. v1 history (0.1.0 – 1.4.27, root `mobile/` + `backend/`) is archived verbatim in [archive/CHANGELOG_ARCHIVE.md](archive/CHANGELOG_ARCHIVE.md).

## [Unreleased] — 2026-11-15 — Small fixes after device testing

- "No known allergies / conditions / current medications" now show in neutral text on the Medical ID tab, the public emergency page and the doctor share page instead of the red alert style.
- Sessions signed in on a trusted device keep that device's name (no more "Unknown device"); new sign-ins are named "iPhone", "iPad", the Android model, or "Web browser".
- Ask Remy says when it's answering from the quick record search because the AI is unavailable.
- Web: decorative views use `aria-hidden` (`src/ui/a11y.ts`) instead of native-only props that React warned about.

## [Unreleased] — 2026-11-15 — Ask Remy reads your records (DD-54)

- Ask Remy now answers with Gemini from the person's own records (lab values, flags, medicines, dates, notes), cites the records it used and suggests follow-up questions; it still refuses diagnosis and medication decisions and falls back to search when the AI is unavailable.

## [Unreleased] — 2026-11-15 — Multi-page records, dark mode, Medical ID fixes (DD-53)

- Adding pages to a record now offers AI reading of all pages or manual editing; a page viewer shows every page (DD-53). API AI scan limit 18 → 14 MB (deployed).
- Dark mode: warm charcoal backgrounds instead of aubergine, and a soft glow behind Remy so his body doesn't blend in.
- Health details: explicit "No known allergies / conditions / current medications" options.
- Medical ID Call button: dials a cleaned `tel:` number and explains when the device can't call.
- Onboarding: progress bar now exposed to VoiceOver; native UI test rewritten for the setup flow (passes on iPhone 16 Pro, Expo Go 58).
- Sample documents for scan testing in `apps/mobile/validation/samples/`.

## [Unreleased] — 2026-11-15 — Production live, Expo SDK 58, personalized setup (DD-52)

- Production: Neon migrated, Worker and 6 secrets deployed, `/api/ready` 200.
- Expo SDK 54 → 58 (RN 0.88, React 19.3, TypeScript 6); Device Hub patch script removed; audit 34 → 3 moderate.
- First use is now a personalized setup (name, goal, record types, comfort) with a rewarding finish; answers drive registration prefill, Records tabs/order and a home shortcut. Profile → "Personalize MedRec" re-runs it. The old tour remains under "How MedRec works".

## 2026-11-15 — Brain cleanup

- Verified `.brain/` against the code and git history (last code commit 2026-11-04; `apps/mobile` 2.0.0 on Expo SDK 54.0.x / RN 0.81.5 / Expo Router 6; `apps/api` Hono Worker; mobile 31 tests pass; API suite has 40 tests).
- Moved v1-era material verbatim into `archive/`: decisions DD-43 and older (`DECISIONS_ARCHIVE.md`), changelog 0.1.0–1.4.27 (`CHANGELOG_ARCHIVE.md`), v1 technical notes (`NOTES_ARCHIVE.md`), completed/obsolete v1 tasks (`TODO_ARCHIVE.md`) and the 2026-10-14 v1 sign-in audit (`AUTH_AUDIT.md`).
- TODO rebuilt for v2: closed the legacy cut-over (DD-46) and v1 password-recovery items (v2 has `/password/forgot` + `/password/reset`), merged duplicate device-QA, biometric and dark-mode items, added open verification items from DD-47/50/51, and recorded that a Worker already exists at the production URL but `/api/ready` reports `MISCONFIGURED`.
- NOTES now hold current v2 gotchas (moved out of PROJECT_CONTEXT) and v2 configuration; Figma/design-output paths updated to `/Users/mclein/projects/MedRec/Design_Handoff/`.
- DECISIONS: marked DD-44's cut-over and parts of DD-45 as superseded; added an index of archived v1 decisions.
- `FLOW.json` validated as JSON; all referenced paths exist, no changes.

## [Unreleased] — 2026-11-04 — Working profile edit and feature completeness (DD-51)

- Profile tab: tappable avatar with camera badge and a photo sheet (take, choose, remove), an "Edit profile" CTA, and a "Finish your Medical ID" prompt listing missing facts. Sign out is a normal row.
- Edit profile: fixed silent loss of allergies/conditions/medications typed without tapping Add (now saved with the form); added the user's own mobile number, read-only email, photo, inline validation for name/date/height/weight/phones, and a discard-changes guard. Medical ID's edit opens the same screen titled "Edit Medical ID".
- Account deletion: `DELETE /api/auth/account` (password required) removes all R2 files and cascades every row. Security & privacy has the confirm flow; sign-in explains a deleted account or a changed password.
- Records: add a record without a document ("No document? Type it in"); attach pages to an existing record; visible close mark on the full-screen page viewer; clearer Ask Remy affordance.
- Share and Medical ID "Send" fall back to copying the link where the browser has no share sheet. Shared brand `Toggle` (no teal web thumb). Medical ID card blood type aligns with the name. First-record CTA reads "Add my first record" on web.
- Mobile 31 tests, API 40 tests, both typechecks and web/iOS/Android exports pass. Web flows checked against a local API with a local-only QA account. Google/Apple sign-in remain disabled previews.

## [Unreleased] — 2026-11-04 — Purposeful motion pass (DD-50)

- Push routes use the platform push. Modal routes present as native sheets instead of cross-fading. Reduced motion fades everything.
- One sliding persimmon marker for the tab bar and the Records filter tabs. Tab labels now share a baseline.
- Shared curves (`theme.curves`, `motion.ease`), quicker press feedback, colour transitions on chips, choices and field focus.
- Sheet enter/exit with a shared scrim, faster exit and interruptible reversal.
- List row entrances no longer replay on scroll or pagination. The Records header fades in from loading.
- Choreographed state swaps: outgoing content clears out before incoming content settles in (~310 ms). Add record steps travel sideways, and Back reverses. Record edit mode, access ended, Ask Remy's first question, and the health summary all swap in place.
- Filtered-out record rows fade while the remaining rows glide together. Banners settle in.
- iOS page sheets no longer reserve a status-bar gap at the top.

## [Unreleased] — 2026-11-03 — Two startup stories and a native preview (DD-49)

- First-use pages gather around Remy before onboarding; confirmed login/returning arrival opens a compact folio using real record placeholders. Added visible-start gating, background pause/resume, reduced-motion fallback and per-session completion; keyboard dismisses before arrival.
- Removed the native splash icon and generated an image-free plum storyboard through a small CNG plugin. Built and installed a locally signed MedRec 2.0.0 Release app on iPhone 16 Pro so startup is visible without Expo Go's separate icon loader.
- 29 mobile tests, TypeScript, three-platform exports, native Release compilation and fixture login/navigation checks pass. Actual native startup video and rebuild/QA instructions: `apps/mobile/validation/preload/`.

## [Unreleased] — 2026-11-03 — Working iOS new-password entry (DD-48)

- Prevented UIKit's yellow automatic-password cover by disabling generation from initial mount for iOS secure new-password fields. Applies to registration/reset/password change; existing-login autofill and other platform hints remain.
- Restored registration typing to native regression coverage: masked entry, revealed editing and repeated hide/show preserve the complete value. Mobile 25 tests, TypeScript, three-platform exports and the native interaction check pass.

## [Unreleased] — 2026-11-03 — Remy expressions and auth motion (DD-47)

- Added minor blinks, glances and wrist gestures to all six Remy poses, plus reversible eye-cover and one-eye-peek sequences for password focus and visibility. Removed repeating whole-body bouncing.
- Replaced diagonal auth movement with a 200 ms fade. Preserved focus when toggling password visibility; no password contents reach Remy.
- Normalized Remy's visible height and foot position for every frame/fallback; both auth screens use an 88-point mascot. Matched and centered the disabled social buttons' icons, typography, padding and gaps. Reversed the eye icon to reflect hidden/revealed state.
- Added live OS Reduce Motion handling and lifecycle guards. Mobile 25 tests, TypeScript, three-platform exports and native visual interaction checks pass. Actual screenshots and recording: `apps/mobile/validation/remy/`. Registration typing has a separately documented iOS simulator AutoFill overlay limitation; password-manager hints were preserved.

## [Unreleased] — 2026-11-03 — First-use and sign-in refinement (DD-46)

- Remy-led onboarding built from the actual app UI, with directional swipe/spring transitions, delayed launch handoff, pause control and reduced-motion support. Removed the progress bar and Skip intro action.
- Fixed clipped onboarding captions and mascot overlap; moved Back to the header to preserve preview space. Added explicit web accessibility hiding/inert previews.
- More engaging sign-in with standard-size fields and disabled Google/Apple previews. Authentication actions now scroll with the form.
- Deleted the legacy root `mobile/` and `backend/` projects at the user's request, removed the old simulator app, stopped the old Metro process, and updated current project docs.
- Native screenshots and Xcode UI checks in `apps/mobile/validation/onboarding/`. Mobile 15 tests, API 38 tests, TypeScript and three-platform exports pass.

## [2.0.0-alpha.2] — 2026-10-26 — Warm folio redesign with Remy (DD-45)

- **Design system**: new tokens, bundled DM Sans/Sora/Manrope, persimmon/aubergine/gold buttons, text category tabs, bottom sheet, zigzag QR receipt (28 teeth, 6 px), Remy app icon, adaptive icon and splash.
- **Remy**: six poses with idle/wave/hop/read/search/cheer/peek motion, ground shadow and sparkles; animated on every screen, extra on launch and onboarding.
- **New routes**: animated launch preload, welcome + 4-step onboarding, `/remy` (Ask Remy), `/share/[id]` (QR pass and access ended), `/record/explain`, `/preferences` (larger text, appearance, gentler motion).
- **Flows restyled**: auth/OTP/recovery, records (loading, empty, no-match, category sheet), record detail, intake (upload incomplete, reading, review, saved after the API confirms), sharing, Medical ID, profile/export sheet, security (app lock moved here), activity, summary, app lock.
- **Verification**: mobile typecheck (incl. no unused locals); 15 unit tests (8 new for Ask Remy); web/iOS/Android exports; web UI walk-through at 390×844 and 320 px with larger text against a local API: real OTP sign-in, record list/search/no-match, detail/explain, upload → save, Ask Remy, share QR decoded with BarcodeDetector, scope (labs only) and revoke (404 afterwards), gentler motion. No native device QA.

## [2.0.0-alpha] — 2026-10-24 — Rebuild from scratch in `apps/` (DD-44)

- **API (`apps/api`)**: Cloudflare Worker (Hono) on Neon Postgres with forced row-level security as an unprivileged `medrec_app` role; R2 private storage streamed through HMAC-signed short-lived paths; Gemini document reading with model fallback; hourly cleanup cron.
- **Auth**: password + emailed 6-digit code via Gmail SMTP App Password (AdvanCare pattern), newest-code-only, 10-min TTL, 5 tries, 60 s resend cooldown, trusted devices (30 days), rotating refresh tokens with reuse rejection, account lockout, password reset that signs out everywhere.
- **Sharing**: HMAC share tokens (never stored), scope all/categories/records, 15 min–7 days, revoke/revoke-all, server-rendered doctor page with CSP nonce and view notifications. Public Medical ID page with rotation and throttled view alerts.
- **App (`apps/mobile`)**: new Expo SDK 54 client — onboarding, sign-in/register/code/reset, Records (search, chips, keyset pagination), Add (camera/photos/PDF → AI read → review), record detail, Share (QR hero + countdown), Medical ID, Profile (app lock, exports, devices), Activity, Health summary. Light/dark tokens, Lexend Deca, visible labels.
- **Verification**: API 37 integration tests; mobile 7 unit tests; both typecheck; Worker dry-run bundle; web/iOS/Android exports; live `wrangler dev` end-to-end probe; UI sign-in driven in headless Chrome. Legacy `backend/` and `mobile/` untouched.
