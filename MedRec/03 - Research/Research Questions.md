---
project: MedRec
type: research
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - research
  - questions
  - inquiry
  - medrec
related:
  - "[[Research Hypotheses]]"
  - "[[Medical Record Portability]]"
  - "[[Patient Frustrations]]"
  - "[[Literature Review]]"
  - "[[Research MOC]]"
---

# Research Questions

This document tracks the primary and secondary research questions guiding the [[MedRec]] project. Every question represents an explicit knowledge gap that must be investigated through [[Qualitative Research]], [[Quantitative Research]], or [[Literature Review]].

All questions are currently **OPEN** and will be updated as evidence is gathered in [[Research Findings]].

---

## 📋 Primary Research Questions

### RQ-01: Patient Access & Transfer Workflows
> **Question:** How do patients currently access, store, and transfer their medical records across disparate healthcare providers?
- **Status:** `OPEN`
- **Sub-Questions:**
  - What physical (e.g., paper folders, CD-ROMs, thumb drives) and digital (e.g., patient portals, email, cloud drives) media do patients currently rely on?
  - How long does it typically take a patient to obtain records when transitioning to a new specialist or clinic?
  - How frequently do patients experience missing, incomplete, or corrupted records during a clinical encounter?
- **Target Method:** [[Qualitative Research]] (Semi-structured interviews), [[Quantitative Research]] (Surveys)
- **Related Hypotheses:** [[Research Hypotheses#H1 - Transfer Frustration|H1]], [[Research Hypotheses#H2 - Physical & Manual Dependency|H2]]
- **Related Topics:** [[Medical Record Portability]], [[Patient Workflows]], [[Patients]]

---

### RQ-02: Pain Points & Frictional Bottlenecks
> **Question:** What are the most significant pain points and cognitive burdens experienced by patients and caregivers regarding record portability?
- **Status:** `OPEN`
- **Sub-Questions:**
  - What emotional and administrative toll does record retrieval place on patients managing chronic conditions or caregiving for elderly family members?
  - Where in the transfer pipeline do requests fail or stall (e.g., fax delays, portal lockouts, bureaucratic release forms, release fees)?
  - How often are diagnostic tests (e.g., blood panels, MRIs, X-rays) unnecessarily repeated due to inaccessible prior records?
- **Target Method:** [[Interview Questions]], [[Literature Review]]
- **Related Hypotheses:** [[Research Hypotheses#H1 - Transfer Frustration|H1]]
- **Related Topics:** [[Patient Frustrations]], [[Caregiver Burden]], [[Problem Space MOC]]

---

### RQ-03: Competitive Landscape & Shortcomings of Existing Solutions
> **Question:** What existing personal health record (PHR) and record exchange solutions exist, and why have they failed to achieve widespread adoption or solve user needs?
- **Status:** `OPEN`
- **Sub-Questions:**
  - Why do portal-based systems (e.g., Epic MyChart, Cerner HealtheLife) create "walled gardens" rather than fluid cross-system portability?
  - What are the UX and adoption limitations of national health exchanges or third-party health apps (e.g., Apple Health, CommonWell, Carequality)?
  - What structural factors led to historical PHR failures (e.g., Google Health v1, Microsoft HealthVault)?
- **Target Method:** [[Literature Review]], Competitive Analysis
- **Related Hypotheses:** [[Research Hypotheses#H3 - Patient-Centric Portability Value|H3]]
- **Related Topics:** [[Existing Solutions]], [[Competitive Landscape]], [[Research Gaps]]

---

### RQ-04: Legal, Regulatory & Compliance Landscape
> **Question:** What are the legal, regulatory, and data privacy mandates governing patient-held health data and cross-provider transfers?
- **Status:** `OPEN`
- **Sub-Questions:**
  - What rights do patients have under regulations like HIPAA Right of Access, 21st Century Cures Act (Information Blocking Rule), and GDPR?
  - What liabilities and technical compliance obligations apply to a client-side or patient-mediated record tool vs a covered entity?
  - What consent and cryptographic authentication standards are required when sharing records between patients and clinics?
- **Target Method:** Regulatory Analysis, [[Literature Review]]
- **Related Hypotheses:** [[Research Hypotheses#H4 - Privacy and Autonomy Concerns|H4]]
- **Related Topics:** [[Regulatory Landscape]], [[HIPAA Compliance]], [[Security & Privacy MOC]]

---

### RQ-05: Healthcare Provider Ingestion & Interoperability
> **Question:** How do healthcare providers, clinic staff, and physicians currently receive and ingest external medical records from new patients?
- **Status:** `OPEN`
- **Sub-Questions:**
  - Are clinicians willing to review patient-provided digital records, summaries, or structured FHIR exports during appointments?
  - What formatting (e.g., PDF summary, CCDA/FHIR JSON, timeline view) do physicians find most legible and trustworthy?
  - What administrative barriers exist for front-desk staff uploading external records into their local EHR?
- **Target Method:** Clinician Interviews, [[Qualitative Research]]
- **Related Hypotheses:** [[Research Hypotheses#H5 - Clinician Trust & Ingestion Friction|H5]]
- **Related Topics:** [[Provider Workflows]], [[Standards & Interoperability]], [[EHR Integration]]

---

## 🔄 Research Lifecycle

```
[ Research Question (OPEN) ]
            │
            ▼
[ Investigate via Methods / Literature ]
            │
            ▼
[ Synthesize into Findings & Themes ]
            │
            ▼
[ Update Question: RESOLVED / PARTIALLY ANSWERED ]
```

See also: [[Research MOC]], [[Research Hypotheses]], [[Research Gaps]], [[Research Findings]].
