---
project: MedRec
type: idea
status: idea
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - feature
  - idea
  - qr-code
  - quick-access
related:
  - "[[Record Sharing]]"
  - "[[Emergency Access]]"
  - "[[Ideas MOC]]"
  - "[[Functional Requirements]]"
  - "[[Access Control]]"
  - "[[Patients]]"
---

# QR Code Access

## Purpose
Provides an on-demand, instant QR code generator within the MedRec mobile app that a doctor, nurse, or first responder can scan using any standard smartphone or workstation camera to immediately view designated medical records or emergency profiles.

## Problem it Solves
Solves the friction of manually typing URLs, sending emails, or pairing devices during clinical consultations. Eliminates delays during triage or consultation kickoffs where immediate access to patient baseline data is needed.

## Target User
- [[Patients]]: Displaying their phone screen to a doctor during in-person visits.
- [[Doctors|Healthcare Providers]]: Scanning the patient's QR code on mobile or desktop webcam to load records instantly.

## Related Research
- *Status*: Pending research validation.
- *Assumption*: Almost all modern smartphone camera apps automatically parse QR code URLs natively without requiring dedicated QR scanner apps.

## Requirements
- [[Functional Requirements]] — Instant dynamic QR code generation from short-lived signed tokens.
- Support both dynamic (time-expiring consultation tokens) and static (emergency profile cards / lock screen widgets).
- Optional PIN protection prompt on the scanned landing page to ensure two-factor authorization (patient states PIN verbally to doctor).
- Visual countdown timer on the patient app screen showing remaining QR validity.

## Dependencies
- [[Record Sharing]]: The underlying sharing engine that resolves tokens into scoped web views.
- [[Emergency Access]]: Emergency mode variant for critical medical identifiers (blood type, allergies).
- [[Ideas MOC]]: Tracked within innovation concepts backlog.

## UX Considerations
- High-contrast, maximum screen brightness auto-trigger when opening the QR display modal for easy optical scanning.
- Clear visual indicator showing "Access Granted" on patient screen when the doctor scans and opens the token.
- Offline QR generation capability using signed asymmetric payloads if connectivity is unavailable.

## Technical Considerations
- QR payload efficiency: Keep encoded URL short (e.g., `https://medrec.app/s/xyz123`) to maintain low QR density and high error correction tolerance.
- Token replay prevention: Single-use or short expiration window (e.g., 5–15 minutes).
- Rate-limiting on scan endpoints to block automated scrapers.

## Status
- **Idea** (Exploration and technical feasibility assessment)

## Open Questions
- Can an offline QR code contain enough encrypted data (like emergency summary) to be read without an active internet connection on the scanner device?
- How to prevent shoulder-surfing or unauthorized photo captures of the patient's QR code in public waiting rooms?
