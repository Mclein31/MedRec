---
type: notes
title: MedRecord_App Reference Notes
project: MedRecord_App
tags:
  - notes
  - reference
last_updated: 2026-08-28
---

# 📝 MedRecord_App (MedRec) — Technical Notes

## 📂 MedRec Obsidian Vault Integration
The `MedRecord_App/MedRec/` folder is an existing Obsidian vault with detailed notes across:
- `01 - Vision & Goals/`
- `02 - Problem Space/` (Data silos, lost records, patient ownership)
- `03 - Research/` & `04 - Users/` (Patient and doctor workflows)
- `08 - Technical Architecture/` & `09 - Database/`
- `10 - Security & Privacy/` (Threat models, token revocation, encryption)

## 🔑 Environment Variables Required (`backend/.env`)
- `PORT`: Server port (default `5000`)
- `DATABASE_URL`: PostgreSQL connection URI (`postgresql://user:pass@localhost:5432/medrec`)
- `JWT_SECRET`: High-entropy string for signing user session tokens
- `OPENAI_API_KEY`: API key for medical summarization and explanations

## 📷 Document Camera & Gallery Ingestion
- `expo-camera` (`CameraView`) is configured with `facing="back"`, `enableTorch`, and unmounts cleanly on view transitions.
- `expo-image-picker` provides gallery import via `launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })`.
- Captured and imported images reside strictly within the application's sandboxed local cache and are never saved to the public camera roll.
- All form inputs in `add.tsx` are managed at the top-level parent component to prevent data loss when switching between form, camera, and preview view modes.
