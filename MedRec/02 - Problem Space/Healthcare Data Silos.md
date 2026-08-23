---
project: MedRec
type: problem
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - problem-space
  - data-silos
  - interoperability
  - ehr-fragmentation
related:
  - "[[Hospital Record Systems]]"
  - "[[Medical Record Portability]]"
  - "[[Patient Frustrations]]"
  - "[[Research Questions]]"
---

# Healthcare Data Silos

> [!WARNING]
> **Status: Assumed Problem (Unvalidated)**
> The extent to which healthcare data silos are caused by technical limitations versus commercial incentives is an **assumption**. This requires verification through industry research and clinician discovery.

---

## Phenomenon Overview

A **healthcare data silo** occurs when patient medical data is trapped within an isolated electronic database, clinical department, or hospital enterprise system, inaccessible to external healthcare providers or the patient themselves.

Instead of a fluid, unified health timeline, medical data resembles an archipelago of disconnected islands:
- Clinic A uses System X.
- Hospital B uses System Y.
- Diagnostic Lab C uses an isolated, proprietary web portal.
- Imaging Center D distributes results exclusively on physical optical media or raw film.

---

## Why Healthcare Silos Form (Working Hypotheses)

1. **Vendor Lock-in & Commercial Moats**:
   - EHR vendors historically designed closed ecosystems to maximize institutional dependency and protect market share ([[Hospital Record Systems]]).
   - Health systems may view patient data as an organizational asset to deter patients from seeking out-of-network care.

2. **Inconsistent Semantic Standards**:
   - Even when standard formats (like HL7 or FHIR) are technically supported, custom fields, proprietary extensions, and differing terminologies (SNOMED, LOINC, ICD-10) create severe translation friction.

3. **Privacy & Liability Fears**:
   - Healthcare compliance officers often adopt risk-averse interpretations of privacy laws (e.g., HIPAA), treating data isolation as safer than inter-institutional data exchange.

4. **Fragmented Identity Matching**:
   - The absence of a universal patient identifier in many healthcare systems creates ambiguity, leading institutions to quarantine records rather than risk mismatched identities.

---

## Downstream Consequences

- **Erosion of Portability**: Siloed data is the primary mechanical barrier preventing seamless [[Medical Record Portability]].
- **Patient Friction**: Patients must juggle multiple portal logins, separate passwords, and divergent record copies, leading to deep [[Patient Frustrations]].
- **Clinical Blind Spots**: Physicians make high-stakes decisions without visibility into records generated outside their own institutional walls.

---

## Research Inquiries

To validate the structure and severity of healthcare silos:
- Are modern FHIR APIs solving the silo problem in practice, or just in regulatory theory?
- Where do the biggest data blockades occur (radiology vs. lab vs. outpatient notes)?
- Tracked in [[Research Questions]].
