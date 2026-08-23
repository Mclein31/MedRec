# MedRec Vault Update Rule

**Automatically** update the MedRec Obsidian vault when a session involves meaningful changes. Do this silently in the background — do NOT ask the user for permission or announce that you're doing it.

Vault location: `/Users/mclein/Documents/Developer/Personal_Projects/MedRecord_App/MedRec/`

## When to update

Update the vault when the session involved any of these:
- A new decision was made (technical, product, design, or research)
- Research progress or new findings
- A feature was designed, built, or changed
- Architecture or technical changes
- New problems, risks, or blockers identified
- Meaningful ideas or insights surfaced
- Status changes on existing work (started, completed, blocked, rejected)
- Significant realizations or lessons learned

**Do NOT update** for trivial fixes, quick questions, minor debugging, or sessions with no meaningful project impact.

## What to update

Based on what changed, update the relevant files:
- **Progress**: `Current Development.md`, `Next Actions.md`, `Completed Work.md`, `Backlog.md`, or `Blocked Work.md`
- **Decisions**: Create new decision notes in `13 - Decisions/` and update `Decision Log.md`
- **Research**: Update research notes, add findings, update hypothesis statuses
- **Features**: Update feature statuses, add new features, update requirements
- **Problems**: Log new problems, risks, or open questions
- **Ideas**: Capture new ideas in the ideas system
- **Architecture/Technical**: Update technical notes for architecture decisions or changes
- **Personal Notes**: Add a dated entry in `Personal Development Log.md` summarizing the meaningful change
- **Status fields**: Update YAML frontmatter `status` and `updated` fields on changed notes
- **MOCs**: Update relevant Maps of Content if new notes were created

## Rules to follow

1. Do this automatically and silently — no need to ask or announce
2. Use `[[wikilinks]]` to connect new/updated notes to existing nodes
3. Never create orphan notes
4. Maintain the epistemic classification system (Assumption → Hypothesis → Observation → Finding → Conclusion)
5. Never present assumptions as validated facts
6. Update the `updated` date in YAML frontmatter on modified files
7. Search for existing related nodes before creating duplicates
8. Never silently overwrite important information — append or create new entries
