---
type: project-brain
title: MedRecord_App Project Context
project: MedRecord_App
status: active
tags:
  - project
  - healthcare
  - mobile
  - react-native
  - expo
  - express
  - postgresql
  - ai
last_updated: 2026-09-01
---

# 🏥 MedRecord_App (MedRec) — Project Context

## 📌 Overview & Purpose
**MedRec** is a full-stack personal medical health records management and clinical sharing platform. It empowers patients to securely store, organize, categorize, and temporarily share their longitudinal health data (doctor visits, diagnoses, lab results, prescriptions, and medications) with healthcare providers via time-expiring QR codes and cryptographically signed access tokens. The application integrates AI features powered by OpenAI to summarize dense clinical notes, explain complex medical jargon in plain language, and automatically categorize health documents.

---

## 🎯 Current Objectives & Status
- **Status**: `In Active Development`
- **Current Milestone**: Pre-production security auditing, vulnerability remediation, and release hardening are COMPLETE. All critical and high-severity security vectors (authentication DoS, reset token leakage, iOS camera purpose strings, share ownership validation, user-keyed AI rate limiting, strict database TLS, and App Store compliance) have been resolved and verified with 35 passing automated backend security tests.
- **Next Planned Phase**: Backend Implementation & Cloud Infrastructure Deployment (has NOT started yet).
- **Obsidian Research Vault**: A dedicated 18-module Obsidian knowledge vault is integrated in `MedRecord_App/MedRec/` containing deep research on healthcare data silos, regulatory compliance, doctor/patient user journeys, and architecture specifications.

---

## 💻 Tech Stack & Dependencies

### Mobile Frontend (`mobile/`)
- **Framework**: React Native (Expo SDK 52, Expo Router v4 file-based routing)
- **Language**: TypeScript (`expo-env.d.ts`)
- **Navigation**: Expo Router Tabs (`(tabs)`), Stack Navigation (`_layout.tsx`)
- **Icons & UI**: Expo Vector Icons (`@expo/vector-icons`), custom themed components (`themed-view.tsx`, `themed-text.tsx`), responsive scaling hooks (`useResponsive.ts`)
- **Typography**: Google Fonts (Lexend Deca)

### Backend API (`backend/`)
- **Runtime & Framework**: Node.js, Express.js (v5.x)
- **Database**: PostgreSQL with native client connection pooling (`pg`)
- **Authentication & Security**: JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`), HTTP header hardening (`helmet`), CORS whitelisting (`cors`), request throttling (`express-rate-limit`)
- **AI Integration**: OpenAI Node SDK (`openai ^6.44.0`) utilizing `gpt-4o` for clinical record summarization and taxonomy tagging
- **Testing**: Jest (`jest ^30.4.2`), Supertest (`supertest ^7.2.2`)

---

## 📂 Key Files & Structure
- `backend/src/server.js` & `backend/src/app.js`: Express application initialization and middleware pipeline.
- `backend/src/routes/`:
  - `authRoutes.js`: User registration, login, and JWT issuance.
  - `profileRoutes.js`: User demographic profile, emergency Medical ID, password updates, and account deletion.
  - `recordRoutes.js`: Patient medical records CRUD (visits, diagnoses, lab results, prescriptions).
  - `shareRoutes.js`: Time-limited sharing token generation, QR code payload generation, and doctor read-only access verification.
  - `aiRoutes.js`: OpenAI-powered clinical summarization and medical terminology simplification.
  - `notificationRoutes.js`: Authenticated in-app notification queries, read updates, and deletions.
- `backend/src/models/`: Database access objects (`userModel.js`, `profileModel.js`, `recordModel.js`, `shareModel.js`, `tokenModel.js`, `notificationModel.js`).
- `backend/src/migrations/schema.sql`: PostgreSQL schema definitions with Foreign Keys and indexes.
- `mobile/app/`:
  - `_layout.tsx`: Root stack navigation and theme provider.
  - `login.tsx` & `register.tsx`: Authentication screen interfaces.
  - `(tabs)/index.tsx`: Patient records dashboard, dynamic greeting, and health timeline.
  - `(tabs)/profile.tsx`: Comprehensive patient demographic and Emergency Medical ID profile screen.
  - `(tabs)/share.tsx`: QR code generator for clinical record sharing.
  - `(tabs)/scan.tsx`: Doctor QR code scanner interface.
  - `record/[id].tsx`: Record detail view with modular cards, compact 2-column metadata, clinical notes, and AI insights.
  - `record/add.tsx`: New record entry form with integrated document camera, gallery import, and attachment card.
- `mobile/components/`:
  - `navigation/TabletPersistentSidebar.tsx`: Persistent left navigation sidebar for tablet landscape mode with quick actions and formatted AI modal.
  - `camera/DocumentCamera.tsx`: Full-screen document camera with torch, haptic shutter, and permissions recovery.
  - `camera/DocumentPreview.tsx`: Full-image quality and legibility review screen.
  - `camera/ViewfinderOverlay.tsx`: 3:4 document aspect ratio framing guide with teal corner accents.
  - `camera/CameraControls.tsx`: Shutter button, torch toggle, and photo library picker trigger.
  - `camera/AttachedDocumentCard.tsx`: Interactive document thumbnail card for the add record form.
  - `ProfileEditModal.tsx`: Modular edit modal for patient demographics and clinical baseline.
  - `ChangePasswordModal.tsx`: Authenticated password change modal.
  - `EmergencyIdModal.tsx`: High-contrast first responder Emergency Medical ID with offline QR code.
  - `menu/SideMenuModal.tsx`: Left-slide animated drawer menu with MedRec app logo and dual-coded navigation.
  - `menu/SideMenuItem.tsx`: Interactive row component with active route highlights.
  - `notifications/NotificationCenterModal.tsx`: In-app notification center modal with drag handle affordance and filter tabs.
  - `notifications/NotificationCard.tsx`: Actionable notification item card with category badges and deep links.
- `mobile/context/`: Global React state providers (`AuthContext.tsx`, `NotificationContext.tsx`).
- `mobile/lib/api.ts`: Centralized fetch client communicating with backend endpoints.
- `MedRec/`: 18-folder Obsidian research vault (`00 - Dashboard`, `01 - Vision`, `02 - Problem Space`, `08 - Technical Architecture`, etc.).

---

## 🔗 Related Projects & Links
- 🌐 [[Personal Website]] — Showcases *MedRec* in the 3D coverflow portfolio gallery.
- 🗺️ [[_BRAIN/PROJECT_INDEX|Master Project Index]]
- 📊 [[_BRAIN/CROSS_PROJECT_MAP|Cross-Project Map]]
- 🐙 **Repository**: [github.com/Mclein31/MedRec](https://github.com/Mclein31/MedRec.git)

---

## ⚠️ Known Limitations
- Backend currently operates on local PostgreSQL connection strings; production cloud database hosting is being configured.
