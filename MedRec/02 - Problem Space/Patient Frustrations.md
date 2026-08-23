---
project: MedRec
type: problem
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - problem-space
  - user-pain-points
  - patient-experience
  - qualitative
related:
  - "[[Medical Record Portability]]"
  - "[[Lost Medical Records]]"
  - "[[Incomplete Medical History]]"
  - "[[Delayed Healthcare Access]]"
  - "[[User Pain Points]]"
  - "[[Research Questions]]"
  - "[[Qualitative Research]]"
  - "[[Interview Notes]]"
---

# Patient Frustrations

> [!CAUTION]
> **Notice on Problem Assumptions**
> Every item documented in this note reflects my initial assumptions and developer hypotheses regarding patient pain points. None of these items are considered established facts until verified with empirical evidence.
> 
> **Validation Rule**: Every frustration point below is explicitly tagged:
> *Assumed — needs validation through [[Qualitative Research]] and [[Interview Notes]]*.

---

## Assumed Core Frustrations

### 1. Difficulty Accessing Complete Records
- **Hypothesis**: Patients face friction trying to access their full diagnostic reports, imaging scans, and doctor's notes across fragmented clinic portals. They frequently receive incomplete summaries or flat PDFs instead of usable structured data.
- **Status**: *Assumed — needs validation through [[Qualitative Research]] and [[Interview Notes]]*

### 2. Having to Repeatedly Re-Explain Medical History
- **Hypothesis**: At every new specialist appointment, hospital admission, or clinic visit, patients (especially those managing chronic or complex conditions) are forced to verbally recount their entire clinical history, drug allergies, past surgeries, and ongoing medications from memory.
- **Status**: *Assumed — needs validation through [[Qualitative Research]] and [[Interview Notes]]*

### 3. Records Getting Lost or Scattered Across Systems
- **Hypothesis**: Physical folders, faxed documents, and burnt CDs are routinely misplaced or unindexed between referrals, leaving patients feeling disorganized and anxious about their medical continuity.
- **Status**: *Assumed — needs validation through [[Qualitative Research]] and [[Interview Notes]]*

### 4. Excessive Transfer Latency and Bureaucratic Delays
- **Hypothesis**: Requesting records from previous hospitals takes days or weeks, requiring formal release forms, administrative follow-up calls, and sometimes per-page copying fees, which stall active care decisions.
- **Status**: *Assumed — needs validation through [[Qualitative Research]] and [[Interview Notes]]*

### 5. Fragmented Portal Sprawl
- **Hypothesis**: Patients managing care across multiple health networks end up with 4–8 disparate portal accounts with disconnected logins, disparate interfaces, and no central view of their health trajectory.
- **Status**: *Assumed — needs validation through [[Qualitative Research]] and [[Interview Notes]]*

---

## Downstream Impacts on Patient Journey

```
[Fragmented Portals & Manual Paperwork]
                   │
                   ▼
       [Patient Frustration & Fatigue]
        ├──> [[Lost Medical Records]]
        ├──> [[Incomplete Medical History]]
        └──> [[Delayed Healthcare Access]]
```

- These friction points undermine overall [[Medical Record Portability]].
- They compound into broader [[User Pain Points]] that directly inform the user experience requirements for MedRec.

---

## Validation Roadmap

1. **User Discovery Interviews**: Conduct structured interviews with chronic illness patients, parents, and caregivers. Log findings in [[Interview Notes]].
2. **Qualitative Synthesis**: Group pain points into verified user personas and journey maps in [[Qualitative Research]].
3. **Open Hypotheses**: Tracked in [[Research Questions]].
