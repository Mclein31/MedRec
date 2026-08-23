---
project: MedRec
type: concept
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - moc
  - ideas
  - pipeline
  - brainstorming
  - innovation
related:
  - "[[Future Ideas]]"
  - "[[Experimental Ideas]]"
  - "[[Rejected Ideas]]"
  - "[[MedRec MOC]]"
  - "[[MedRec Dashboard]]"
  - "[[Research Hypotheses]]"
  - "[[Requirements MOC]]"
---

# Ideas Map of Content (MOC)

This note serves as the central hub for capturing, evaluating, and triaging creative concepts, potential feature expansions, and technical experiments for [[MedRec]].

As a solo developer, it is easy to suffer from feature creep or get distracted by shiny technical possibilities. This space provides an intentional funnel to park ideas without letting them derail current development priorities.

---

## 🔄 The Ideas Pipeline

Ideas do **not** automatically become features. Every candidate concept must earn its way through an epistemic validation pipeline:

```
┌────────────┐     ┌──────────────┐     ┌────────────────────────┐     ┌─────────────┐
│    Idea    │ ──► │  Hypothesis  │ ──► │ Validated Requirement  │ ──► │   Feature   │
│ (Raw Park) │     │ (Testable Q) │     │   (Proven User Need)   │     │ (Committed) │
└────────────┘     └──────────────┘     └────────────────────────┘     └─────────────┘
       │                                             │
       ▼                                             ▼
┌──────────────┐                             ┌──────────────┐
│ Experimental │                             │   Rejected   │
│ (Speculative)│                             │  (Documented)│
└──────────────┘                             └──────────────┘
```

1. **Idea Stage** ([[Future Ideas]], [[Experimental Ideas]]): An unvalidated notion or "what if" scenario. Parked here to keep the mind clear.
2. **Hypothesis Stage** ([[Research Hypotheses]]): The idea is framed as a testable proposition with defined falsification criteria.
3. **Validated Requirement** ([[Requirements MOC]]): Empirical research or user feedback proves a real pain point that justifies building a solution.
4. **Feature Execution** ([[Features MOC]]): The requirement is scoped into concrete technical specifications and assigned to a roadmap sprint.

---

## 🗂️ Idea Categories & Sub-Maps

- **[[Future Ideas]]**: Pragmatic, high-potential capabilities that represent natural extensions of the core app once foundational portability is solid (e.g., AI summaries, wearable sync, dependent profiles).
- **[[Experimental Ideas]]**: Speculative, frontier, or high-risk concepts that explore non-traditional architectures (e.g., blockchain attestation, local peer-to-peer mesh sync, zero-knowledge proofs).
- **[[Rejected Ideas]]**: A graveyard of ideas that were investigated and intentionally dropped. Capturing the rationale prevents re-litigating dead ends.

---

## ⚖️ Evaluation Criteria

Before promoting an idea into the research or requirements phase, I evaluate it against four core tenets:

1. **Patient Sovereignty**: Does this reinforce user control, or does it re-centralize data?
2. **Privacy & Zero-Knowledge**: Can this be built without exposing unencrypted PHI to third-party services?
3. **Solo Maintainability**: Is the operational and architectural complexity feasible for a solo builder?
4. **True User Value**: Does this alleviate an acute pain point identified in [[User Pain Points]], or is it tech for tech's sake?

---

## 🔗 Related Maps & Dashboards

- [[MedRec Dashboard]] — Top-level navigation
- [[MedRec MOC]] — Master project index
- [[Research Hypotheses]] — Formal testable statements
- [[Research MOC]] — Research methodologies and literature
- [[Product Design MOC]] — UI/UX explorations
