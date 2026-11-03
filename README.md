# MedRec

Personal health records, together. MedRec keeps documents organized, explains saved medical terms with Remy, and shares selected records through temporary QR access.

The active application lives entirely in `apps/`:

- [`apps/mobile`](apps/mobile): Expo SDK 54, React Native, Expo Router, and the warm ivory/aubergine Remy interface. Runs on iOS, Android, and web.
- [`apps/api`](apps/api): Hono on Cloudflare Workers, Neon Postgres with forced row-level security, private R2 files, Gemini document reading, and Gmail email codes.

The legacy root `mobile/` and `backend/` applications were removed on November 3, 2026. Use the current paths below.

## Run locally

Follow [`apps/README.md`](apps/README.md) for database creation and API configuration. Then run these in separate terminals:

```sh
cd apps/api
npm run dev
```

```sh
cd apps/mobile
npm start
```

The API uses port 8787. With `EXPO_PUBLIC_API_URL` unset, the app follows Metro’s host. Set an explicit API URL for a separate deployment. Configuration for production lives in the ignored `apps/.env`; the committed template is `apps/.env.example`.

Expo Go must match SDK 54. Xcode 27 uses Device Hub; the mobile install/start scripts include a guarded launcher compatibility patch. App lock and other device-specific behavior require native device verification.

## Verify

```sh
npm test --prefix apps/mobile
npm run typecheck --prefix apps/mobile
npm test --prefix apps/api
npm run typecheck --prefix apps/api
```

The API tests create a separate local Postgres test database. See [`apps/README.md`](apps/README.md) for deployment and environment details.

## First-use experience

The Remy-led introduction shows the app’s actual record rows, Ask Remy messages, sharing receipt, and Medical ID card with clearly labeled example data. It includes interruptible swipe transitions, Back and Next actions, a pause control, and reduced-motion support. There is no progress bar or Skip intro shortcut.

Sign-in uses standard 48-point fields and a compact Remy welcome. Google and Apple sign-in are deliberately disabled UI previews; email/password and the existing email-code flow remain the supported authentication path.

## Project knowledge

- `.brain/PROJECT_CONTEXT.md`: current state and operating context.
- `.brain/ARCHITECTURE.md`: current architecture.
- `.brain/DECISIONS.md`: decisions and historical context.
- `MedRec/`: product and research vault.
- `design/medrec-uiux-handoff/`: design reference and Remy assets.

Remy explains saved terms and helps find records; it does not provide medical advice. Provider activation, release signing, production services, and store submission remain separate work.
