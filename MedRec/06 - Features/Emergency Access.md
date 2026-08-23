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
  - emergency
  - security
  - access-control
related:
  - "[[QR Code Access]]"
  - "[[Record Sharing]]"
  - "[[Access Control]]"
  - "[[Ideas MOC]]"
  - "[[Security Requirements]]"
  - "[[Patients]]"
  - "[[Healthcare Providers]]"
---

# Emergency Access

## Purpose
Provides an emergency "Break Glass" medical profile accessible by first responders, emergency room staff, or bystanders without requiring the patient's device unlock code or standard app login credentials.

## Problem it Solves
In acute medical emergencies (e.g., unconscious patient, trauma, anaphylaxis), first responders urgently need critical life-saving information (blood type, severe drug allergies, active chronic medications, emergency contact numbers) when the patient cannot communicate.

## Target User
- [[Patients]]: Seeking peace of mind that critical medical facts are discoverable in an emergency.
- [[Healthcare Providers]] / First Responders (EMT, Paramedics, ER Physicians): Needing immediate, unauthenticated read-only access to vital baseline facts.

## Related Research
- *Status*: Pending research validation.
- *Observation*: Apple Health Medical ID and Android Emergency Information offer on-lock-screen access, but lack integration with deeper patient medical record archives and shareable web links.

## Requirements
- [[Security Requirements]] — Strict separation of public "Emergency Card" data from full private clinical history.
- Emergency Card fields: Full Name, Date of Birth, Blood Type, Severe Allergies, Critical Conditions (e.g., Diabetes, Epilepsy), Current Medications, Organ Donor Status, Emergency Contacts.
- Lock screen widget / printable QR code card for physical wallets or medical alert bracelets.
- Audit notification: In-app alert or SMS sent to emergency contacts whenever the Emergency Profile is accessed.

## Dependencies
- [[QR Code Access]]: Visual link payload on physical card or lock screen wallpaper.
- [[Record Sharing]]: Public landing page endpoint hosting the emergency card view.
- [[Access Control]]: Perimeter isolating the public emergency card from deep clinical records.
- [[Ideas MOC]]: Tracked in future innovation concepts.

## UX Considerations
- High-visibility emergency styling (red/white medical cross, universally recognized iconography).
- Direct "Call Emergency Contact" one-tap dial button on the emergency landing page.
- Simple setup wizard guiding the patient on what critical info to include vs keep private.

## Technical Considerations
- Ultra-high availability: Emergency endpoint must have zero downtime and minimal latency (static edge CDN caching).
- Strict data minimization: Absolutely no sensitive psychiatric, reproductive, or detailed clinical notes exposed on the public emergency view.
- Rate limiting and IP logging on emergency profile URLs to detect abusive web scraping.

## Status
- **Idea** (Conceptual specification & privacy review)

## Open Questions
- How to balance frictionless emergency responder access with protecting patient privacy against malicious unauthorized physical scans?
- Can we generate an offline lock screen wallpaper template dynamically from the app?
