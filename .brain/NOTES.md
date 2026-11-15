---
type: notes
title: MedRecord_App Reference Notes
project: MedRecord_App
tags:
  - notes
  - reference
last_updated: 2026-11-15
---

# MedRecord_App (MedRec) — Technical Notes

Gotchas and reference for the current v2 app. v1 notes (Express backend, port 4000, drawer/notification center, teal design tokens, Google SSO) are archived verbatim in [archive/NOTES_ARCHIVE.md](archive/NOTES_ARCHIVE.md).

## Configuration (v2)

- API: `apps/api` on port 8787 (`wrangler dev` listens on 0.0.0.0). Local secrets in ignored `apps/api/.dev.vars` (template `.dev.vars.example`): `DATABASE_URL`, `JWT_SECRET`, `FILE_SIGNING_SECRET`, `GEMINI_API_KEY`, `SMTP_USER`, `SMTP_PASSWORD`. Empty SMTP values print sign-in codes to the terminal in development only.
- Production: one ignored file, `apps/.env` (template `apps/.env.example`). `npm run deploy:prod` uploads Worker secrets plus `PUBLIC_URL`/`ALLOWED_ORIGINS`; `MIGRATION_DATABASE_URL`/`APP_DB_PASSWORD` are used only by `npm run migrate:prod`; `EXPO_PUBLIC_API_URL` reaches the app via `npm run start:prod`/`export:prod`.
- R2 bucket `medrec-v2-vault` (preview `medrec-v2-vault-dev`) is deliberately separate from v1's `medrec-vault`.
- Gemini: `gemini-3.5-flash-lite` with `gemini-3.1-flash-lite` fallback (`wrangler.toml`).
- Mobile: leave `EXPO_PUBLIC_API_URL` unset in development; `src/lib/apiBase.ts` derives port 8787 from Metro's host so phones on the same Wi-Fi work. Never restore the old port-4000 or pinned-LAN-IP assumptions (a stale pinned IP caused the 2026-10-14 sign-in outage; see archive/AUTH_AUDIT.md).
- API tests create a fresh local Postgres database and run as `medrec_test`, a member of the unprivileged `medrec_app` role, so RLS is enforced in tests.

## Gotchas

- **Reanimated layout `entering` crashes on web unmount.** Use shared-value motion (`Rise`, `Swap` in `src/ui/motion.tsx`). The list `Enter` in `src/ui/layout.tsx` uses `entering` on native only and renders a plain view on web.
- **Reanimated `AnimatedPressable` drops Pressable style callbacks** (learned in v1, DD-41): pass a static style array/object and move pressed opacity/scale into `useAnimatedStyle`, or buttons render without backgrounds.
- **iOS strong-password cover (DD-48):** secure new-password fields must opt out of automatic generation from the first render (`textContentType="none"`, `autoComplete="off"` in shared `Field`). Changing hints after reveal does not clear an existing cover. Saved-login autofill and Android/web hints stay on.
- **Remy atlases:** clip each atlas source cell before applying the size/foot-alignment transform; the outer display slot must allow overflow so the waving hand is not cut. `remyGeometry.ts` normalizes height and foot center. Only focus/visibility/busy signals reach Remy, never field contents.
- **Onboarding layout:** keep captions outside the preview scroll region so actions can't cut them off; Remy gets his own space rather than covering record text.
- **Accessibility and overlays (DD-49):** do not wrap the native navigator in a dynamically accessibility-hidden view, and do not leave `accessibilityViewIsModal` on the transient launch overlay; both left native controls hidden after exit.
- **Sheet insets:** `SHEET_ROUTES` in `src/ui/layout.tsx` must stay in sync with the `sheet` route options in `app/_layout.tsx`.
- **Account deletion:** FK cascades remove all owned rows, including append-only activity; RI cascades are not blocked by the app role's RLS (verified by test). R2 objects are deleted first.
- **Password hashing:** PBKDF2-SHA256 at 100k iterations is the Workers cap; cost is stored per hash.

## Native preview and Xcode 27

- Expo Go must match SDK 54 and inserts its own app-icon loader, which hides splash/startup work. Review startup with the native Release app (`com.mclein.medrec`, MedRec 2.0.0) on the iPhone 16 Pro simulator; rebuild steps and captures are in `apps/mobile/validation/preload/README.md`.
- Generated `ios/` stays ignored. Keep `plugins/withLaunchBackground.cjs` registered BEFORE `expo-splash-screen` in the plugins list.
- Xcode 27 needs a 15.1 deployment-target override for older pods (`IPHONEOS_DEPLOYMENT_TARGET=15.1`) and local simulator signing (`CODE_SIGN_IDENTITY=-`); the unsigned build stalls reading Keychain state.
- Xcode 27 ships Device Hub instead of Simulator.app. `apps/mobile/scripts/patchExpoSimulator.cjs` backports Expo PR #46757 (app ID/plist discovery, dual process detection, Device Hub launch fallback); it runs on postinstall/prestart and is guarded to the exact CLI version. Review it on any Expo upgrade.
- A fresh or erased simulator needs a build installed before pressing `i`; `expo start` alone does not install one.
- Expo Go can keep an older JS bundle running until a cold restart; refresh the current Metro URL and dismiss its developer tutorial before visual checks.
- Validation captures: `apps/mobile/validation/onboarding/`, `remy/`, `preload/`.

