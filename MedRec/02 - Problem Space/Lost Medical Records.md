---
project: MedRec
type: problem
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - problem-space
  - lost-records
  - data-loss
  - clinical-safety
related:
  - "[[Patient Frustrations]]"
  - "[[Medical Record Portability]]"
  - "[[Incomplete Medical History]]"
  - "[[Research Questions]]"
---

# Lost Medical Records

> [!WARNING]
> **Status: Assumed Problem (Unvalidated)**
> The extent and frequency with which patient medical records are permanently lost or misplaced during clinical transitions is an **assumption**. Systematic validation with clinical administrators and patient interviews is required.

---

## The Problem

**Lost medical records** occur when critical clinical documentation, lab histories, surgical summaries, or diagnostic imaging files become inaccessible, misplaced, unindexed, or permanently deleted across the healthcare lifecycle.

When records are lost, the continuity of a patient's care is severed, forcing healthcare providers to proceed blindly or re-order diagnostics.

---

## Assumed Mechanisms of Loss

1. **Transfer & Transmission Failures**:
   - Faxes transmitted to misdialed numbers or dumped into unreviewed institutional digital queues.
   - Physical records or CDs misfiled in clinic mailrooms or filing cabinets.
   - Attachments lost during EHR-to-EHR data transitions or vendor conversions.

2. **Temporal & Institutional Purges**:
   - Medical practices closing down or being acquired without clear data archival protocols.
   - Standard statutory retention limits (e.g., 5 to 7 years) expiring, leading hospitals to routinely delete older records that could still be vital for longitudinal health understanding.

3. **Patient-Side Misplacement**:
   - Physical paper copies, loose reports, or thumb drives misplaced or damaged during home storage or moving.

---

## Ripple Effects

```
[Lost / Misplaced Records]
           │
           ├───> [[Incomplete Medical History]] (Clinical Risk)
           ├───> [[Patient Frustrations]] (High Emotional Cost)
           └───> Failure in [[Medical Record Portability]]
```

- When prior records are lost, doctors are forced to work with an [[Incomplete Medical History]], increasing the likelihood of diagnostic delays and repeated procedures.
- Creates severe anxiety and [[Patient Frustrations]], particularly when the lost records contain difficult-to-replicate tests (e.g., historical biopsies, childhood immunology records).
- Demonstrates the urgent need for a patient-centric, sovereign archive that bypasses institutional data fragility.

---

## Key Validation Questions
- How often do clinics fail to find previously transferred records on appointment day?
- What are the primary points of data loss during clinic-to-clinic referrals?
- Tracked in [[Research Questions]].
