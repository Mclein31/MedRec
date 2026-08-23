---
project: MedRec
type: concept
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - concept
  - problem-space
  - data-ownership
  - privacy
  - digital-rights
  - ethics
related:
  - "[[Medical Records]]"
  - "[[Data Privacy]]"
  - "[[Research Questions]]"
  - "[[MedRec Vision]]"
---

# Patient Data Ownership

**Patient data ownership** encompasses the legal, ethical, and philosophical inquiry into who has the ultimate rights to own, control, monetize, delete, and transfer personal health data generated during medical encounters.

While patients generate health data through their own biological experiences and treatments, the records describing that reality have traditionally been owned and gatekept by the institutions that document and store them.

---

## The Tripartite Ownership Conflict

```
                ┌────────────────────────────────┐
                │          The Patient           │
                │  - Biological origin of data   │
                │  - Direct health stakeholder   │
                └───────────────┬────────────────┘
                                │
             Ethical Right vs. Institutional Control
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐     ┌─────────────────────────────────┐
│     The Healthcare Provider   │     │    The Enterprise / Platform    │
│  - Author of clinical notes   │     │  - Host of the database (EHR)   │
│  - Medico-legal liability     │     │  - Commercial & analytics value │
└───────────────────────────────┘     └─────────────────────────────────┘
```

1. **The Patient**:
   - Holds the fundamental moral claim to their health history. Without their body and consent, no data exists.
   - Requires full sovereignty over their [[Medical Records]] to make informed healthcare decisions and maintain continuous care.

2. **The Healthcare Provider / Clinician**:
   - Holds legal responsibility and malpractice liability for clinical assessments and notes.
   - Claims intellectual stewardship over professional interpretations, differential diagnoses, and therapy recommendations.

3. **The Hospital Enterprise / EHR Vendor**:
   - Maintains physical and electronic custody of the databases.
   - Historically monetizes de-identified aggregated clinical datasets for research, AI training, and commercial analytics, often without direct patient compensation or granular consent.

---

## Legal Rights vs. Practical Custody

- **Legal Rights**:
  - Under frameworks such as the **HIPAA Privacy Rule** (US) and **GDPR Article 20** (EU), patients possess a legally protected right to access, inspect, and obtain copies of their health records.
  - The **21st Century Cures Act** explicitly prohibits "information blocking" by healthcare providers and EHR vendors.
- **Practical Custody**:
  - In practice, healthcare institutions act as de facto owners by imposing friction on exports, restricting access behind closed portals, and limiting interoperability.

---

## Core Philosophy of MedRec

A central pillar of the [[MedRec Vision]] is that **patients must be the sovereign owners of their medical records**:
- Data sovereignty requires local-first or user-encrypted custody, ensuring that no vendor, hospital, or intermediary can revoke access to a patient's historical records.
- Intersects deeply with robust [[Data Privacy]], self-custody principles, and patient consent models.

---

## Research & Architectural Inquiries
- What are the legal liabilities of a third-party, patient-controlled storage app holding clinical records?
- How do zero-knowledge encryption models align with emergency healthcare access requirements?
- Detailed in [[Research Questions]].
