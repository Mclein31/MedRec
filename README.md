# MedRec (Working Title)

A mobile application that allows users to securely store, manage, and share their personal medical records in one centralized platform.

The system also includes AI features that help users organize, summarize, and understand their health information.

---

## 📱 Overview

MedRec is designed to help patients keep all their medical information in one place. Users can store their medical history, including doctor visits, diagnoses, lab results, prescriptions, medications, and appointments.

When visiting a new doctor, users can securely share their records using a QR code or access token. This allows healthcare providers to quickly view relevant medical history and make better-informed decisions.

---

## 🎯 Objectives

- Provide a centralized digital storage for medical records
- Improve accessibility of patient health information
- Reduce repetition of medical history during consultations
- Enable secure sharing of records between patients and doctors
- Use AI to simplify and organize medical data

---

## ✨ Features

### 👤 User System
- User registration and login
- Secure authentication using JWT
- Basic user profile management

### 📋 Medical Records
- Store doctor visits, diagnoses, lab results, prescriptions, and medications
- Organize records by category
- Search and filter records
- View detailed medical history

### 🔐 Secure Sharing
- Generate QR codes or secure access tokens
- Temporary access for doctors
- Read-only access mode for shared records
- Token expiration and revocation

### 🤖 AI Features
- Medical record summarization
- Automatic record categorization
- Simplified explanations of medical terms
- Clear and readable health overview for patients and doctors

---

## 🧠 AI Capabilities

The AI system processes user medical data and provides:

- **Health Summary:** A simple overview of the patient’s medical history
- **Record Organization:** Automatically classifies medical data into categories
- **Text Simplification:** Explains medical terms in plain language

> Note: The AI does not provide medical advice. It only summarizes and explains existing data.

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- Flutter / React Native

### Backend
- Node.js (Express) / FastAPI
- REST API architecture

### Database
- MongoDB / PostgreSQL

### Authentication
- JWT (JSON Web Tokens)

### AI Integration
- OpenAI API / Claude API

---

## 📊 System Flow

1. User registers and logs in
2. User adds medical records
3. Records are stored securely in the database
4. AI processes records for summary and organization
5. User generates QR code for sharing
6. Doctor scans QR code to view patient records

---

## 🔒 Security Features

- Password hashing
- JWT authentication
- Token-based sharing system
- Expiring access links
- Role-based access (user vs doctor view)

---

## 🚀 Future Improvements

- Integration with hospital systems
- Appointment booking system
- Prescription reminders
- Voice input for medical notes
- Offline mode support
- Multi-language support

---

## 👨‍💻 Developer Notes

This project is designed as a **capstone project for Computer Science students**. It focuses on full-stack development, secure data handling, and practical AI integration.

The goal is to build a working prototype that demonstrates real-world healthcare data management concepts.

---

## 📌 Disclaimer

This application is for educational purposes only and is not intended for real medical diagnosis or treatment.


## UI polish and local verification (October 2026)

The current app uses React Native/Expo SDK 54, Expo Router, an Express API, PostgreSQL, and private Cloudflare R2 storage. Onboarding includes sliding pages, staged previews, pulse/scan animations, a pause control, and Reduce Motion support. Profile offers native app lock, JSON file export, and printable PDF history. Exports contain profile/record text and attachment presence; attachment files are not embedded.

From `mobile/`, run `npm test`, `npm run typecheck`, and `npm run lint`. From `backend/`, run `npm test`. Native biometric/PDF modules require a development build; Expo Go is insufficient for Face ID verification. Dependencies are linked by `pod install` in the existing iOS project. With Xcode 27, local verification of older pods requires adding `IPHONEOS_DEPLOYMENT_TARGET=15.1` to `xcodebuild`; the simulator build passed with this override.

Xcode 27 replaces Simulator.app with Device Hub. SDK 54's CLI still expects Simulator.app, so `mobile/scripts/patchExpoSimulator.cjs` backports [Expo's Device Hub support](https://github.com/expo/expo/pull/46757). It runs on install and before `npm start` / `npm run ios`, and validates the locked CLI version before modifying dependencies. If the launcher reports "Can't determine id of Simulator app" with Xcode already selected correctly, restart with `cd mobile && npm start`, then press `i`. Review/remove this workaround when upgrading Expo CLI. Automated launcher checks and the installed Xcode prerequisite pass; interactive launch remains pending.

"No development build (com.mclein.medrec) ... installed" means the selected simulator needs the native development client. `npm start` only starts Metro. Build/install with `npm run ios` (see the Xcode 27 deployment target override above), or install an already-built simulator `.app` with `xcrun simctl install <device-udid> <app-path>`, then press `i` in Metro. The local iPhone 14 Plus now has the verified Debug build installed; other or erased simulators need their own installation.

Password recovery currently reports unavailable until real token/email delivery is implemented. Missing R2 upload configuration returns 503 outside tests. AI summaries disclose their bounded latest-25-record scope. Production deployment, native Google sign-in setup, full theme parity, remaining SDK/tooling advisories, and visual/physical-device QA remain tracked in `.brain/TODO.md`.


## Local sign-in troubleshooting

Leave `EXPO_PUBLIC_API_URL=` blank in `mobile/.env` when the backend runs beside Metro on port 4000. The app follows the current Wi-Fi host automatically; web uses the browser host and Android emulator loopback is mapped correctly. Set an explicit URL only for a separate backend/deployment. Restart Metro after changing environment values.

`GET /api/ready` checks database availability. From `backend/`, `npm run check:local-auth` checks the running local API with a disposable account and removes it afterward. Backend environment paths are independent of launch directory; JWT_SECRET must be a private random value of at least 32 characters. See `.brain/AUTH_AUDIT.md` for the October sign-in audit and its verification limits.
