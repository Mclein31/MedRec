---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-08-29
---

# 📜 MedRecord_App (MedRec) — Changelog

## [0.3.1] — Record Details Metadata & Layout Redesign
- **Changed**: Reorganized Record Details (`record/[id].tsx`) overview card with a compact two-column horizontal metadata row for Date of Event and Logged in MedRec with an inline divider.
- **Improved**: Established modular card hierarchy with dedicated sections for Overview, Clinical Notes & Observations, and AI Medical Insights.
- **Refined**: Preserved MedRec design tokens, Lexend Deca typography, curated asset icons, and safe-area insets while significantly reducing vertical footprint.

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
