---
project: MedRec
type: decision
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - decisions
  - adr
  - architecture
  - decision-log
  - index
related:
  - "[[MedRec Dashboard]]"
  - "[[MedRec MOC]]"
  - "[[Design Decisions]]"
  - "[[Technical Architecture]]"
  - "[[Decision - Database Choice]]"
  - "[[Decision - Frontend Technology]]"
  - "[[Decision - Backend Technology]]"
  - "[[Decision - API Style]]"
---

# Decision Log

Master registry of Architectural Decision Records (ADRs) and major product design choices for **MedRec**. Documenting decisions explicitly prevents circular thinking, preserves rationale for technical trade-offs, and keeps the solo development process disciplined.

---

## 🧭 Active & Proposed Decisions

| Decision Title | Status | Date | Primary Area | Key Focus |
| :--- | :--- | :--- | :--- | :--- |
| [[Decision - Database Choice]] | 🟡 Proposed (Open) | 2026-08-24 | Data Storage | Offline-first local DB vs backend relational DB |
| [[Decision - Frontend Technology]] | 🟡 Proposed (Open) | 2026-08-24 | Mobile / UI | Cross-platform (React Native/Flutter) vs Native |
| [[Decision - Backend Technology]] | 🟡 Proposed (Open) | 2026-08-24 | Server / API | Lightweight backend runtime (FastAPI vs Go vs Node.js) |
| [[Decision - API Style]] | 🟡 Proposed (Open) | 2026-08-24 | Networking | REST vs GraphQL vs tRPC for client-server sync |

---

## 📝 ADR Standard Template

Each individual decision note in this folder adheres to the following structured format:

```markdown
# Decision - [Topic Title]

## 1. Decision Status
- **Status**: [Proposed | Accepted | Rejected | Superseded]
- **Date**: [YYYY-MM-DD]
- **Decider**: Solo Developer (Personal Project)

## 2. Context & Problem Statement
[What problem or constraint prompted this decision? What are the specific requirements?]

## 3. Options Considered
- **Option 1: [Name]** — Pros & Cons
- **Option 2: [Name]** — Pros & Cons
- **Option 3: [Name]** — Pros & Cons

## 4. Decision Made & Rationale
[Which option was chosen (or recommended) and why?]

## 5. Consequences & Trade-offs
- **Positive Consequences**: [What becomes easier or faster?]
- **Negative Consequences / Risks**: [What new friction or limits are introduced?]

## 6. Related Nodes
- [[Technical Architecture]], [[System Architecture]], etc.
```

---

## 🎯 Decision Criteria for MedRec

When evaluating options across all ADRs, I evaluate against four primary pillars:
1. **Patient Privacy & Security First**: Zero-knowledge capability and client-side encryption support.
2. **Offline Resilience**: App must function when patients are in hospital basements or areas with poor cellular service.
3. **Solo Maintainability**: Minimal operational overhead, clean tooling, low boiler-plate, high developer velocity.
4. **Data Portability**: Clean standard exports (JSON/FHIR/PDF) without proprietary vendor lock-in.
