---
project: MedRec
type: design
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - design
  - information-architecture
  - structure
related:
  - "[[Navigation]]"
  - "[[Medical Record Categories]]"
  - "[[User Flow]]"
  - "[[Product Design MOC]]"
  - "[[Digital Medical Records]]"
  - "[[User Profile]]"
---

# Information Architecture

## Overview
This document defines the structural organization of information, data hierarchy, and mental models implemented across the MedRec application. The goal is to make navigating complex medical histories intuitive, predictable, and frictionless.

---

## 🏛️ Content Hierarchy & Entity Relationships

```
User Account (Auth / Global Settings)
 └── Patient Profile (Self / Family Member)
      ├── Emergency Info (Allergies, Blood Type, Emergency Contacts)
      ├── Medical Record Categories (Taxonomy)
      │    ├── Consultations & Notes
      │    ├── Lab & Diagnostic Results
      │    ├── Prescriptions & Medications
      │    ├── Radiology & Imaging
      │    └── Immunizations
      ├── Individual Record Items
      │    ├── Metadata (Title, Date, Doctor/Facility, Tags)
      │    ├── Attachment Binaries (PDF, Scans, Images)
      │    └── AI Summaries & Insights
      └── Active Shares & Sharing History (Tokens, QR Links)
```

---

## 📑 Core Navigation Levels

### Level 1: Global App Domains
1. **Home / Dashboard**: High-level health summary, recent uploads, active shares, quick-action capture.
2. **Records Repository**: Categorized document browser, folder trees, and searchable list.
3. **Timeline / Insights**: Chronological sequence of health events and AI summaries.
4. **Emergency Profile**: High-contrast Medical ID card for rapid responder access.
5. **Account & Settings**: Profile switcher, data export, privacy controls, security settings.

### Level 2: Category & Collection Views
- Filtered record collections by category ([[Medical Record Categories]]).
- Date range aggregations (e.g., "2026", "2025").
- Provider/Facility aggregations (e.g., "St. Luke's Medical Center").

### Level 3: Individual Record Detail
- Document viewer canvas ([[Record Viewing]]).
- Metadata sidebar: Visit date, clinic name, prescribing doctor.
- Action toolbar: Share, Export, Edit, Delete.

---

## 🎯 Design Principles for MedRec IA
1. **Zero Deep Nesting**: Users should reach any vital health record within 3 taps from the home screen.
2. **Context First**: Document metadata (visit date, doctor, category) is always paired visually with document scans.
3. **Clear Ownership**: When multiple family profiles exist, the active profile indicator must be persistently visible.

---

## 🔗 Related Notes
- Screen Flow: [[User Flow]]
- Routing & Menus: [[Navigation]]
- Domain Taxonomy: [[Medical Record Categories]]
- Parent Hub: [[Product Design MOC]]
