---
project: MedRec
type: feature
status: implemented
created: 2026-08-24
updated: 2026-08-30
tags:
  - medrec
  - feature
  - profile
  - user-management
related:
  - "[[Authentication]]"
  - "[[Patients]]"
  - "[[Functional Requirements]]"
  - "[[Digital Medical Records]]"
  - "[[Emergency Access]]"
---

# User Profile

## Purpose
Manages personal identity, demographic data, baseline clinical attributes, emergency contact information, and app preferences for the account holder.

## Problem it Solves
Medical records lack context without core patient demographic details (legal name, biological sex, date of birth, blood group, chronic conditions, baseline allergies). This profile acts as the core demographic master record and emergency Medical ID for the user across consultations and acute emergency triage.

## Target User
- [[Patients]]: Maintaining their personal baseline details, Emergency Medical ID, and account governance.

## Implementation Details
- **Profile Tab UI (`app/(tabs)/profile.tsx`)**:
  - Avatar with dynamically generated user initials.
  - Personal Information (Date of Birth, Age, Biological Sex, Phone, Residential Address).
  - Emergency Medical ID (Blood Type, Allergies with warning pills, Chronic Conditions, Maintenance Meds, Emergency Contact with 1-tap call).
  - Emergency ID First Responder Modal (`EmergencyIdModal.tsx`) with offline scannable QR code.
  - In-place editing via progressive disclosure modal (`ProfileEditModal.tsx`).
  - Active QR Shares management linking directly to `/(tabs)/share`.
  - Authenticated Password Change modal (`ChangePasswordModal.tsx`).
  - Full Health Vault JSON export using native `Share.share`.
  - Self-service Account Deletion with cascade database cleanup.
- **Backend Architecture**:
  - Database table `user_profiles` linked 1:1 with `users` (`user_id` unique FK with `ON DELETE CASCADE`).
  - `GET /profile`, `PUT /profile`, `PUT /profile/password`, `DELETE /profile` routes protected with JWT authentication.
  - SQL-level `to_char(p.date_of_birth, 'YYYY-MM-DD')` formatting to prevent UTC timezone shift errors.

## Dependencies
- [[Authentication]]: Validated user identity required to create and update profile records.
- [[Digital Medical Records]]: Profile ID links to and scopes all clinical record entries.
- [[Emergency Access]]: Consumes profile demographics and emergency contacts for the emergency card view.

## Status
- **Implemented** (Phase 1 MVP completed 2026-08-30)

## Deferred to Future Iterations
- Multi-patient / dependent proxy switcher (managing family members under a single login).
- Lock screen iOS Live Activity / Medical ID Widget.
- Direct hospital EHR portal sync via SMART on FHIR.
