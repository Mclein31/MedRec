---
project: MedRec
type: concept
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - development
  - moc
  - workflow
  - solo-dev
  - task-management
related:
  - "[[MedRec MOC]]"
  - "[[MedRec Dashboard]]"
  - "[[MedRec Current State]]"
  - "[[Technical Architecture]]"
  - "[[Current Development]]"
  - "[[Next Actions]]"
  - "[[Backlog]]"
  - "[[Technical Debt]]"
  - "[[Completed Work]]"
  - "[[Blocked Work]]"
---

# Development MOC

This is the development hub and workflow navigation map for **MedRec**. As a solo developer project, the tracking system is kept deliberately lightweight, minimal-overhead, and directly tied into the knowledge graph rather than bogged down by heavyweight project management tooling.

---

## 🎯 The Core Development Loop

This lightweight system is designed to immediately answer four fundamental questions at any point in time:
1. **What am I building right now?** &rarr; [[Current Development]]
2. **Why am I building it?** &rarr; [[MedRec Vision]] & [[Functional Requirements]]
3. **What is next up?** &rarr; [[Next Actions]] & [[Backlog]]
4. **What is stuck or accumulating friction?** &rarr; [[Blocked Work]] & [[Technical Debt]]

---

## 🧭 Workflow Hubs

| Status | Tracker Note | Description |
| :--- | :--- | :--- |
| 🟢 **Current Focus** | [[Current Development]] | What I am actively researching, designing, or prototyping today. |
| ➡️ **Next** | [[Next Actions]] | Immediate, bite-sized tasks queued up for the next sessions. |
| 📋 **Backlog** | [[Backlog]] | Future items grouped by area (Research, Design, Dev, Docs). |
| 🟡 **Technical Debt** | [[Technical Debt]] | Code compromises, shortcuts, and deferred refactoring items. |
| ✅ **Done** | [[Completed Work]] | Historical log of finished milestones, sprints, and tasks. |
| 🚫 **Blocked** | [[Blocked Work]] | Items halted by external dependencies, unknown answers, or blockers. |

---

## 🏗️ Architecture & Engineering Links

- **System Structure**: [[Technical Architecture]], [[System Architecture]], [[Cloud Infrastructure]]
- **Components**: [[Frontend]], [[Backend]], [[API]], [[Database]], [[File Storage]], [[Authorization]]
- **Operational**: [[Deployment]], [[Monitoring]]
- **Architectural Choices**: [[Decision Log]]
- **Risks & Uncertainties**: [[Problems MOC]], [[Technical Risks]], [[Open Questions]]

---

## 💡 Solo Dev Principles for MedRec

> [!NOTE]
> - **Keep it atomic**: Build one vertical slice or validate one assumption at a time.
> - **Document as I go**: Write architectural notes and decision logs *before* writing code.
> - **Prune aggressively**: If a feature isn't directly validating a core hypothesis or requirement, push it to [[Backlog]] or [[Ideas MOC]].
