---
project: MedRec
type: requirement
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - user-stories
  - requirements
  - agile-spec
  - backlog
related:
  - "[[User Needs]]"
  - "[[Functional Requirements]]"
  - "[[User Personas]]"
  - "[[Features MOC]]"
---

# User Stories

This document defines the user story format and maintains the initial backlog of draft user stories for MedRec. 

Each user story expresses a discrete unit of user value, structured according to user intent, action, and desired outcome, traceable back to [[User Needs]] and forward to [[Functional Requirements]].

## Story Standard Structure

```markdown
### US-[ID]: [Story Title]
- **Story**: As a [specific user/persona], I want to [perform an action] so that [realize a concrete benefit].
- **Priority**: Must-Have | Should-Have | Could-Have | Won't-Have (MoSCoW)
- **Status**: Draft | Validated | In-Progress | Completed
- **Acceptance Criteria**:
  - [ ] Given [precondition], when [action], then [outcome].
- **Traces**: Relates to [[Functional Requirements]] (FR-XXX) and [[Features MOC]].
```

---

## Initial Draft Stories (Proposed)

> [!NOTE]
> **Status**: The stories below are marked as **DRAFT / PROPOSED**. They represent initial functional hypotheses to guide early prototyping.

### US-001: Centralized Health Timeline
- **Story**: *As a patient*, I want to view all my medical records in one place so that I have a complete and continuous health picture across all past providers.
- **Priority**: Must-Have
- **Status**: DRAFT
- **Acceptance Criteria**:
  - [ ] Given an authenticated patient with uploaded records, when they open the main timeline, then records are presented in chronological order with date, provider, and document category clearly displayed.
- **Traces**: [[Functional Requirements]] (FR-002: View medical records), [[User Needs]].

### US-002: Selective Doctor Sharing
- **Story**: *As a patient*, I want to share specific records or a filtered summary with a new doctor so that they have my relevant medical history without having to sift through unrelated documents.
- **Priority**: Must-Have
- **Status**: DRAFT
- **Acceptance Criteria**:
  - [ ] Given a patient preparing for a specialist visit, when they select a subset of records and generate a secure export/link, then only the selected records are accessible to the recipient.
- **Traces**: [[Functional Requirements]] (FR-003: Share medical records, FR-004: Transfer records), [[User Needs]].

### US-003: Granular Privacy & Access Control
- **Story**: *As a patient*, I want to control who sees my records and revoke access at any time so that my sensitive medical privacy is strictly protected.
- **Priority**: Must-Have
- **Status**: DRAFT
- **Acceptance Criteria**:
  - [ ] Given an active shared link or permission grant, when the patient taps "Revoke Access", then the external link immediately becomes invalid and inaccessible.
- **Traces**: [[Functional Requirements]] (FR-007: User authentication), [[Security Requirements]], [[User Needs]].

---

## Next Steps

- Expand the story backlog as qualitative insights emerge from [[User Personas]] and user interviews.
- Define detailed acceptance criteria and edge cases for each story before development sprints.
- Map stories directly to technical implementation tasks in [[Features MOC]].
