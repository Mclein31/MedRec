---
type: todo-list
title: MedRecord_App Tasks & Backlog
project: MedRecord_App
tags:
  - todo
  - backlog
last_updated: 2026-11-15
---

# MedRecord_App (MedRec) — TODO

Scope: the v2 app (`apps/mobile` + `apps/api`). Completed and obsolete v1 tasks are in [archive/TODO_ARCHIVE.md](archive/TODO_ARCHIVE.md).

## High priority

- [ ] **Physical-device QA on iOS and Android:** camera capture, Face ID/fingerprint app lock (enrollment, cancellation, background/resume), PDF share sheet, email-code autofill, password-manager AutoFill on registration (DD-47), safe areas, keyboard, haptics and VoiceOver/TalkBack.
- [ ] **Device QA for DD-51:** avatar camera/library and page-attachment pickers on device; the page-attach sheet's 400 ms iOS present-after-dismiss delay; native-sheet top spacing on profile edit.
- [ ] **Motion feel check for DD-50 (release build, iPhone + low-end Android):** tab-marker travel, sheet exit/reversal, `Swap` timing and interruption, page-sheet top spacing, push/sheet gestures, Remy acting.
- [ ] **Google and Apple sign-in:** provider setup and real OAuth. Buttons are intentionally disabled previews until the user asks to enable them; no client IDs are configured.

## Medium priority

- [ ] **Deploy the API scan-size fix (DD-53)**: `npm run deploy:prod` from `apps/api` (blocked by a permission check on 2026-11-15; needs the user's go-ahead).
- [ ] Device check for multi-page records (DD-53): Pages added sheet after the iOS picker, AI read of several phone photos, page viewer swipe and PDF opening.
- [ ] Device check for the new setup flow (DD-52): name-step keyboard, finish haptic, personalized Records home when signed in. (Native UI test updated and passing on the simulator.)
- [ ] Decide whether Ask Remy needs a real conversational backend; today it only searches records, explains saved terms, uses a labeled glossary and gives app help (DD-45).
- [ ] Dark mode on device: web review of every main screen done 2026-11-15 (charcoal backgrounds, Remy glow); check on iPhone/Android, including system switching.
- [ ] Release signing and store submission (none performed; account deletion required by stores is in place per DD-51).
- [ ] Revisit iOS automatic strong-password generation once a reliable native integration is verified (currently disabled on new-password fields, DD-48).

## Future ideas

- [ ] Multi-patient / dependent profile switcher for caregivers.
- [ ] Lock screen Emergency Medical ID widget for iOS (WidgetKit).
- [ ] On-device local LLM summarization using llama.rn for offline medical analysis.
- [ ] Integration with Apple HealthKit and Google Health Connect.

## Done (v2)

- [x] Expo SDK 54 → 58 upgrade (RN 0.88, React 19.3, TS 6): audit 34 findings (6 high) → 3 moderate (dev-only `minimatch`, npm's fix would downgrade Expo); Device Hub patch removed; typecheck, 31 tests, web/iOS/Android export and Expo Go 58 simulator launch pass (2026-11-15). Native Release build not yet rebuilt.
- [x] Production deployment: `npm run migrate:prod` (001_init, 002_rls, medrec_app password) and `npm run deploy:prod` (Worker + 6 secrets) on Neon `ap-southeast-1`; `/api/ready` returns 200 (2026-11-15). `ALLOWED_ORIGINS` intentionally empty until a web origin exists.
- [x] v2 rebuild in `apps/` on Workers, Neon, R2, Gemini and emailed codes, including password reset by email code (DD-44, 2026-10-24).
- [x] Warm folio redesign with Remy and bounded Ask Remy (DD-45, 2026-10-26).
- [x] Remy-led onboarding, standard-size sign-in; legacy root `mobile/` and `backend/` deleted (cut-over, no v1 data migrated) (DD-46, 2026-11-03).
- [x] Remy acting and password reactions; iOS strong-password cover fix; two startup stories with native Release preview (DD-47–DD-49, 2026-11-03).
- [x] Purposeful navigation and interaction motion (DD-50, 2026-11-04).
- [x] Working profile edit (list drafts saved, phone, photo, validation), in-app account deletion, records without documents, attach pages later (DD-51, 2026-11-04).
