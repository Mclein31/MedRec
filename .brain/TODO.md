---
type: todo-list
title: MedRecord_App Tasks & Backlog
project: MedRecord_App
tags:
  - todo
  - backlog
last_updated: 2026-09-01
---

# 📋 MedRecord_App (MedRec) — TODO & Task Tracker

## 🔴 High Priority
- [x] Connect React Native mobile client (`lib/api.ts`) to live Express server endpoints for Profile and User data.
- [x] Implement complete Profile Tab (`(tabs)/profile.tsx`) with Inset Grouped layout, Emergency Medical ID, Demographics, and Data Export.
- [x] Implement interactive Profile Photo upload (`expo-image-picker`) and PostgreSQL `avatar_url` persistence.
- [x] Complete UI screen in `app/record/add.tsx` for capturing/uploading prescriptions and lab result images (Document Camera, 3:4 Viewfinder, Quality Review, and In-Form Attachment Card).
- [x] Implement full backend and mobile attachment pipeline (`medical_records.attachment_url` in PostgreSQL schema, API endpoints, and display in `record/[id].tsx`).
- [x] Implement app-wide responsive UI across compact phones, standard phones, and tablets with stepped typography and tablet 2-column bento grids.
- [x] Implement approved Tablet & iPad UI redesign with persistent left sidebar on landscape, master-detail workspaces on dashboard and doctor scanner, centered single-column intake studio, centered single-column living QR sharing hub, centered single-column record details, and 100% phone UI isolation.
- [x] Implement functional app drawer/menu navigation (`SideMenuModal`) with dual-coded iconography and MedRec logo branding.
- [x] Implement in-app notification center (`NotificationCenterModal`) and dynamic bell trigger with backend persistence and drag affordance.
- [x] Implement AI subsystem guardrails, delimiter isolation (`<patient_provided_data>`), 2,000-char input ceiling, token completion limits, and user-keyed rate limiting in `backend/src/services/aiService.js` and `routes/aiRoutes.js`.
- [x] Complete pre-production security hardening & vulnerability remediation (SEC-R01 to SEC-R10) with 35 passing automated negative security tests.
- [ ] **NEXT PHASE (Not Started)**: Full Backend Implementation & Production Cloud Database Deployment (AWS/Render/Neon PostgreSQL, Cloud Storage presigned URLs for attachments).

## 🟡 Medium Priority
- [x] Implement camera QR scanning library (`expo-camera`) in `app/(tabs)/scan.tsx` with clamped viewfinder and tablet sheet presentation.
- [x] Declare `expo-camera` and `cameraPermission` in `mobile/app.json` for Apple App Store ingestion compliance (ITMS-90683).
- [x] Fix profile partial upsert isolation to prevent demographic edits from overwriting medical ID baselines.
- [x] Add physical metrics persistence (`height` and `weight`) in `user_profiles` schema and controllers.
- [x] Optimize token revocation checks to remove per-request database write locks.
- [x] Implement session invalidation via `users.token_version` on password update and cryptographic single-use reset tokens.
- [x] Implement atomic SQL record ownership verification (`recordModel.verifyOwnership`) in share creation to eliminate pagination false IDOR errors.
- [x] Apply user-keyed and IP-keyed rate limiting across authentication, password reset, AI, and sharing endpoints.
- [ ] Add Biometric Authentication (FaceID / Fingerprint) enforcement via `expo-local-authentication` on app launch / resumption.
- [x] Add automated test suites for Profile API (`profile.test.js`), Records (`record.test.js`), Notifications (`notification.test.js`), and Comprehensive Security (`security.test.js`).

## 🟢 Low Priority
- [x] Implement JSON export of consolidated patient medical history and profile data.
- [ ] Implement PDF export of consolidated patient medical history for physical printing.
- [ ] Dark/Light mode theme parity with system settings across mobile UI components.

## 💡 Future Ideas
- [ ] Multi-patient / dependent profile switcher for caregivers.
- [ ] Lock screen Emergency Medical ID widget for iOS (WidgetKit).
- [ ] On-device local LLM summarization using llama.rn for offline medical analysis.
- [ ] Integration with Apple HealthKit and Google Health Connect.
