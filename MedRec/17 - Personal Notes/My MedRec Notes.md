---
project: MedRec
type: personal-note
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - personal
  - hub
  - thoughts
  - reflections
  - dev-journal
related:
  - "[[Personal Development Log]]"
  - "[[Lessons Learned]]"
  - "[[Project Reflections]]"
  - "[[Things I Need To Learn]]"
  - "[[Things I Don't Understand Yet]]"
  - "[[MedRec]]"
  - "[[MedRec Current State]]"
---

# My MedRec Notes

This is my personal notebook and thinking space for the [[MedRec]] project. It is the unpolished, stream-of-consciousness counterpart to the structured architectural and research documents in this vault.

---

## 💭 Why I Am Building MedRec

Starting this project because I believe medical records management is broken and I want to understand why — and whether I can build something that helps.

Every time I or someone in my family visits a new doctor, goes to an urgent care clinic, or needs a specialist referral, the entire process feels like stepping back thirty years in time:
- Filling out the exact same paper clipboard forms with past medical history, medication dosages, and allergies.
- Trying to remember lab results from two years ago that exist only as a faded printout in a binder or locked behind a forgotten portal password.
- Watching doctors make clinical decisions with incomplete information because the previous hospital's EHR doesn't talk to their clinic system.

The core motivation here isn't to build a massive commercial empire; it is to build a sovereign, patient-first tool that actually solves this friction for real people.

---

## 🗂️ Personal Navigation

- **[[Personal Development Log]]**: Daily dev log tracking concrete work, technical breakthroughs, and micro-milestones.
- **[[Lessons Learned]]**: Post-mortem notes on mistakes made, technical assumptions that failed, and architectural wisdom gained.
- **[[Things I Need To Learn]]**: Explicit list of knowledge gaps and skills I need to acquire (FHIR standards, qualitative research, HIPAA rules, cryptography).
- **[[Things I Don't Understand Yet]]**: Honest list of conceptual confusions, black boxes, and domain questions I haven't figured out yet.
- **[[Project Reflections]]**: Periodic retrospectives on project trajectory, motivation, energy levels, and macro-level course corrections.

---

## 🧠 Personal Working Principles for this Project

1. **Be rigorous about truth**: Don't mistake my personal assumptions for universal user truths. Always differentiate between *assumptions*, *hypotheses*, and *validated findings*.
2. **Build for the user, not for tech vanity**: Resist the urge to over-engineer complex distributed systems if a simple, robust local SQLite database solves the actual patient problem.
3. **Respect healthcare sensitivity**: Health data is deeply personal and dangerous if leaked. Treat privacy and encryption as non-negotiable fundamentals, not afterthoughts.
4. **Keep it atomic & connected**: Use this Obsidian knowledge base as an external brain. When a thought strikes, write it down, link it, and refine it.

---

## 🔗 Related Notes

- [[MedRec]] — Project root note
- [[MedRec Current State]] — Where the project stands today
- [[MedRec Vision]] — Long-term project vision
- [[Problem Space MOC]] — Detailed problem breakdown
