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

- [ ] **Production deployment.** A Worker already answers at the production `workers.dev` URL set in `apps/.env`, but `/api/ready` returned `503 MISCONFIGURED` on 2026-11-15. Finish the Neon project, Gmail App Password and Gemini key in `apps/.env` (R2 bucket `medrec-v2-vault` already exists), then `npm run migrate:prod` and `npm run deploy:prod` from `apps/api` and confirm `/api/ready` returns 200 (steps in `apps/README.md`). Review `PUBLIC_URL`/`ALLOWED_ORIGINS` for the real origins.
- [ ] **Physical-device QA on iOS and Android:** camera capture, Face ID/fingerprint app lock (enrollment, cancellation, background/resume), PDF share sheet, email-code autofill, password-manager AutoFill on registration (DD-47), safe areas, keyboard, haptics and VoiceOver/TalkBack.
- [ ] **Device QA for DD-51:** avatar camera/library and page-attachment pickers on device; the page-attach sheet's 400 ms iOS present-after-dismiss delay; native-sheet top spacing on profile edit.
- [ ] **Motion feel check for DD-50 (release build, iPhone + low-end Android):** tab-marker travel, sheet exit/reversal, `Swap` timing and interruption, page-sheet top spacing, push/sheet gestures, Remy acting.
- [ ] **Google and Apple sign-in:** provider setup and real OAuth. Buttons are intentionally disabled previews until the user asks to enable them; no client IDs are configured.
- [ ] **Dependency advisories:** 34 pre-existing audit findings (6 high) as of DD-46; resolve through a compatible SDK/tooling upgrade.

## Medium priority

- [ ] Decide whether Ask Remy needs a real conversational backend; today it only searches records, explains saved terms, uses a labeled glossary and gives app help (DD-45).
- [ ] Dark-mode visual pass: tokens are mapped, but no dark design exists; verify parity with system settings across screens.
- [ ] Release signing and store submission (none performed; account deletion required by stores is in place per DD-51).
- [ ] On the next Expo upgrade, review/remove `apps/mobile/scripts/patchExpoSimulator.cjs` (Xcode 27 Device Hub launcher backport).
- [ ] Revisit iOS automatic strong-password generation once a reliable native integration is verified (currently disabled on new-password fields, DD-48).

## Future ideas

- [ ] Multi-patient / dependent profile switcher for caregivers.
- [ ] Lock screen Emergency Medical ID widget for iOS (WidgetKit).
- [ ] On-device local LLM summarization using llama.rn for offline medical analysis.
- [ ] Integration with Apple HealthKit and Google Health Connect.

## Done (v2)

- [x] v2 rebuild in `apps/` on Workers, Neon, R2, Gemini and emailed codes, including password reset by email code (DD-44, 2026-10-24).
- [x] Warm folio redesign with Remy and bounded Ask Remy (DD-45, 2026-10-26).
- [x] Remy-led onboarding, standard-size sign-in; legacy root `mobile/` and `backend/` deleted (cut-over, no v1 data migrated) (DD-46, 2026-11-03).
- [x] Remy acting and password reactions; iOS strong-password cover fix; two startup stories with native Release preview (DD-47–DD-49, 2026-11-03).
- [x] Purposeful navigation and interaction motion (DD-50, 2026-11-04).
- [x] Working profile edit (list drafts saved, phone, photo, validation), in-app account deletion, records without documents, attach pages later (DD-51, 2026-11-04).
