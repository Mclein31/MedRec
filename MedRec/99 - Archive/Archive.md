---
project: MedRec
type: concept
status: archived
created: 2026-08-24
updated: 2026-08-24
tags:
  - archive
  - index
  - history
  - vault-maintenance
related:
  - "[[MedRec MOC]]"
  - "[[MedRec Dashboard]]"
  - "[[Rejected Ideas]]"
---

# Archive

This folder contains archived notes that are no longer actively relevant but preserved for reference. Notes are moved here rather than deleted to maintain the knowledge graph's history.

---

## 🏛️ Why Archive Instead of Delete?

In a personal knowledge base and knowledge graph:
1. **Preserving Graph Integrity**: Deleting notes creates broken `[[wikilinks]]` across historical research, decisions, and development logs.
2. **Context Continuity**: Understanding *why* a previous architecture, draft requirement, or discarded plan was superseded is essential context when revisiting decisions months later.
3. **Traceability**: Academic research and software evolution require an immutable trail of intellectual progression.

---

## 📋 Archiving Guidelines

When moving a note into `99 - Archive/`:
- Update the note's YAML frontmatter: set `status: archived` and update the `updated` date.
- Add an archival notice at the top of the note with the date and reason for archiving, along with a link to any replacement or superseding note.
- Verify that active MOCs (e.g., [[MedRec MOC]], [[Features MOC]]) are updated so they do not point to archived material as active work.

---

## 🔗 Related Notes

- [[MedRec MOC]] — Master Map of Content
- [[MedRec Dashboard]] — Main project dashboard
- [[Rejected Ideas]] — Triage of dismissed concepts
