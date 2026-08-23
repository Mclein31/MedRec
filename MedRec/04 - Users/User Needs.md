---
project: MedRec
type: concept
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - user-needs
  - requirements-baseline
  - product-discovery
  - assumptions
related:
  - "[[User Pain Points]]"
  - "[[Research Questions]]"
  - "[[Functional Requirements]]"
  - "[[Patients]]"
  - "[[User Personas]]"
---

# User Needs

This note captures the baseline user needs identified during early problem framing for [[Patients]]. 

> [!IMPORTANT]
> **Status**: All items listed below are currently **assumptions** formulated from domain observations. They must be validated, refined, or challenged through user interviews and field investigations tracked in [[Research Questions]].

## Assumed User Needs

### 1. Access Records Anytime (Assumed)
- **Assumption**: Patients need on-demand, instant access to their entire medical history from their personal devices, even when offline or outside of hospital network portals.
- **Why it matters**: Medical emergencies or spontaneous doctor visits require immediate retrieval of past treatments, allergies, and diagnostic results.
- **Traces to**: [[Functional Requirements]] (FR-002: View medical records).

### 2. Share Records Easily (Assumed)
- **Assumption**: Patients need a frictionless way to transmit specific records or summaries directly to a new physician, specialist, or family member without physical paper or cumbersome portal logins.
- **Why it matters**: Transferring care between providers currently requires repetitive paperwork, faxing, or repeated tests.
- **Traces to**: [[Functional Requirements]] (FR-003: Share medical records, FR-004: Transfer records).

### 3. Keep Records Organized (Assumed)
- **Assumption**: Patients need automatic or intuitive categorization of disparate document types (lab tests, imaging reports, prescriptions, vaccination records) rather than a chaotic folder of unindexed files.
- **Why it matters**: Disorganized files lead to missed details during consultations and user fatigue when attempting self-management.
- **Traces to**: [[Functional Requirements]] (FR-005: Search records, FR-006: Categorize records).

### 4. Maintain Privacy & Data Ownership (Assumed)
- **Assumption**: Patients want complete sovereignty and privacy over their sensitive health records, with transparent control over who can view or retain their information.
- **Why it matters**: Mistrust of third-party data monetization, insurance misuse, or unauthorized corporate access is a major deterrent to health app adoption.
- **Traces to**: [[Functional Requirements]] (FR-007: User authentication), [[Security Requirements]].

### 5. Understand Their Own Records (Assumed)
- **Assumption**: Patients need medical reports and lab results translated or contextualized into plain, comprehensible language rather than impenetrable clinical jargon.
- **Why it matters**: Raw lab values and complex terminology leave patients confused and anxious, preventing active participation in their health decisions.
- **Traces to**: Future insight/summary features in product roadmap.

## Validation Roadmap

- Cross-examine these assumed needs against real user feedback in [[Qualitative Research]].
- Pair each validated need with corresponding entries in [[User Pain Points]] and translate them into formal specifications in [[Functional Requirements]].
- Update [[User Personas]] with verified priority weightings for each need.
