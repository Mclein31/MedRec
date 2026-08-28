---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-08-28
---

# 📜 MedRecord_App (MedRec) — Changelog

## [0.3.0] — Backend Core & Testing Suite
- **Added**: Complete Node/Express 5 REST API with Auth, Records, Sharing, and AI route modules.
- **Added**: PostgreSQL schema migrations (`schema.sql`) with user, record, share, and audit tables.
- **Added**: Jest and Supertest test environment setup (`tests/setupEnv.js`).
- **Added**: Express security hardening with Helmet, CORS, and Rate Limiting middleware.

## [0.2.0] — Mobile Client Scaffold & Navigation
- **Added**: React Native Expo SDK 52 application setup with Expo Router v4.
- **Added**: Tab navigation (`(tabs)/index.tsx`, `share.tsx`, `scan.tsx`) and auth screens (`login.tsx`, `register.tsx`).
- **Added**: Responsive scaling utility (`hooks/useResponsive.ts`) and custom themed UI components.

## [0.1.0] — Obsidian Research & Product Design Vault
- **Added**: 18-module Obsidian knowledge vault in `MedRec/` documenting clinical problem spaces, patient needs, and regulatory requirements.
