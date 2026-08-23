---
project: MedRec
type: feature
status: proposed
created: 2026-08-24
updated: 2026-08-24
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
Manages personal identity, demographic data, baseline clinical attributes, emergency contact information, and app preferences for the account holder and any associated dependent profiles.

## Problem it Solves
Medical records lack context without core patient demographic details (legal name, biological sex, date of birth, blood group, chronic conditions, baseline allergies). This profile acts as the core demographic master record for the user across all consultations.

## Target User
- [[Patients]]: Maintaining their personal baseline details and managing dependent profiles (e.g., elderly parents, children).

## Related Research
- *Status*: Pending research validation.
- *Assumption*: Many prospective users manage healthcare not only for themselves but also for children or aging parents, requiring dependent profile support.

## Requirements
- [[Functional Requirements]] — Manage primary profile: Legal name, Date of birth, Biological sex, Blood type, Height, Weight, Known allergies, Chronic conditions.
- Emergency contacts: Name, relationship, primary phone number, alternate phone number.
- Account settings: Notification preferences, data export/download requests, account deletion (GDPR right to be forgotten).
- Multi-profile / dependent support (switch between "Self", "Child 1", "Parent").

## Dependencies
- [[Authentication]]: Validated user identity required to create and update profile records.
- [[Digital Medical Records]]: Profile ID links to and scopes all clinical record entries.
- [[Emergency Access]]: Consumes profile demographics and emergency contacts for the emergency card view.

## UX Considerations
- Progressive profile completion: Don't force users to fill out 20 fields upfront during onboarding; prompt for baseline info when relevant.
- Profile switcher avatar / selector in app header for switching between personal and family member records.
- Clear visual badges for critical health attributes (e.g., "Penicillin Allergy", "Type 1 Diabetes").

## Technical Considerations
- Relational schema: `User` (credentials, auth) 1-to-many `PatientProfile` (demographics, records) to easily support multi-patient management under one login.
- Profile photo storage: Image resizing and cloud storage optimization.
- Audit logging for changes to critical demographic and allergy data.

## Status
- **Proposed** (Core Domain Feature)

## Open Questions
- In the MVP, should I limit the system to a single patient profile per account to keep scope manageable, or build multi-profile architecture from day one?
- What are the legal consent boundaries when a parent uploads records for an adolescent dependent?
