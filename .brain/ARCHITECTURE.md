---
type: architecture
title: MedRecord_App Architecture
project: MedRecord_App
last_updated: 2026-11-04
---

# MedRec architecture

The active implementation is `apps/mobile` + `apps/api`. The root legacy `mobile/` and `backend/` implementations were deleted at the user's request on 2026-11-03. Historical architecture is available in Git and DECISIONS.md.

## Client

`apps/mobile` uses Expo SDK 54, React Native 0.81.5, Expo Router, SecureStore, and Reanimated shared-value motion. `app/_layout.tsx` owns fonts, Launch, first-use/session routing, and app lock. `src/lib/http.ts` owns API discovery, typed errors, and single-flight session refresh; `src/auth.tsx` owns the session state.

- `src/screens/Onboarding.tsx`: five-scene Remy introduction. Gesture-tracked shared position, spring settling, button alternatives, foreground/focus/motion preference handling. Captions and actions remain outside the preview scroll area. No progress bar or Skip action.
- `src/screens/OnboardingParts.tsx`: production components filled with labeled example data. Web preview controls are inert; native previews hide their controls from accessibility and cannot navigate.
- `src/ui/LaunchReady.ts`: readiness context prevents consuming first-use entrances behind the launch overlay.
- `src/screens/Launch.tsx` and `src/ui/launchFlow.ts`: distinct first-use and returning/session arrival, readiness-driven handoff after a short finite intro, foreground/layout/native-splash gating, reduced-motion fallback and single completion guard. Navigator tracks the acknowledged signed-in user, resets it on logout and plays the session arrival only after authentication. Keep the native navigator outside an accessibility-hidden wrapper; the transient overlay's modal flag caused native controls to remain hidden after exit and was removed.
- `plugins/withLaunchBackground.cjs`: image-free native iOS launch background matching the animated first frame, applied after Expo's image-removal action by registering before its splash plugin/provider. Native splash review uses the signed Release simulator app, because Expo Go renders its own app-icon loader.
- `src/ui/RecordRow.tsx`, `src/remy/Messages.tsx`, `src/ui/ShareCard.tsx`, `src/ui/MedicalIdCard.tsx`: shared real UI used in the tour and normal app flows.
- `src/ui/AuthFrame.tsx`: responsive, scrollable authentication layout; `src/ui/form.tsx` uses 48-point labeled inputs. Sign-in has a compact Remy greeting.
- Shared `Field` suppresses iOS automatic generation for secure new-password fields from initial mount, preventing UIKit's stuck yellow cover. Existing-login autofill and Android/web hints are retained; secure fields default to no autocorrect/spellcheck.
- `src/ui/Remy.tsx` and `remyActing.ts`: clipped 3×2 sprite atlases in `assets/remy/acting`, shared-value frame selection, sparse blinks/glances/gestures, reversible password cover and peek states. `remyGeometry.ts` normalizes visible alpha height and foot position across original art and all frames. Form focus and visibility callbacks supply attention without passing input contents. Auth route focus/background stop decorative acting; reduced motion uses static expressions. `systemMotion.ts` shares a live OS Reduce Motion subscription with async race protection.
- `src/ui/SocialSignIn.tsx`: disabled Google/Apple custom previews with identical metrics and centered logo/text groups. No provider authentication is activated.
- `src/ui/motion.tsx`: shared motion primitives: `ease` curves (from `theme.curves`), `colorTransition` (Reanimated CSS colour transitions), `Rise`, and `useSlidingMarker` for tab and filter indicators. `app/_layout.tsx` defines push/sheet/cover route options, all of which fade under calm motion (DD-50).
- `src/theme.ts`: semantic warm-folio light/dark colors and bundled typography; `src/prefs.ts` combines system/app/scoped reduced-motion preferences.
- `src/remy/answer.ts`: own-record search, saved AI definitions, labeled glossary, fixed app help. It does not generate personal medical advice.

## API and data

`apps/api` is a Hono Cloudflare Worker. `src/app.ts` applies configuration checks, services, CORS, no-store, uniform errors, and hourly cleanup.

- `lib/db.ts`: Neon HTTP, one statement/transaction with the RLS context set. `lib/localDb.ts` supplies development-only local Postgres access.
- `lib/auth.ts`: JWT, open session, token version. `lib/otp.ts` owns bounded one-time email codes; `lib/email.ts`/`smtp.ts` send them through Gmail.
- `lib/security.ts`: rate limits, sharing tokens, signed file paths. `lib/records.ts`: keyset pagination. `lib/shares.ts`: scoped, expiring, revocable access.
- `lib/gemini.ts`: document reading with structured output and guardrails.
- Routes: auth, profile/Medical ID/avatar, records/drafts/scan/pages, shares, vault/activity/export, public `/s/:token`, `/e/:slug`, signed files. Public views use hono/jsx.
- `migrations/001_init.sql`: users, profiles, records/files, sharing/activity, sessions/devices, OTP and rate limits. `002_rls.sql`: forced RLS and the non-bypass medrec_app role.
- Documents remain in private R2. The Worker serves HMAC-signed file paths; URLs expire and shared-file access cannot outlive its share.

## Configuration and verification

Production settings live in ignored `apps/.env`; the deployment/migration scripts distribute each value only where needed. Local Worker settings live in `.dev.vars`. The mobile app discovers port 8787 on Metro's host unless an explicit API URL is configured.

API integration tests create a fresh local Postgres test database and run as medrec_test, a member of the unprivileged runtime role. Mobile checks include TypeScript and Node tests; native visual/interaction checks use Xcode's simulator. Real-device biometrics and provider sign-in require independent verification.
