---
project: MedRec
type: research
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - research
  - qualitative
  - methodology
  - user-interviews
  - medrec
related:
  - "[[Interview Questions]]"
  - "[[Interview Notes]]"
  - "[[Research Findings]]"
  - "[[Research MOC]]"
---

# Qualitative Research

This document outlines the qualitative research methodology for the [[MedRec]] project. Qualitative discovery is designed to uncover the lived experiences, emotional frictions, mental models, and unarticulated behaviors of patients, caregivers, and clinicians when dealing with medical records.

---

## 🎯 Research Objectives

1. **Understand Lived Workflows:** Map end-to-end how patients currently collect, organize, store, and transport health documents.
2. **Expose Hidden Bottlenecks:** Identify moments of confusion, breakdown, delay, and emotional strain in record handoffs.
3. **Assess Mental Models:** Unpack how patients think about data privacy, medical ownership, and cloud vs local storage.
4. **Evaluate Provider Constraints:** Understand the operational realities of clinic front-desk staff and clinicians receiving outside records.

---

## 🛠️ Qualitative Methods

### 1. Semi-Structured In-Depth Interviews (Primary Method)
- **Format:** 30–45 minute remote or in-person 1-on-1 conversations.
- **Instrument:** [[Interview Questions]] guide (open-ended with exploratory probing).
- **Output:** Verbatim transcripts, timestamped notes in [[Interview Notes]], and extracted observations.

### 2. Contextual Inquiries & Journey Mapping
- **Format:** Observing participants as they interact with their current record storage systems (e.g., navigating patient portals, searching through a home paper filing cabinet, reviewing past lab PDFs).
- **Focus:** Measuring friction points, search latency, and cognitive load in real-world record retrieval tasks.

### 3. Critical Incident Case Studies
- **Format:** Detailed retrospective walkthroughs of specific high-stakes events (e.g., emergency room visit with an unknown medical history, moving to a new state/city, transitioning to oncology or specialist care).
- **Focus:** Pinpointing catastrophic failures in data availability and their direct impact on care delivery.

---

## 👥 Target Participant Cohorts

| Cohort | Profile Description | Key Focus Area | Target N |
| :--- | :--- | :--- | :--- |
| **Cohort A: Chronic Care Patients** | Patients managing 2+ chronic conditions visiting 3+ specialists annually | Record volume, continuity of care, medication reconciliation | 4–6 |
| **Cohort B: Family Caregivers** | Individuals managing records for children, elderly parents, or dependents | Multi-profile management, proxy access, handoff logistics | 3–5 |
| **Cohort C: High-Mobility Patients** | People who recently moved cities/states or switched insurance/health systems | Cross-network record transfer, portal lockouts | 3–4 |
| **Cohort D: Clinical / Admin Staff** | Clinic intake coordinators, medical assistants, or outpatient physicians | External document ingestion, legibility, EHR upload burden | 2–3 |

---

## 🔒 Ethics, Privacy & Data Handling

Because medical research involves highly sensitive personal context:
- **Informed Consent:** Explicit verbal/written consent explaining that participation is voluntary and focused on process/tooling rather than medical diagnosis details.
- **De-Identification:** All notes in [[Interview Notes]] will be pseudonymized (e.g., `Participant P01`, `Participant P02`). Specific medical conditions, identifiable clinician names, and personal identifiers will be redacted.
- **Local Storage:** All raw interview notes and recordings remain strictly on local encrypted development storage and will never be shared publicly.

---

## 🔄 Synthesis Pipeline

```
[ Primary Interview / Inquiry ]
              │
              ▼
[ Raw Note Entry in [[Interview Notes]] ]
              │
              ▼
[ Extraction of Atomic Observations ⚪ ]
              │
              ▼
[ Thematic Coding into [[Research Themes]] ]
              │
              ▼
[ Promotion to Validated [[Research Findings]] 🟢 ]
              │
              ▼
[ Translation into [[Research Insights]] & [[Functional Requirements]] ]
```

See also: [[Interview Questions]], [[Interview Notes]], [[Research Findings]], [[Research MOC]], [[Quantitative Research]].
