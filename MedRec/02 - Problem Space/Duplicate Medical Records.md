---
project: MedRec
type: problem
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - problem-space
  - duplicate-records
  - data-integrity
  - reconciliation
related:
  - "[[Healthcare Data Silos]]"
  - "[[Hospital Record Systems]]"
  - "[[Medical Records]]"
  - "[[Research Questions]]"
---

# Duplicate Medical Records

> [!WARNING]
> **Status: Assumed Problem (Unvalidated)**
> The premise that patients routinely have conflicting, duplicate, or un-reconciled record entries across multiple healthcare databases is an **assumption**. The frequency and clinical significance of these discrepancies require empirical investigation.

---

## Overview

**Duplicate and conflicting medical records** arise when a single patient has multiple disconnected health record files across different institutions—or even within different departments of the same health network—containing overlapping, divergent, or mutually contradictory information.

When multiple records exist without a single source of truth, clinicians and patients face substantial uncertainty regarding the active state of medications, allergies, diagnoses, and immunization histories.

---

## Causes of Duplication & Divergence

1. **Master Patient Index (MPI) Fragmentation**:
   - Hospitals often create new patient profiles due to minor typographical discrepancies (e.g., misspelled names, shifted address, differing date of birth formats), resulting in duplicate internal profiles.

2. **System-to-System Desynchronization**:
   - A patient's prescription dosage may be altered at Specialist Clinic A, but [[Hospital Record Systems]] at Hospital B continue to reflect the older discontinued dosage because no automated synchronization occurs across [[Healthcare Data Silos]].

3. **Isolated Diagnostic Encounters**:
   - Urgent care centers or independent imaging clinics generate standalone entries that are never reconciled with the patient's primary [[Medical Records]].

---

## Associated Risks & Engineering Implications

```
[Clinic A Record: Med X 10mg] ───┐
                                 ├───> [Conflict / Ambiguity] ───> [Clinical Risk]
[Hospital B Record: Med X 20mg] ──┘
```

- **Clinical Confusion**: Treating physicians cannot easily discern which medication list or allergy profile is the authoritative, current record.
- **Patient Confusion**: Patients viewing multiple patient portals receive contradictory guidance, eroding their confidence in their care plans.
- **Data Reconciliation Challenge for MedRec**: When MedRec aggregates data from multiple sources, it must implement sophisticated deduplication, merge-conflict resolution, and provenance tracking algorithms without accidentally suppressing vital clinical nuances.

---

## Research Inquiries
- What algorithmic approaches work best for clinical record deduplication (e.g., probabilistic patient matching, deterministic FHIR ID mapping)?
- How do clinicians prefer to handle and resolve conflicting medication records?
- Tracked in [[Research Questions]].
