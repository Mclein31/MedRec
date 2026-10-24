# MedRec v2

A rebuild of MedRec from scratch:

- `api/`: a Cloudflare Worker (Hono) on Neon Postgres, with row-level security, Cloudflare R2 for files and Google Gemini for reading documents. It also serves the doctor share page (`/s/:token`) and the public Medical ID (`/e/:slug`).
- `mobile/`: an Expo SDK 54 app for iOS, Android and web.

The original `backend/` and `mobile/` folders are still there, untouched, until v2 replaces them.

## Sign-in

Signing in takes a password plus a 6-digit code emailed through Gmail. This works like AdvanCare: Gmail SMTP with an App Password, sent over `cloudflare:sockets`.

- A code expires after 10 minutes and allows 5 tries.
- Only the newest code works.
- You can request a new code after 60 seconds, up to 5 codes per sign-in.
- Choosing "Trust this device for 30 days" skips the code on that device only.
- Resetting or changing your password signs out every device and forgets trusted devices.

## Run locally

You need Node 22+ and a local PostgreSQL.

```sh
# 1. Database (owner connection creates tables, RLS and the medrec_app role)
createdb medrec_v2_dev
cd apps/api && npm install
MIGRATION_DATABASE_URL=postgresql://localhost/medrec_v2_dev APP_DB_PASSWORD=$(openssl rand -hex 16) npm run migrate
#    put that same password in DATABASE_URL below

# 2. Secrets for wrangler dev
cp .dev.vars.example .dev.vars
#    DATABASE_URL=postgresql://medrec_app:<password>@localhost:5432/medrec_v2_dev
#    JWT_SECRET / FILE_SIGNING_SECRET: openssl rand -hex 32
#    GEMINI_API_KEY: from https://aistudio.google.com/apikey (optional; scanning returns 503 without it)
#    SMTP_USER / SMTP_PASSWORD: leave empty and sign-in codes print in this terminal

npm run dev                      # API on http://localhost:8787 (R2 is simulated locally)

# 3. App
cd ../mobile && npm install
npm start                        # i = iOS simulator, a = Android, w = web
```

While developing, the app finds the API on port 8787 of the machine Metro runs on, so a phone on the same Wi-Fi just works. `npm run start:prod` points it at the deployed API from `apps/.env` instead.

## Tests

```sh
cd apps/api && npm test          # 37 integration tests against a fresh local Postgres, with RLS enforced
cd apps/mobile && npm test && npm run typecheck
```

## Deploy

All production settings live in **one file, `apps/.env`**. It is gitignored; `apps/.env.example` is the committed template. The scripts check it before sending anything, and each value goes only where it belongs:

| Values | Used by |
|---|---|
| `DATABASE_URL`, `JWT_SECRET`, `FILE_SIGNING_SECRET`, `GEMINI_API_KEY`, `SMTP_USER`, `SMTP_PASSWORD` | Worker secrets, via `npm run deploy:prod` |
| `PUBLIC_URL`, `ALLOWED_ORIGINS` | Worker variables, via `npm run deploy:prod` |
| `MIGRATION_DATABASE_URL`, `APP_DB_PASSWORD` | `npm run migrate:prod` only; never uploaded |
| `EXPO_PUBLIC_API_URL` | the app, via `npm run start:prod` / `export:prod` |

1. Create the services: a Neon project, an R2 bucket (`npx wrangler r2 bucket create medrec-v2-vault`; already created), a Gmail App Password, and a Gemini key. Fill in `apps/.env`.
2. From `apps/api`, run `npm run migrate:prod`. This creates the tables and row-level security, and sets the `medrec_app` password.
3. From `apps/api`, run `npm run deploy:prod`. On the very first deploy you won't know the Worker URL yet: put any `https://` placeholder in `PUBLIC_URL`, deploy, copy the real URL wrangler prints into `PUBLIC_URL` and `EXPO_PUBLIC_API_URL`, and deploy again.
4. Check `<PUBLIC_URL>/api/ready`, then run the app against production from `apps/mobile` with `npm run start:prod`.

An hourly cron job removes pages that were uploaded but never saved (after 24 hours), along with expired codes, sessions and rate-limit windows.
