---
type: operational-audit
project: MedRecord_App
last_updated: 2026-10-14
---

# Sign-in connectivity and backend audit — 2026-10-14

## Reproduced cause

The mobile environment pinned the API to `http://192.168.1.25:4000/api`, while the laptop's current Wi-Fi address was `192.168.1.9`. The old address failed with `EHOSTUNREACH`. The running API and PostgreSQL were healthy; the same login request reached the API through localhost/current LAN and returned the expected authentication response.

The local mobile override is now blank. Development resolves API port 4000 from Metro's current host, or the browser host on web, with Android emulator loopback handling. Explicit separate-backend/deployment URLs still take precedence. Metro was restarted with a cleared cache; its current LAN manifest and compiled bundle were checked, and the stale API address was absent.

## Backend fixes

- Absolute backend environment paths prevent launch-directory-dependent database/JWT settings; test configuration remains separate.
- Signing and verification share a required private JWT secret; the publicly known fallback was removed. Local tokens use HS256 and require a positive integer token version, so logout/password revocation cannot be bypassed by omitting that claim.
- Database connection and query/statement waits are bounded at 5 and 10 seconds by default. Connection failure, pool exhaustion, and query timeout return a retryable 503 without exposing credentials.
- `/ready` and `/api/ready` execute `SELECT 1`; liveness alone is no longer used as proof of database availability.
- Auth validates string inputs, normalized email, name/email limits, and bcrypt registration byte limits. Existing password-login compatibility is retained.
- Google verification requires configured audiences. Missing Google configuration returns 503 instead of accepting an audience-unspecified token.
- Recovery rate limiting covers both route prefixes.
- `cd backend && npm run check:local-auth` checks the running server using a randomly named disposable account and deletes only that exact generated account afterward. Tokens/passwords are not printed.

## Verification

- Running current LAN/local API: readiness 200; registration 201; login 200; authenticated identity/profile/records/shares/notifications 200; logout 204; revoked session 401; fresh login 200. Disposable audit accounts were removed.
- Backend: 12 suites, 143 tests pass. Production dependency audit: zero findings.
- Mobile: 27 test entries pass; TypeScript and focused lint pass. Four new URL-resolution tests cover Wi-Fi address changes, browser/emulator behavior, explicit backend precedence, and metadata fallbacks.
- Actual backend environment loading from project root verified; existing JWT secret and account credentials were preserved. Test and development databases are distinct.

## Remaining scope and limits

The user's own credentials were not used or changed; successful authentication was verified with disposable audit accounts. Physical-device UI sign-in still needs user/device confirmation because computer-use access is unavailable. Google client IDs and real password recovery remain unconfigured/unimplemented and report unavailable errors. Production reverse-proxy trust and browser-origin configuration still need deployment-specific review. This audit did not upload patient data or verify live R2/OpenAI service execution.

## Follow-up: signup retry (October 14, 8:17 PM)

A read-only query found one local account for the screenshot's exact email, created at 8:17:41 PM with no records. Thus the email conflict was real, consistent with account creation succeeding before the client completed its session/navigation. The initial client failure itself was not observed, and no storage/navigation cause is claimed.

The API now codes duplicate-email conflicts, including insertion races. Mobile retries recover only through successful password login; incorrect passwords cannot take over or overwrite the existing account. Double taps are synchronously guarded, and failed session persistence explains that account creation already completed. The live diagnostic checks duplicate signup, then password login to the same unchanged identity. All 144 backend tests and 39 mobile entries pass; TypeScript/focused lint pass. The temporary live audit account was removed. User credentials and existing account data remain unchanged.
