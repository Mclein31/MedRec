---
project: MedRec
type: research
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - research
  - hypotheses
  - validation
  - medrec
related:
  - "[[Research Questions]]"
  - "[[Patient Frustrations]]"
  - "[[Medical Record Portability]]"
  - "[[Research Findings]]"
  - "[[Research MOC]]"
---

# Research Hypotheses

This note formalizes the core testable hypotheses for the [[MedRec]] project. Hypotheses represent informed assumptions about user behavior, systemic inefficiencies, and product value propositions that require empirical validation.

> [!IMPORTANT]
> **Epistemic Discipline:** All hypotheses listed below are unverified starting positions. They MUST be rigorously tested through [[Qualitative Research]], [[Quantitative Research]], and [[Literature Review]] before being promoted to [[Research Findings]].

---

## 🧪 Hypotheses Register

### H1: Patient Frustration with Inter-Provider Record Transfers
- **Hypothesis:** Patients frequently experience significant administrative friction, delays, anxiety, and frustration when attempting to transfer or share medical records between unaffiliated healthcare providers.
- **Current Status:** `UNTESTED` 🟡
- **Underlying Assumption:** The lack of unified health record sharing causes measurable emotional and logistical distress for patients, especially those with multi-specialist care plans.
- **Validation Criteria:**
  - $>75\%$ of interviewed patients who have switched providers report friction, delays, or manual effort.
  - Observed emotional markers (stress, resignation, anger) during user interviews when discussing past transfer attempts.
- **Testing Approach:** User interviews using [[Interview Questions]], patient survey in [[Quantitative Research]].
- **Mapped Research Question:** [[Research Questions#RQ-02: Pain Points & Frictional Bottlenecks|RQ-02]]
- **Related Topics:** [[Patient Frustrations]], [[Medical Record Portability]]

---

### H2: Persistence of Manual and Physical Transfer Workflows
- **Hypothesis:** Despite modern EHR widespread adoption, the vast majority of patient-initiated cross-organization record transfers still rely on legacy manual, physical, or semi-digital workflows (e.g., physical paper printouts, fax machines, unindexed PDFs, optical discs).
- **Current Status:** `UNTESTED` 🟡
- **Underlying Assumption:** EHR portal interoperability is largely institutional (within single health systems) rather than cross-system or patient-empowered.
- **Validation Criteria:**
  - Data points from [[Literature Review]] and interviews indicating $>60\%$ of multi-system transfers involve physical paper, fax, or manual scanning.
- **Testing Approach:** Process mapping in [[Qualitative Research]], literature statistics on fax usage in healthcare.
- **Mapped Research Question:** [[Research Questions#RQ-01: Patient Access & Transfer Workflows|RQ-01]]
- **Related Topics:** [[Healthcare Fragmentation]], [[Legacy Systems]]

---

### H3: Value of Patient-Controlled Digital Portability
- **Hypothesis:** Providing patients with a self-sovereign, patient-controlled digital record system reduces the friction of sharing medical histories and increases patient self-efficacy in clinical consultations.
- **Current Status:** `UNTESTED` 🟡
- **Underlying Assumption:** Patients desire active ownership of their longitudinal health history and will actively use a dedicated local/personal tool if it simplifies clinical intake.
- **Validation Criteria:**
  - Target users express strong intent to use a patient-held wallet/vault during prototype testing.
  - Reduction in time spent preparing for new specialist visits during usability evaluations.
- **Testing Approach:** Usability testing of prototype workflows, concept testing interviews.
- **Mapped Research Question:** [[Research Questions#RQ-03: Competitive Landscape & Shortcomings of Existing Solutions|RQ-03]]
- **Related Topics:** [[Patient Self-Efficacy]], [[User Needs]]

---

### H4: Privacy, Security & Local Ownership Prioritization
- **Hypothesis:** Patients are deeply hesitant to upload sensitive longitudinal health data to centralized third-party commercial clouds, but are receptive to local-first, zero-knowledge, encrypted storage models where they hold the keys.
- **Current Status:** `UNTESTED` 🟡
- **Underlying Assumption:** Privacy skepticism is a primary barrier to health app adoption; local-first architecture provides a distinct trust advantage.
- **Validation Criteria:**
  - User feedback in [[Interview Notes]] highlights data privacy as a top decision factor when evaluating health tech.
  - Positive user sentiment toward offline-first / device-stored records without central database tracking.
- **Testing Approach:** Privacy-focused interview prompts in [[Interview Questions]], privacy trade-off survey questions.
- **Mapped Research Question:** [[Research Questions#RQ-04: Legal, Regulatory & Compliance Landscape|RQ-04]]
- **Related Topics:** [[Security & Privacy MOC]], [[Local-First Architecture]]

---

### H5: Clinician Receptivity to Structured Summaries vs Document Dumps
- **Hypothesis:** Healthcare providers and specialists are significantly more receptive to reviewing concise, timeline-based structured health summaries than unorganized, multi-page raw PDF dumps.
- **Current Status:** `UNTESTED` 🟡
- **Underlying Assumption:** Clinicians suffer from cognitive overload and time scarcity; high-density, legible summaries save clinical time during first-visit intake.
- **Validation Criteria:**
  - Clinician feedback confirms preference for chronological summaries with linked source verification.
- **Testing Approach:** Clinician stakeholder interviews, intake workflow analysis.
- **Mapped Research Question:** [[Research Questions#RQ-05: Healthcare Provider Ingestion & Interoperability|RQ-05]]
- **Related Topics:** [[Provider Workflows]], [[Clinical Summaries]]

---

## 📊 Status Tracking Lifecycle

| Hypothesis ID | Title | Status | Evidence Level | Target Date |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | Patient Transfer Frustration | `UNTESTED` | None (Pending Interviews) | 2026-Q3 |
| **H2** | Manual Transfer Dependency | `UNTESTED` | None (Pending Literature) | 2026-Q3 |
| **H3** | Patient-Centric Portability Value | `UNTESTED` | None (Pending Prototyping) | 2026-Q4 |
| **H4** | Local Ownership & Privacy Demand | `UNTESTED` | None (Pending Research) | 2026-Q3 |
| **H5** | Clinician Structured Summary Value | `UNTESTED` | None (Pending Clinician Input) | 2026-Q4 |

See also: [[Research Questions]], [[Research Findings]], [[Research Themes]], [[Research Insights]].
