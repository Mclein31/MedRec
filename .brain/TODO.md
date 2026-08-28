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
- [ ] Connect React Native mobile client (`lib/api.ts`) to live Express server endpoints.
- [ ] Complete UI screen in `app/record/add.tsx` for uploading prescriptions and lab result images.
- [ ] Wire up OpenAI summarization service in `backend/src/services/aiService.js` to process record text.

## 🟡 Medium Priority
- [ ] Implement camera QR scanning library (`expo-camera` or `expo-barcode-scanner`) in `app/(tabs)/scan.tsx`.
- [ ] Add Biometric Authentication (FaceID / Fingerprint) via `expo-local-authentication` on app launch.
- [ ] Add unit and integration tests for `shareController.js` token expiration boundaries.

## 🟢 Low Priority
- [ ] Implement PDF export of consolidated patient medical history for physical printing.
- [ ] Dark/Light mode theme parity with system settings across mobile UI components.

## 💡 Future Ideas
- [ ] On-device local LLM summarization using llama.rn for offline medical analysis.
- [ ] Integration with Apple HealthKit and Google Health Connect.
