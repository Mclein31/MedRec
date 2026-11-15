---
type: project-brain
title: MedRecord_App Project Context
project: MedRecord_App
status: active
last_updated: 2026-11-15
---

# MedRec — project context

MedRec is a personal medical-record app with private document storage, AI document reading, temporary view-only doctor sharing by QR, and a separate public Medical ID. Remy, an organizer mascot, guides the app and answers bounded questions.

## Status (verified 2026-11-15)

- **Active implementation:** `apps/mobile` + `apps/api` only (v2, app version 2.0.0, bundle/package `com.mclein.medrec`). The legacy root `mobile/` and `backend/` apps were deleted at the user's request on 2026-11-03 (DD-46); their history is in Git and `archive/`.
- **Last code change:** 2026-11-04 (profile/Medical ID/sharing updates DD-51, motion pass DD-50). Mobile: 31 unit tests pass; API suite has 40 integration tests.
- **Not in production yet.** A Worker exists at the production `workers.dev` URL configured in `apps/.env`, but `/api/ready` returned `503 MISCONFIGURED` on 2026-11-15: secrets/database are not fully configured. No release signing or store submission has been done. Physical-device QA is outstanding. See TODO.md.

## Stack

- `apps/mobile`: Expo SDK 58 (`expo ~58.0.25`), React Native 0.88.1, React 19.3, Expo Router 58, Reanimated 4.7, Gesture Handler 3, SecureStore. Warm-folio tokens (ivory, aubergine, persimmon, gold) with bundled DM Sans/Sora/Manrope. Runs on iOS, Android and web.
- `apps/api`: Hono on Cloudflare Workers; Neon Postgres (HTTP driver) with forced RLS as the unprivileged `medrec_app` role; private R2 (`medrec-v2-vault`) served through HMAC-signed paths; Gemini document reading; Gmail SMTP email codes. Server-rendered doctor share page (`/s/:token`) and Medical ID (`/e/:slug`).
- Structure and module ownership: ARCHITECTURE.md. Configuration and gotchas: NOTES.md.

## Product behavior

- Sign-in: password + emailed 6-digit code; trusted devices skip the code for 30 days. Refresh tokens rotate. Password reset/change and account deletion revoke devices. Users can delete their account in-app (password required).
- Records: AI-read document intake (pages → reading → review → saved), records without documents, pages attached later (not AI-read), search and category filters.
- Sharing is view-only with 15/30/60-minute UI choices, scoped to all/categories/records, revocable. The public Medical ID is separate and off until enabled.
- Ask Remy is deliberately bounded: own-record search, terms from saved AI readings, a labeled general glossary and fixed app help. No free-form chat model and no personal medical advice.
- First use: two startup stories (first-use and signed-in arrival, DD-49) and a five-scene Remy-led introduction built from real components with labeled example data; the sample QR grants no access.

## Standing user instructions

- First use is the personalized setup (DD-52): four optional questions with a progress bar; every answer must change something real, and Remy's replies only promise what the app does. The replayable tour (Profile → How MedRec works) keeps DD-46's rules: no progress bar, no Skip.
- **Google and Apple sign-in stay disabled previews** until the user asks otherwise. Apple stays solid black; no OAuth flow is activated.
- Sign-in uses basic/default sizing (48-point fields, 16-point input text) with a compact Remy welcome; form actions scroll with content.
- Only active, focused, foreground decorative motion runs; system Reduce Motion and in-app Gentler motion calm everything.
- Do not put review exports in Downloads; keep them in the workspace/design folder.
- Keep `.brain/` operational, `MedRec/` (Obsidian vault) for long-form product/research, and `_BRAIN/` for the ecosystem. Do not add another knowledge system.

## Commands

- App: `npm start` from `apps/mobile`; API: `npm run dev` from `apps/api` (port 8787). Full setup and deployment: `apps/README.md`.
- Checks: `npm test --prefix apps/mobile`, `npm run typecheck --prefix apps/mobile`, `npm test --prefix apps/api`, `npm run typecheck --prefix apps/api` (API tests need local Postgres).
- Production: `npm run migrate:prod` / `npm run deploy:prod` from `apps/api`; `npm run start:prod` from `apps/mobile`.
- Native preview: iPhone 16 Pro simulator (85495F80-A293-47AC-8F2C-CE9294F2A266); Expo Go 58 or the native Release build (rebuild after the SDK 58 upgrade) (see NOTES.md).

## Related

- Email-code sign-in reuses the AdvanCare pattern (Gmail SMTP App Password over `cloudflare:sockets`).
- Figma designs live in the shared "Personal Projects" Figma file alongside SERVIO (dedicated "MedRec · App design" page). Handoff package: `design/medrec-uiux-handoff/`.
