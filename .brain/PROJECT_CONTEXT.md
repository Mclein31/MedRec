---
type: project-brain
title: MedRecord_App Project Context
project: MedRecord_App
status: active
last_updated: 2026-11-03
---

# MedRec — project context

MedRec is a personal medical-record app with private document storage, AI document reading, temporary doctor sharing, and a separate Medical ID. The only active implementation is **`apps/mobile` + `apps/api`**. The user explicitly requested deletion of the root legacy `mobile/` and `backend/` applications on 2026-11-03; both were removed, and the installed MedRec 1.0.0 build was uninstalled from the iPhone 14 Plus simulator. Historical implementation decisions remain in Git and DECISIONS.md.

## Current product and stack

- `apps/mobile`: Expo SDK 54 / React Native 0.81.5 / Expo Router. Shared warm-folio tokens: ivory, aubergine, persimmon, DM Sans/Sora/Manrope. Original Remy poses live in `assets/remy`.
- `apps/api`: Hono Cloudflare Worker, Neon Postgres with forced RLS, private Cloudflare R2, Gemini document reading, Gmail SMTP email codes. See ARCHITECTURE.md and `apps/README.md`.
- Sign-in uses password + emailed OTP; trusted devices skip the code for 30 days. Refresh tokens rotate. Password reset/change revoke existing devices.
- Remy is deliberately bounded: own-record search, terms from saved AI readings, a labeled general glossary, and fixed app help. No free-form chat model or personal medical advice.
- Sharing is view-only with 15/30/60-minute UI choices and revocation. Public Medical ID is separate and off until enabled.

## Latest UI work (2026-11-03)

- Remy-led introduction: welcome, actual record rows, actual Ask Remy messages, actual QR receipt, shared Medical ID component. Examples are labeled and the sample QR grants no access.
- The user requested **no progress bar and no Skip intro shortcut**. Keep clear Next/Back actions, swipe gestures, returning-member sign-in, and motion pause/reduced-motion support.
- First-use entrances wait until Launch has left. Scene movement follows the swipe and settles with a spring. Only active/focused/foreground decorative motion runs.
- Keep captions outside the preview scroll region so the action area cannot cut them off. Remy must have its own space rather than cover record text.
- Sign-in: engaging, compact Remy welcome with **basic/default sizing** (48-point fields, 16-point input text). Form actions scroll with content, including when the keyboard is open.
- **Google and Apple sign-in must remain disabled for now**, per the user's latest instruction. Both previews use the same custom 48-point layout, 16-point label, 20-point icon, 24-point icon slot and 10-point gap, with the logo/text group centered as a whole. Apple stays solid black. The actual registration Create account CTA uses white text on a deeper orange and sits directly below the fields; sign-in keeps a simple registration link. No OAuth endpoint/session flow was activated.
- Remy now uses six-frame transparent atlases for minor blinks, glances and wrist gestures across the six main poses, replacing the repeating whole-body bounce. Password focus covers his eyes; showing the password reveals a playful one-eye peek; hiding it covers again, and blur lowers the hand. Only focus/visibility/busy signals reach Remy, never field contents. Auth routes use a 200 ms fade with no directional form entrance. See `apps/mobile/validation/remy/` for actual native captures and the interaction recording.
- `remyGeometry.ts` fits measured alpha bounds to the same visible height and foot center across every pose/frame and original fallback; both auth screens use an 88-point Remy slot. Password eye icon reflects current state: crossed out when hidden, open when revealed.
- Clip each Remy atlas source cell **before** applying the size/foot alignment transform. The final display slot must allow overflow so the waving hand remains complete; source-cell clipping still excludes neighboring atlas sprites.
- Two startup experiences: first-use pages gather around Remy before onboarding (1640 ms + 240 ms exit); returning/confirmed-login folio opens to the real RecordSkeleton (720 ms + 180 ms exit). Motion begins after splash/layout/foreground readiness, pauses in background, and skips travel/minimum duration for reduced motion. Real auth/readiness still gates handoff. Keyboard dismisses on authentication completion.
- Startup review now uses the installed **MedRec 2.0.0 native Release app** (`com.mclein.medrec`) on iPhone 16 Pro. Its native first frame is plum with no app-icon image; Expo Go inserts a separate icon loader that obscures splash review. Rebuild commands and actual recordings: `apps/mobile/validation/preload/README.md`. Simulator builds need local signing enabled for Keychain and a 15.1 pod deployment-target override on Xcode 27. Generated `ios/` stays ignored; keep `withLaunchBackground.cjs` BEFORE `expo-splash-screen` in plugins.

## Commands and configuration

- App: `npm start` from `apps/mobile`; API: `npm run dev` from `apps/api` (8787).
- App finds the current Metro host when EXPO_PUBLIC_API_URL is unset. Never restore old port-4000 assumptions.
- Production configuration: ignored `apps/.env`; template `apps/.env.example`. API local config: ignored `apps/api/.dev.vars`.
- Mobile: `npm test --prefix apps/mobile`, `npm run typecheck --prefix apps/mobile`.
- API: `npm test --prefix apps/api`, `npm run typecheck --prefix apps/api`. Tests create a separate local Postgres database and use the unprivileged medrec_test role.
- Expo Go must match SDK 54. Native preview uses the iPhone 16 Pro simulator (85495F80-A293-47AC-8F2C-CE9294F2A266) with Expo Go 54.0.7; Xcode 27's app is Device Hub.

## Open work and limits

- Google/Apple developer configuration and real provider authentication are deferred. No client IDs were configured in checked project env files.
- Production services, Gmail delivery, live Neon/R2/Gemini behavior, native biometrics, release signing, and store submission require their own verification. UI work does not establish store approval.
- Reanimated layout entering animations previously crashed on web unmount. Use shared-value motion as in `src/ui/motion.tsx`.
- Fixed the iOS new-password yellow cover by opting out of automatic generation **from the first render** in shared `Field` when `secureToggle` uses `newPassword`/`new-password`. Changing hints only after revealing was insufficient. iOS sign-up/reset/change-password fields use `textContentType="none"` and `autoComplete="off"`; saved-login autofill and Android/web hints remain intact. Native checks now verify full masked registration typing, revealed editing and repeated visibility toggles without text loss. Automatic generation can be revisited after native platform integration is verified.
- Keep `.brain/` operational, `MedRec/` for long-form product/research, and the existing `_BRAIN/` ecosystem system. Do not introduce another knowledge system.
