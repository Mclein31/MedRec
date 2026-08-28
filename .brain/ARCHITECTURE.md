---
type: architecture
title: MedRecord_App Architecture
project: MedRecord_App
tags:
  - architecture
  - healthcare
  - mobile
  - react-native
  - express
  - postgresql
last_updated: 2026-08-28
---

# 🏛️ MedRecord_App (MedRec) — Architecture

## 📐 System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Mobile App                         │
│                    (Expo Router SDK 52 / TypeScript)                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Patient View:                    │ Doctor View:                        │
│ - Dashboard & Medical Records    │ - QR Code Scanner                   │
│ - Record Upload & AI Summary     │ - Read-Only Shared Patient History  │
│ - Generate Sharing QR Token      │ - Temporary Access Session          │
└──────────────────────────────────┴─────────────────────────────────────┘
                                   │
                                   │ HTTPS / REST (JWT Bearer Token)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Node.js / Express 5 API Server                     │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ /api/auth         │ /api/records      │ /api/share      │ /api/ai      │
│ - Register/Login  │ - Records CRUD    │ - Create QR     │ - Summarize  │
│ - JWT Issuance    │ - Category Filter │ - Verify Token  │ - Explain    │
├───────────────────┴───────────────────┴─────────────────┴──────────────┤
│ Security Middleware: Helmet, CORS, Rate Limit, Auth Validator          │
└───────────────────┬─────────────────────────────────────┬──────────────┘
                    │                                     │
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │    PostgreSQL Database    │         │      OpenAI API Cloud     │
      │  - users                  │         │  - gpt-4o Summarization   │
      │  - medical_records        │         │  - Medical Terms Decoder  │
      │  - shared_access_tokens   │         └───────────────────────────┘
      │  - access_audit_logs      │
      └───────────────────────────┘
```

---

## 🗄️ Database Schema (`backend/src/migrations/schema.sql`)
1. `users`: Stores patient and doctor credentials, hashed passwords (`bcryptjs`), and user roles.
2. `medical_records`: Stores individual clinical records (title, category: `diagnosis`, `prescription`, `lab_result`, `consultation`, record date, attachments, notes, AI summary).
3. `shared_access_tokens`: Stores cryptographically generated access tokens, associated `user_id`, expiration timestamps, and revocation flags.
4. `access_logs`: Audit trail logging doctor access events, IP addresses, and timestamps for HIPAA/data privacy compliance.

---

## 🔐 Security & Access Control Flow
1. **Patient Sharing**: Patient selects records to share $ightarrow$ Backend generates a high-entropy random token with a custom TTL (e.g. 1 hour) $ightarrow$ Rendered as a QR code in `mobile/app/(tabs)/share.tsx`.
2. **Doctor Verification**: Doctor scans QR code $ightarrow$ Backend validates token expiration and active status $ightarrow$ Grants scoped read-only access to authorized records.
3. **Audit Trail**: Every read operation logs the token ID and access timestamp into `access_logs`.