## Design source: Figma and handoff (2026-10-26)

> Paths updated 2026-11-15: the external design workspace moved from `~/Documents/ChatGPT/MedRec/` to `/Users/mclein/projects/MedRec/Design_Handoff/`. The warm folio direction was implemented in production by DD-45.

- **Complete UI/UX implementation handoff (2026-10-26):** `design/medrec-uiux-handoff/` contains all 52 current PNG/SVG screen references, three boards, 2,737 layer nodes, semantic/raw tokens, 221 prototype-linked nodes, selected Remy assets, gallery, route map and `CLAUDE_PROMPT.md`. Target is v2 `apps/mobile` + `apps/api` per DD-44. The snapshot includes 40px header Remy and the white welcome panel. This packaging changed no production code; Figma remains the editable source.
- **Figma organization:** latest MedRec screens, components/states and brand/Remy assets moved to the dedicated **MedRec · App design** page (`77:3066`) in the existing file. Current section IDs remain `71:15559`, `71:15560`, `71:18177`. The old rejected sections `69:746` and `69:747` were deleted at user request; SERVIO's 76 unrelated top-level nodes and three flows were unchanged. Five current MedRec flows moved; destination validation found no broken links. Local page ledger: `/Users/mclein/projects/MedRec/Design_Handoff/design-output/MedRec-page-organization.json`.
- **Current reviewable direction:** [Warm folio](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-15559), replacing the rejected mint theme and folded-M logo. Ivory, aubergine, persimmon, golden/peach; 29 main screens include launch/loading and [Ask Remy](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=75-2656). User calls the selected organizer mascot Remy and intends him as the chatbot. Four expression variants and a page-by-page placement plan are on the [brand board](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-18177). Chat is a fixed synthetic Figma demo, not live AI. Full rationale: [[07 - Product Design/UI Concepts#2026-10-26 — Warm folio and Remy assistant]]. This does not approve or implement production changes.
- **Review-file preference:** user objected to filling Downloads. All 24 exact session-created exports were moved into `/Users/mclein/projects/MedRec/Design_Handoff/design-output/review-exports/`. Keep future review files inside the workspace and use live Figma views for routine checking.
- **Rejected category treatment:** oversized folder-shaped record cards were rejected. Current Figma records use compact text filters and a roomier document list; the onboarding preview uses document rows. Remy's selected character and the logo are unaffected. Do not restore the bulky category folders.
- **Latest Figma refinement:** five-item navbar with Add record centered; plain MedRec header name, Remy beside Ask Remy at top right. Launch and all five QR receipt headers use Remy; QR cards have top/bottom zigzag tear edges. Magnifying-glass Remy is on search-empty, and the app icon is a new Remy close-up. Current visual rules and asset/prompt paths: `/Users/mclein/projects/MedRec/Design_Handoff/DESIGN.md`. These are Figma concepts, not production changes.
- **Superseded direction 04:** the first teal draft was rejected. The subsequent [iris, mint and coral proposal](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-15559) contained 24 main screens and the selected organizer. Mint and the M logo were subsequently rejected. The orange/serif journal concept, conventional clinical-blue palette, and paper mascot were also rejected. See [[07 - Product Design/UI Concepts#2026-10-26 — Iris, mint and coral brand direction]].
- First (rejected teal) draft was created beside SERVIO in the existing [Personal Projects file](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=69-746), same page, section `69:746`; components and supporting states in `69:747` (both sections since deleted at user request).
- 20 main screens, supporting variants/sheets, reusable components and 203 linked prototype actions. Lexend Deca, restrained teal, bare icons, larger controls, explicit share scopes. Production source was not changed; this does not supersede existing design decisions until reviewed.
- Rationale, source references, validation and limitations: [[07 - Product Design/UI Concepts#2026-10-26 — Figma redesign draft]]. Builder and exported state/overview are under `/Users/mclein/projects/MedRec/Design_Handoff/`.

## MedRec Obsidian vault

`MedRecord_App/MedRec/` is the Obsidian vault for long-form knowledge: `01 - Vision & Goals/`, `02 - Problem Space/` (data silos, lost records, patient ownership), `03 - Research/` and `04 - Users/` (patient and doctor workflows), `07 - Product Design/` (design decisions such as DD-01, UI concepts), `08 - Technical Architecture/`, `09 - Database/`, `10 - Security & Privacy/` (threat models, token revocation, encryption).
