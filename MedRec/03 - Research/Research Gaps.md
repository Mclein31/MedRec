---
project: MedRec
type: research
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - research
  - research-gaps
  - open-questions
  - knowledge-gaps
  - medrec
related:
  - "[[Research Questions]]"
  - "[[Literature Review]]"
  - "[[Research MOC]]"
  - "[[Open Questions]]"
---

# Research Gaps

This document identifies known blind spots, unverified domains, and knowledge deficits across the [[MedRec]] project. These gaps represent high-priority areas where insufficient empirical data or technical understanding currently exists, posing risks to product-market fit or technical feasibility.

---

## 🧭 Active Research Gaps

### GAP-01: Primary Patient Experience & Workflow Realities
- **Description:** While secondary reports document broad patient dissatisfaction, I lack direct, qualitative primary observation of how patients physically organize, store, scan, and retrieve records across multiple specialists.
- **Why It Matters:** Without grounded primary data, product design risks solving theoretical problems rather than practical, daily usability blockers.
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Execute Phase 1 semi-structured interviews outlined in [[Qualitative Research]] using [[Interview Questions]].
  - Conduct contextual inquiry sessions observing real-world patient portal and binder navigation.
- **Linked Questions:** [[Research Questions#RQ-01: Patient Access & Transfer Workflows|RQ-01]], [[Research Questions#RQ-02: Pain Points & Frictional Bottlenecks|RQ-02]]

---

### GAP-02: Multi-Jurisdictional Regulatory & Compliance Boundaries
- **Description:** Clear technical understanding is required regarding the boundary between a client-side, patient-controlled personal health application vs a HIPAA/GDPR "covered entity" or business associate.
- **Why It Matters:** Building unnecessary server-side intermediary infrastructure could inadvertently trigger stringent medical device or business associate compliance obligations, whereas a zero-knowledge local-first architecture may fall under patient-directed right-of-access exemptions.
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Review ONC 21st Century Cures Act information blocking rules and HHS guidance on third-party health apps in [[Literature Review]].
  - Document regulatory boundaries in [[Security & Privacy MOC]].
- **Linked Questions:** [[Research Questions#RQ-04: Legal, Regulatory & Compliance Landscape|RQ-04]]

---

### GAP-03: Competitive Landscape & Post-Mortem Analysis of Prior Failures
- **Description:** A detailed competitive analysis is needed examining why previous personal health records (e.g., Google Health v1, Microsoft HealthVault, various portal aggregators) struggled to retain active users, and why current solutions (Apple Health, Epic MyChart) remain siloed.
- **Why It Matters:** Prevents repeating historical UX, incentive, and distribution mistakes.
- **Risk Level:** `Medium`
- **Mitigation / Action Plan:**
  - Conduct systematic teardowns of existing PHR apps, portal export workflows, and SMART on FHIR consumer apps.
  - Compile findings into a dedicated competitive landscape note.
- **Linked Questions:** [[Research Questions#RQ-03: Competitive Landscape & Shortcomings of Existing Solutions|RQ-03]]

---

### GAP-04: Technical Interoperability & Data Ingestion Feasibility
- **Description:** Uncertainty exists around the distribution of real-world patient export formats (e.g., clean SMART on FHIR JSON vs raw CCDA XML vs flat, unstructured scanned PDF images) and the feasibility of local-device parsing/OCR.
- **Why It Matters:** Directly dictates the required ingestion architecture (local on-device OCR vs FHIR parser vs LLM extraction engine).
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Collect sample anonymized patient export files across major EHR vendor portals (Epic, Cerner, AthenaHealth).
  - Prototype local parsing benchmarks for PDF extraction and FHIR data normalization.
- **Linked Questions:** [[Research Questions#RQ-05: Healthcare Provider Ingestion & Interoperability|RQ-05]]
- **Related Notes:** [[Technical Architecture MOC]], [[Standards & Interoperability]]

---

## 📊 Gap Resolution Tracker

| Gap ID | Domain | Severity | Action Item | Target Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | User Experience | High | Conduct 8–10 Patient Interviews | 2026-Q3 | `OPEN` |
| **GAP-02** | Legal / Compliance | High | Secondary Regulatory Review | 2026-Q3 | `OPEN` |
| **GAP-03** | Market / Competition | Medium | Product Teardowns & Literature Review | 2026-Q3 | `OPEN` |
| **GAP-04** | Technical / Architecture | High | Sample Data Ingestion Prototype | 2026-Q4 | `OPEN` |

See also: [[Research MOC]], [[Research Questions]], [[Literature Review]], [[Open Questions]].
