---
type: todo-archive
title: MedRecord_App TODO Archive (v1)
project: MedRecord_App
last_updated: 2026-11-15
---

# MedRecord_App — archived tasks (v1 stack)

Moved verbatim from `../TODO.md` on 2026-11-15. These tasks belonged to the v1 implementation (root `mobile/` + `backend/`), which was deleted on 2026-11-03 (DD-46). Paths below no longer exist. Current tasks are in `../TODO.md`.

## Completed v1 tasks

### High priority
- [x] Redesign animated onboarding, responsive authentication, records dashboard, labeled navigation, and sharing duration/scope controls.
- [x] Fix first-page truncation, civil-date validation, temporary web attachment persistence, missing storage false success, and session-expiry races.
- [x] Connect React Native mobile client (`lib/api.ts`) to live Express server endpoints for Profile and User data.
- [x] Implement complete Profile Tab (`(tabs)/profile.tsx`) with Inset Grouped layout, Emergency Medical ID, Demographics, and Data Export.
- [x] Implement interactive Profile Photo upload (`expo-image-picker`) and Cloudflare R2 `avatar_url` persistence.
- [x] Complete UI screen in `app/record/add.tsx` for capturing/uploading prescriptions and lab result images (Document Camera, 3:4 Viewfinder, Quality Review, and In-Form Attachment Card).
- [x] Implement full backend and mobile attachment pipeline (`medical_records.attachment_url` in PostgreSQL schema, API endpoints, and display in `record/[id].tsx`).
- [x] Implement app-wide responsive UI across compact phones, standard phones, and tablets with stepped typography and tablet 2-column bento grids.
- [x] Implement approved Tablet & iPad UI redesign with persistent left sidebar on landscape, master-detail workspaces on dashboard and doctor scanner, centered single-column intake studio, centered single-column living QR sharing hub, centered single-column record details, and 100% phone UI isolation.
- [x] Implement functional app drawer/menu navigation (`SideMenuModal`) with dual-coded iconography and MedRec logo branding.
- [x] Implement in-app notification center (`NotificationCenterModal`) and dynamic bell trigger with backend persistence and drag affordance.
- [x] Implement AI subsystem guardrails, delimiter isolation, 2,000-char input ceiling, token completion limits, and user-keyed rate limiting.
- [x] Complete Full Backend Implementation with Node.js + Express 5, Direct PostgreSQL, Backend-Owned JWT/Bcrypt, Cloudflare R2, and 63 automated tests.
- [x] Implement shared records expanded API: AI summary, terminate session, per-record download, ZIP bundle export.
- [x] Implement Record Metadata Edit (PUT/PATCH endpoint + RecordEditModal.tsx).
- [x] Implement active share session cap (max 5 sessions, auto-prune oldest).
- [x] Complete security audit remediation: bcrypt password verify, presigned URL DB guard, R2 orphan cleanup, logout invalidation, silent upload fallback removal.
- [x] Implement Pre-SignIn Patient Onboarding Flow (4-step carousel, first-launch persistent storage guard, flicker-free bootstrap, profile replay guide).
- [x] Automatic First-Launch Onboarding Entry & Login Screen Decoupling (root stack priority, preload-to-onboarding pipeline, removed manual login buttons).

### Medium priority
- [x] Implement camera QR scanning library (`expo-camera`) in `app/(tabs)/scan.tsx`.
- [x] Declare `expo-camera` and `cameraPermission` in `mobile/app.json` for Apple App Store ingestion compliance (ITMS-90683).
- [x] Fix profile partial upsert isolation to prevent demographic edits from overwriting medical ID baselines.
- [x] Add physical metrics persistence (`height` and `weight`) in `user_profiles` schema and controllers.
- [x] Implement session invalidation via `users.token_version` on password update and logout.
- [x] Implement atomic SQL record ownership verification (`recordModel.verifyOwnership`) in share creation.
- [x] Apply user-keyed and IP-keyed rate limiting across authentication, password reset, AI, and sharing endpoints.
- [x] Notification sidebar redesign matching BurgerNav design language; unread/read state distinction; enlarged centered icons.
- [x] Instant record detail expand animation (0ms timing).
- [x] Category carousel in RecordEditModal matching add.tsx design.
- [x] Implement native biometric/passcode app lock on cold start/resume, per-account preference, and protected modal suppression.

### Low priority
- [x] Implement JSON export of consolidated patient medical history and profile data.
- [x] Implement ZIP bundle export of shared records for doctor download.
- [x] Implement printable PDF history and actual JSON file export, with complete pagination and sanitized access paths.

## Obsolete v1 open tasks (closed 2026-11-15)

- [ ] ~~Implement real password recovery tokens and email delivery; current endpoints deliberately return 503.~~ v1 only. v2 implements `/api/auth/password/forgot` and `/password/reset` with emailed codes (DD-44).
- [ ] ~~Complete browser and native visual/touch QA; computer-use approval was denied during the implementation pass.~~ v1 only. v2 native simulator checks were done (DD-46–DD-49); physical-device QA is tracked in `../TODO.md`.
- [ ] ~~**Google SSO (Single Sign-On)**: Native library temporarily decoupled ahead of future reimplementation; backend verification pipeline and token linking remain intact.~~ The v1 backend pipeline was deleted. Replaced by the v2 "Google and Apple sign-in" task.
- [ ] ~~**NEXT PHASE**: Production PostgreSQL & Cloudflare R2 Credentials Deployment & Real Device QA.~~ Replaced by the v2 deployment task (Neon + R2 + Gmail + Gemini).
- [ ] ~~v2: decide cut-over — retire `backend/` + `mobile/` once v2 is deployed and verified; there is no v1→v2 data migration yet.~~ Done 2026-11-03 by user request (DD-46), before v2 deployment; no v1 data was migrated.
