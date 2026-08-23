---
project: MedRec
type: feature
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - feature
  - search
  - filtering
  - discovery
related:
  - "[[Digital Medical Records]]"
  - "[[Medical Record Categories]]"
  - "[[Functional Requirements]]"
  - "[[Record Viewing]]"
  - "[[Record Upload]]"
  - "[[Patients]]"
---

# Search Medical Records

## Purpose
Provides fast, multi-attribute search and filtering across all stored medical records, enabling users to locate specific consultations, diagnostic tests, prescriptions, doctor names, clinics, date ranges, and extracted text quickly.

## Problem it Solves
As patients accumulate years of medical history, finding a specific blood test from two years ago or a previous medication name becomes tedious without keyword search and structured filters.

## Target User
- [[Patients]]: Finding past prescriptions, allergy test results, or immunization dates before an appointment.
- [[Healthcare Providers]]: Searching during consultation for specific past diagnostic outcomes.

## Related Research
- *Status*: Pending research validation.
- *Hypothesis*: Users recall records by episodic cues (e.g., "that specialist I saw last summer in Manila") rather than exact clinical diagnoses or document titles.

## Requirements
- [[Functional Requirements]] — Real-time keyword search indexing titles, notes, doctor names, and clinic locations.
- Faceted filtering by:
  - Category ([[Medical Record Categories]]) — Lab tests, Prescriptions, Doctor Visits, Imaging, etc.
  - Date ranges (e.g., Last 30 days, Past year, Custom range).
  - Healthcare provider or hospital facility.
  - Attachment type (PDF vs Image).
- Search result highlighting showing matched snippet context.

## Dependencies
- [[Digital Medical Records]]: Data corpus being queried.
- [[Medical Record Categories]]: Structured facet tags for filtering.
- [[Record Viewing]]: Destination view when tapping a search result item.

## UX Considerations
- Instant search-as-you-type with debounced client requests.
- Filter chips on top of the list for single-tap filtering (e.g., [Prescriptions], [Lab Results], [2025]).
- Empty state suggestions (e.g., "Try searching by doctor name or condition") when query yields zero results.
- Recent search queries history for quick repeat lookups.

## Technical Considerations
- Client-side SQLite FTS5 (Full-Text Search) for rapid offline search on indexed metadata.
- Backend database indexing: GIN indexes / full-text search indexes in PostgreSQL or Atlas text search in MongoDB.
- Scalability: Keeping search query response times under 100ms on mobile devices.
- Future enhancement: OCR text indexing allowing search inside scanned document images.

## Status
- **Proposed** (Core Navigation & Discovery Feature)

## Open Questions
- Should OCR full-text search run on-device or server-side during the upload pipeline?
- How should medical acronyms or brand vs generic drug names be handled in search matching (e.g., searching "Paracetamol" matches "Biogesic")?
