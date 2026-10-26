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
  - "[[Competitive Landscape]]"
  - "[[Regulatory Landscape]]"
  - "[[Academic Literature Summary]]"
  - "[[Open Questions]]"
---

# Research Gaps

This document identifies known blind spots, unverified domains, and knowledge deficits across the [[MedRec]] project. These gaps represent high-priority areas where insufficient empirical data, strategic clarity, or technical understanding currently exists, posing risks to product-market fit or technical feasibility.

---

## 🧭 Active & Evolving Research Gaps

### GAP-01: Primary Patient Experience & Workflow Realities
- **Description:** While secondary reports document broad patient dissatisfaction, I lack direct, qualitative primary observation of how patients physically organize, store, scan, and retrieve records across multiple specialists.
- **Why It Matters:** Without grounded primary data, product design risks solving theoretical problems rather than practical, daily usability blockers.
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Execute Phase 1 semi-structured interviews outlined in [[Qualitative Research]] using [[Interview Questions]].
  - Conduct contextual inquiry sessions observing real-world patient portal and binder navigation.
- **Linked Questions:** [[Research Questions#RQ-01: Patient Access & Transfer Workflows|RQ-01]], [[Research Questions#RQ-02: Pain Points & Frictional Bottlenecks|RQ-02]]
- **Status:** `OPEN`

---

### GAP-02: Multi-Jurisdictional Regulatory & Compliance Boundaries
- **Description:** Clear technical understanding is required regarding the boundary between a client-side, patient-controlled personal health application vs a HIPAA/GDPR "covered entity" or business associate.
- **Current State:** *Partially Addressed* — Completed initial secondary analysis in [[Regulatory Landscape]]. Direct-to-consumer patient-managed apps are outside HIPAA covered-entity jurisdiction but fall under the FTC Health Breach Notification Rule, FTC Act Section 5, and state laws (e.g. Washington My Health My Data Act, California CMIA/CCPA).
- **Why It Matters:** Building unnecessary server-side intermediary infrastructure could inadvertently trigger stringent medical device or business associate compliance obligations, whereas a zero-knowledge local-first architecture falls under patient-directed right-of-access exemptions.
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Review ONC 21st Century Cures Act information blocking rules and HHS guidance in [[Regulatory Landscape]].
  - Seek informal or formal legal review on FTC compliance and terms of service before public beta release.
  - Document zero-knowledge privacy architecture in [[Security & Privacy MOC]].
- **Linked Questions:** [[Research Questions#RQ-04: Legal, Regulatory & Compliance Landscape|RQ-04]]
- **Status:** `PARTIALLY RESOLVED (Pending Legal Review)`

---

### GAP-03: Competitive Landscape & Post-Mortem Analysis of Prior Failures
- **Description:** A detailed competitive analysis is needed examining why previous personal health records (e.g., Google Health v1, Microsoft HealthVault, various portal aggregators) struggled to retain active users, and why current solutions (Apple Health, Epic MyChart) remain siloed.
- **Current State:** *Addressed & Synthesized* — Comprehensive competitive analysis completed in [[Competitive Landscape]]. Key finding: prior PHRs failed due to manual data entry burden, absence of automated sync, and lack of offline portability.
- **Why It Matters:** Prevents repeating historical UX, incentive, and distribution mistakes.
- **Risk Level:** `Medium`
- **Mitigation / Action Plan:**
  - Documented findings in [[Competitive Landscape]].
  - Transition findings into concrete differentiation strategies (see [[#GAP-07: MedRec Product Differentiation vs Modern PHR Contenders|GAP-07]]).
- **Linked Questions:** [[Research Questions#RQ-03: Competitive Landscape & Shortcomings of Existing Solutions|RQ-03]]
- **Status:** `RESOLVED`

---

### GAP-04: Technical Interoperability & Data Ingestion Feasibility
- **Description:** Uncertainty exists around the distribution of real-world patient export formats (clean SMART on FHIR JSON vs raw CCDA XML vs flat, unstructured scanned PDF images) and the feasibility of local-device parsing.
- **Why It Matters:** Directly dictates the required ingestion architecture (local on-device OCR vs FHIR parser vs LLM extraction engine).
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Collect sample anonymized patient export files across major EHR vendor portals (Epic, Cerner, AthenaHealth).
  - Prototype local parsing benchmarks for PDF extraction and FHIR data normalization.
- **Linked Questions:** [[Research Questions#RQ-05: Healthcare Provider Ingestion & Interoperability|RQ-05]]
- **Related Notes:** [[Technical Architecture|Technical Architecture MOC]], [[Regulatory Landscape|Standards & Interoperability]]
- **Status:** `OPEN`

---

### GAP-05: Unstructured Data Handling (The 80% Problem)
- **Description:** Academic literature (Murdoch & Detsky, Kong et al., documented in [[Academic Literature Summary]]) confirms that ~80% of clinical healthcare data resides in unstructured narrative notes, scanned PDF lab reports, imaging narratives, and discharge paperwork. Structured FHIR APIs only cover a portion of a patient's full clinical picture.
- **Why It Matters:** If MedRec only parses structured FHIR resources, it misses 80% of critical clinical history. If it attempts cloud OCR/LLM parsing, it introduces privacy risks, high infrastructure costs, and HIPAA liabilities.
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Prototype on-device OCR and local embedding/indexing pipelines (Apple Vision / CoreML / local models) to process unstructured PDFs without sending medical records to cloud servers.
  - Benchmark extraction accuracy on messy, multi-column hospital discharge paperwork.
- **Linked Questions:** [[Research Questions#RQ-05: Healthcare Provider Ingestion & Interoperability|RQ-05]], [[Literature Review]]
- **Status:** `OPEN (New)`

---

### GAP-06: Patient Identity Resolution Across Disparate Systems
- **Description:** Master Patient Index (MPI) error rates range from 8% to 20% across health systems (AHIMA, documented in [[Academic Literature Summary]]). When a patient imports records from multiple distinct hospital portals (e.g. Epic at Hospital A, Cerner at Clinic B, Quest Diagnostics PDFs), record deduplication, conflicting medication lists, and demographic mismatches (e.g., name changes, typo in DOB) occur frequently.
- **Why It Matters:** Automated programmatic merging of medical records could merge incompatible records or create duplicate conflicting entries.
- **Risk Level:** `Medium-High`
- **Mitigation / Action Plan:**
  - Establish a patient-mediated resolution workflow: MedRec identifies potential matches and presents explicit reconciliation prompts to the patient rather than performing opaque, destructive automatic merges.
  - Define deterministic vs probabilistic matching rules in [[Functional Requirements]].
- **Linked Questions:** [[Research Questions#RQ-01: Patient Access & Transfer Workflows|RQ-01]], [[Literature Review]]
- **Status:** `OPEN (New)`

---

### GAP-07: MedRec Product Differentiation vs Modern PHR Contenders
- **Description:** While early PHRs failed, modern apps like Guava Health (cloud-synced web/mobile app), Fasten Health (open-source self-hosted EHR aggregator), and PicnicHealth (concierge record retrieval monetized via clinical research) currently serve the market (see [[Competitive Landscape]]). I need crystal-clear positioning on what makes MedRec distinct and defensible as a solo developer project.
- **Why It Matters:** Building a generic clone of Guava without Guava's venture backing will fail. MedRec must lean into unique structural strengths (e.g., 100% sovereign local-first privacy, zero subscription lock-in for core storage, emergency offline access, instant point-of-care clinician PDF generation).
- **Risk Level:** `High`
- **Mitigation / Action Plan:**
  - Synthesize differentiation matrix in [[Competitive Landscape]].
  - Validate patient resonance with zero-knowledge/local-first principles during qualitative interviews.
  - Define clear Value Proposition in [[MedRec Vision]] and [[MedRec Goals]].
- **Linked Questions:** [[Research Questions#RQ-03: Competitive Landscape & Shortcomings of Existing Solutions|RQ-03]]
- **Status:** `OPEN (New)`

---

## 📊 Gap Resolution Tracker

| Gap ID | Domain | Severity | Action Item | Target Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | User Experience | High | Conduct 8–10 Patient Interviews | 2026-Q3 | `OPEN` |
| **GAP-02** | Legal / Compliance | High | Secondary Regulatory Review completed; Legal sanity check needed | 2026-Q3 | `PARTIALLY RESOLVED` |
| **GAP-03** | Market / Competition | Medium | Product Teardowns & Literature Review completed in [[Competitive Landscape]] | 2026-Q3 | `RESOLVED` |
| **GAP-04** | Technical / Architecture | High | Sample Data Ingestion Prototype | 2026-Q4 | `OPEN` |
| **GAP-05** | Data Processing / OCR | High | Local-first PDF/OCR Extraction Benchmarks (80% unstructured problem) | 2026-Q4 | `OPEN` |
| **GAP-06** | Data Integrity / Identity | Medium-High | Patient-mediated Deduplication & Identity Flow (8–20% MPI errors) | 2026-Q4 | `OPEN` |
| **GAP-07** | Product Strategy | High | Define Clear USP & Positioning Matrix vs Guava/Fasten/PicnicHealth | 2026-Q3 | `OPEN` |

See also: [[Research MOC]], [[Research Questions]], [[Literature Review]], [[Competitive Landscape]], [[Regulatory Landscape]], [[Academic Literature Summary]], [[Open Questions]].
