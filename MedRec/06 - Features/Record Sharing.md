---
project: MedRec
type: feature
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - feature
  - sharing
  - portability
  - security
related:
  - "[[Medical Record Portability]]"
  - "[[Record Transfer]]"
  - "[[Authorization]]"
  - "[[Access Control]]"
  - "[[Functional Requirements]]"
  - "[[Patient Frustrations]]"
  - "[[QR Code Access]]"
  - "[[Digital Medical Records]]"
---

# Record Sharing

## Purpose
Enables patients to securely share specific medical records, categories, or their entire health summary with healthcare providers, family members, or caregivers through time-bounded, permission-controlled access links or QR codes.

## Problem it Solves
Directly tackles [[Medical Record Portability]] and [[Patient Frustrations]]. Today, transferring medical data across different clinics requires patients to carry physical folders, re-explain complex clinical histories verbally, or repeat diagnostic procedures due to lack of interoperability between clinic EMRs.

## Target User
- [[Patients]]: Sharing pertinent records with a new specialist or consulting physician.
- [[Doctors|Healthcare Providers]]: Accessing a web-based, read-only view of the patient's records on their clinic workstation without needing to register for an app account.

## Related Research
- *Status*: Pending research validation.
- *Hypothesis*: Doctors will resist downloading a mobile app to view records; providing an instant web portal via secure scan/link maximizes doctor adoption.

## Requirements
- [[Functional Requirements]] — Generate temporary share tokens with granular scope (e.g., "all cardiology records from last 6 months" vs "entire history").
- Configurable expiration times (e.g., 1 hour, 24 hours, 7 days, or one-time view).
- Instant revocation capability: patient can cancel access immediately from their app dashboard.
- Read-only web viewer for recipient doctors that requires no native app installation.
- Audit log tracking when and how many times a share link was opened.

## Dependencies
- [[Authorization]] & [[Access Control]]: Robust token generation, verification, and revocation logic.
- [[Digital Medical Records]]: The underlying records being shared.
- [[QR Code Access]]: Visual delivery mechanism for in-person doctor visits.
- [[Authentication]]: Protecting the patient interface where sharing permissions are issued.

## UX Considerations
- Share wizard: Simple step-by-step selection of (1) what to share, (2) who to share with / duration, (3) generate link or QR code.
- Active shares badge: High-visibility dashboard widget showing currently active share links with one-tap "Revoke All" emergency button.
- Clean, doctor-friendly web interface with print and export capabilities for clinical documentation.

## Technical Considerations
- Cryptographically secure short-lived token generation (e.g., SHA-256 HMAC tokens with expiry timestamp).
- Stateless token verification or Redis session store for rapid token lookup and instant revocation.
- Rate limiting and brute-force protection on public share URLs to prevent token guessing.
- Watermarking or read-only DRM rendering on shared documents to deter unauthorized redistribution.

## Status
- **Proposed** (Core Value Proposition Feature)

## Open Questions
- Should the shared web view allow the doctor to download raw PDF files, or restrict to in-browser viewing only?
- How should patient consent and HIPAA / GDPR data transfer disclosures be presented before generating a share token?
