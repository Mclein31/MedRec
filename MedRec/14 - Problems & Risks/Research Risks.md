---
project: MedRec
type: problem
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - risks
  - research-risks
  - methodology
  - qualitative-research
  - anticipated-risks
related:
  - "[[Problems MOC]]"
  - "[[Research MOC]]"
  - "[[Research Gaps]]"
  - "[[Interview Questions]]"
  - "[[Literature Review]]"
  - "[[Research Hypotheses]]"
---

# Research Risks

Anticipated risks, biases, and methodology constraints associated with the research and problem validation phase of **MedRec**.

---

## ⚠️ Anticipated Research Risks

### 1. Insufficient Interview Participant Sample
- **Nature**: *Anticipated Recruitment Risk*
- **Severity**: 🟡 Medium
- **Description**: Recruiting a diverse cohort of patients (especially chronic illness patients, elderly individuals, and parents) and healthcare providers (independent doctors, clinic receptionists) for qualitative interviews may be difficult as a solo researcher without institutional backing.
- **Mitigation Strategy**:
  - Leverage personal networks, chronic condition patient support forums, and local independent clinic visits &rarr; [[Interview Questions]].
  - Supplement 1-on-1 interviews with lightweight asynchronous digital surveys for quantitative validation &rarr; [[Quantitative Research]].

### 2. Research Findings Invalidating Core Assumptions
- **Nature**: *Anticipated Conceptual Risk*
- **Severity**: 🔴 High
- **Description**: Field research might reveal that patients do not care enough about record custody to take on the cognitive burden of organizing their medical files, or that doctors refuse to review patient-provided digital summaries due to liability concerns.
- **Mitigation Strategy**:
  - Treat all core premises as hypotheses to be falsified rather than facts &rarr; [[Research Hypotheses]].
  - Be prepared to pivot the product model (e.g., from full health record custodian to a streamlined "emergency summary / allergy card" tool).

### 3. Literature Review Scope Bloat
- **Nature**: *Anticipated Process Risk*
- **Severity**: 🟡 Medium
- **Description**: The academic literature on health informatics, EHR usability, and FHIR interoperability is vast (thousands of papers spanning 30+ years). Getting lost in literature review could delay practical prototyping and user discovery.
- **Mitigation Strategy**:
  - Strictly bound the literature search to 3 focal areas: (1) Patient portal drop-off rates, (2) Personal health record (PHR) barriers, and (3) Cross-clinic information transfer friction &rarr; [[Literature Review]].
  - Set a timebox for the exploratory literature synthesis before moving to wireframing.

---

## 🔗 Related Research Links
- [[Research MOC]] — Research domain master index
- [[Research Gaps]] — Unanswered gaps in existing studies
- [[Research Questions]] — Primary exploratory questions
- [[Problems MOC]] — Master problems map
