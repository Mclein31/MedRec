---
type: todo-list
title: MedRecord_App Tasks & Backlog
project: MedRecord_App
tags:
  - todo
  - backlog
last_updated: 2026-08-28
---

# 📋 MedRecord_App (MedRec) — TODO & Task Tracker

## 🔴 High Priority
- [x] Connect React Native mobile client (`lib/api.ts`) to live Express server endpoints for Profile and User data.
- [x] Implement complete Profile Tab (`(tabs)/profile.tsx`) with Emergency Medical ID, Demographics, and Data Export.
- [x] Complete UI screen in `app/record/add.tsx` for capturing/uploading prescriptions and lab result images (Document Camera, 3:4 Viewfinder, Quality Review, and In-Form Attachment Card).
- [x] Implement functional app drawer/menu navigation (`SideMenuModal`) with text-only links and MedRec logo branding.
- [x] Implement in-app notification center (`NotificationCenterModal`) and dynamic bell trigger with backend persistence and drag affordance.
- [ ] Wire up OpenAI summarization service in `backend/src/services/aiService.js` to process record text.

## 🟡 Medium Priority
- [ ] Implement camera QR scanning library (`expo-camera` or `expo-barcode-scanner`) in `app/(tabs)/scan.tsx`.
- [ ] Add Biometric Authentication (FaceID / Fingerprint) enforcement via `expo-local-authentication` on app launch / resumption.
- [x] Add unit and integration tests for Profile API endpoints (`backend/tests/profile.test.js`).
- [ ] Add unit and integration tests for `shareController.js` token expiration boundaries.

## 🟢 Low Priority
- [x] Implement JSON export of consolidated patient medical history and profile data.
- [ ] Implement PDF export of consolidated patient medical history for physical printing.
- [ ] Dark/Light mode theme parity with system settings across mobile UI components.

## 💡 Future Ideas
- [ ] Multi-patient / dependent profile switcher for caregivers.
- [ ] Lock screen Emergency Medical ID widget for iOS (WidgetKit).
- [ ] On-device local LLM summarization using llama.rn for offline medical analysis.
- [ ] Integration with Apple HealthKit and Google Health Connect.
