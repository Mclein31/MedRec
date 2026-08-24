---
project: MedRec
type: task
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - development
  - current-focus
  - active-work
  - research-phase
related:
  - "[[Next Actions]]"
  - "[[MedRec Current State]]"
  - "[[Development MOC]]"
  - "[[MedRec Roadmap]]"
  - "[[Competitive Landscape]]"
  - "[[Regulatory Landscape]]"
  - "[[Academic Literature Summary]]"
  - "[[Literature Review]]"
  - "[[Research Questions]]"
---

# Current Development

Current active focus area for **MedRec**. As a solo developer, I focus on one key milestone at a time to prevent cognitive overload and maintain momentum.

---

## 🎯 Active Phase: Phase 1 — Research & Problem Validation

I have **completed the initial landscape research pass**, producing three foundational deliverables:
1. **[[Competitive Landscape]]**: Market teardown of Apple Health, Epic MyChart, Guava Health, Fasten Health, PicnicHealth, and failure post-mortems of Microsoft HealthVault and Google Health v1.
2. **[[Regulatory Landscape]]**: Comprehensive overview of ONC 21st Century Cures Act, Information Blocking mandates, HIPAA vs FTC Health Breach Notification rules, and state privacy acts.
3. **[[Academic Literature Summary]]**: Statistical synthesis of hospital integration deficits (Holmgren et al. 2017), missing clinical info (Smith et al. 2005), 69–71% fax reliance, 8–20% Master Patient Index errors, and the 80% unstructured data challenge.

**Current Active Focus**: Analyzing competitive gaps (see [[Research Gaps#GAP-07: MedRec Product Differentiation vs Modern PHR Contenders|GAP-07]]) and finalizing MedRec's core value proposition and defensible market positioning.

**Next Immediate Focus**: Primary qualitative research planning (interview recruitment strategy) and technical deep-dive into the HL7 FHIR R4 specification and SMART on FHIR app launch workflows.

---

## 🔬 Active Streams of Work

### 1. Competitive Gaps & Value Proposition Definition
- **Focus**: Pinpointing MedRec's unique strengths against existing players like Guava (cloud-hosted subscription) and Fasten Health (self-hosted).
- **Related Notes**: [[Competitive Landscape]], [[Research Gaps]], [[MedRec Vision]], [[MedRec Goals]]
- **Current Observation**: Zero-knowledge local-first architecture + instant offline emergency summaries + friction-free OCR ingestion provides a compelling consumer angle with zero HIPAA server liability.

### 2. Primary Research Planning & Participant Recruitment
- **Focus**: Structuring the recruitment strategy for 8–10 in-depth qualitative interviews with patients managing multi-specialist care and independent clinic administrators.
- **Related Notes**: [[Qualitative Research]], [[Interview Questions]], [[Interview Notes]], [[User Personas]]

### 3. Technical Standards & FHIR R4 Deep-Dive
- **Focus**: Reviewing FHIR R4 US Core Implementation Guide (USCDI v1/v2 profiles) and SMART on FHIR OAuth2 PKCE authorization flows for direct EHR querying.
- **Related Notes**: [[Standards & Interoperability]], [[Technical Architecture MOC]], [[Regulatory Landscape]]

---

## 📌 Context & Hypotheses

> [!NOTE]
> **Working Hypothesis**: A local-first, zero-knowledge personal health record app that automatically ingests FHIR data and unstructured clinical PDFs on-device solves the privacy and fragmentation problems that caused prior PHRs to fail, without triggering HIPAA covered-entity burdens.
> 
> *Assumption*: Patients managing complex conditions value data sovereignty and complete record visibility enough to use an independent mobile/desktop vault over vendor-locked hospital portals.

---

## ⏩ Next Steps

See [[Next Actions]] for the active priority queue.
