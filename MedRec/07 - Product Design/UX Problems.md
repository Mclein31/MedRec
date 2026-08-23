---
project: MedRec
type: problem
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - problem
  - ux
  - usability
  - friction
related:
  - "[[User Pain Points]]"
  - "[[Product Design MOC]]"
  - "[[Design Decisions]]"
  - "[[Open Questions]]"
  - "[[Record Upload]]"
  - "[[Record Sharing]]"
---

# UX Problems

## Overview
This document catalogs identified, anticipated, and observed user experience friction points, usability hurdles, and edge-case challenges in MedRec. Each problem is tracked to ensure intentional design solutions are formulated before production implementation.

---

## ⚠️ Catalog of Anticipated UX Problems

| Problem ID | Summary | Affected Flow | Severity | Status / Resolution Note |
| :--- | :--- | :--- | :--- | :--- |
| **UXP-01** | **Upload Fatigue & High Abandonment** | [[Record Upload]] | `High` | Typing extensive form fields causes drop-off. *Solution: Progressive disclosure & camera-first flow.* |
| **UXP-02** | **Doctor Hesitation to Use New Tech** | [[Record Sharing]] | `Critical` | Doctors in busy clinics won't download an app. *Solution: Instant web view via QR code.* |
| **UXP-03** | **Legibility of Handwritten Scans** | [[Record Viewing]] | `Medium` | Poor lighting / doctor handwriting hard to read. *Solution: Auto-contrast enhancement & zoom.* |
| **UXP-04** | **Unclear Scope of Shared Data** | [[Record Sharing]] | `High` | Patients fear accidentally revealing sensitive private history. *Solution: Visual scope preview before sharing.* |
| **UXP-05** | **Offline Clinic Situations** | App Wide | `Medium` | Hospital basements often have zero cellular signal. *Solution: Local caching of critical emergency data.* |
| **UXP-06** | **Multi-Family Profile Confusion** | [[User Profile]] | `Medium` | Accidental upload of child's record to parent's profile. *Solution: Persistent active profile banner.* |

---

## 🔍 Detailed Problem Analysis Template

### UXP-01: Upload Friction and Metadata Burden
- **Context**: Patients often have 10–20 historical paper documents when first installing the app.
- **Root Cause**: Requiring category, doctor name, clinic name, date, and description for every single page creates overwhelming initial cognitive load.
- **Working Hypothesis**: A fast batch capture mode that only asks for photos and automatic date defaults will increase completion rate by >80%.
- **Action Item**: Create wireframe for "Quick Snap Mode" in [[Wireframes]].

---

## 🔗 Related Notes
- Pain Points: [[User Pain Points]]
- Design Choices: [[Design Decisions]]
- Open Research Inquiries: [[Open Questions]]
- Parent Hub: [[Product Design MOC]]
