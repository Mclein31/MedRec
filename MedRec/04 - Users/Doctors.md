---
project: MedRec
type: concept
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - stakeholder
  - secondary-user
  - clinical-workflow
  - healthcare-providers
related:
  - "[[User Personas]]"
  - "[[Hospitals]]"
  - "[[Clinics]]"
  - "[[Medical Records]]"
  - "[[Record Sharing]]"
---

# Doctors

Doctors represent a critical secondary user and key external stakeholder for MedRec. While patients own and curate the records, doctors are the primary consumers and interpreters of those records during clinical decision-making.

Any friction introduced into a doctor's workflow will lead to resistance or outright refusal to review patient-provided records.

## Clinical Role & Interaction Points

- **Point-of-Care Review**: Doctors need rapid, high-yield summaries when reviewing a new or transferring patient's medical history.
- **Workflow Constraints**: Typically have only 10–15 minutes per consultation; cannot spend time navigating complex external software or logging into third-party accounts.
- **Practice Settings**: Doctors operate across diverse environments, including large [[Hospitals]] with rigid EHR ecosystems and independent [[Clinics]] with varied document-handling processes.
- **Receiving Data**: Doctors interact with MedRec via [[Record Sharing]] mechanisms (e.g., viewing structured summaries, exported PDFs, or temporary secure access links).

## Current Working Assumptions

> [!NOTE]
> **Assumption**: Doctors will not install dedicated third-party apps or create new portal accounts just to view a single patient's records.
> 
> **Assumption**: Doctors trust patient-provided records more when they are verifiable (e.g., official lab PDFs, hospital discharge summaries) rather than self-reported text notes.
> 
> **Assumption**: A chronological timeline of past diagnoses, medications, allergies, and recent labs is the most valuable view for an intake consultation.
> 
> *These assumptions require clinical validation via practitioner interviews.*

## Persona Implications

- Clinical archetypes will be detailed in [[User Personas]] to model how primary care physicians versus specialists consume historical [[Medical Records]].

## Open Questions

- What format is most frictionless for a doctor receiving records (one-page PDF summary, QR code link, standardized export)?
- What legal or liability hesitations do physicians have when reviewing external digital records provided directly by a patient?
