---
project: MedRec
type: feature
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - feature
  - taxonomy
  - categorization
  - organization
related:
  - "[[Digital Medical Records]]"
  - "[[Record Upload]]"
  - "[[Search Medical Records]]"
  - "[[Functional Requirements]]"
  - "[[Record Viewing]]"
---

# Medical Record Categories

## Purpose
Establishes a standardized, intuitive classification and taxonomy system that organizes varied healthcare documents into logical clinical categories (e.g., Doctor Consultations, Lab Results, Prescriptions, Imaging & Radiology, Hospitalizations, Immunizations).

## Problem it Solves
Medical documentation is heterogeneous — an X-ray report is fundamentally different in usage and structure from a prescription or blood lab panel. Without consistent categorization, records become an unstructured digital shoebox that is painful to browse and filter.

## Target User
- [[Patients]]: Easily finding specific document types (e.g., pulling up "Prescriptions" at the pharmacy).
- [[Doctors|Healthcare Providers]]: Filtering records to their domain specialty (e.g., an orthopedist filtering directly to "Imaging & Radiology").

## Related Research
- *Status*: Pending research validation.
- *Hypothesis*: Pre-set, clinically meaningful categories with distinct iconography improve user document retrieval speed by 60% compared to freeform user tags alone.

## Requirements
- [[Functional Requirements]] — Pre-configured core categories:
  1. `Doctor Consultations` (clinical notes, referral letters)
  2. `Laboratory Results` (blood tests, urinalysis, pathology)
  3. `Prescriptions & Medications` (active prescriptions, dosage slips)
  4. `Imaging & Radiology` (X-ray, MRI, CT scans, Ultrasound reports)
  5. `Vaccinations & Immunizations` (vaccine cards, booster records)
  6. `Hospitalizations & Surgeries` (discharge summaries, operative notes)
  7. `Dental & Vision` (dental charts, eye exams)
  8. `Other / Miscellaneous`
- Support custom user tags in addition to standard system categories.
- Category-specific metadata fields (e.g., "Medication Name" & "Dosage" for Prescriptions; "Lab Name" & "Normal Range" for Lab Results).

## Dependencies
- [[Digital Medical Records]]: Core entity storing category assignments.
- [[Record Upload]]: Category assignment UI step during document ingestion.
- [[Search Medical Records]]: Category filter chips in search queries.

## UX Considerations
- Distinct visual badges and colors for each category (e.g., Prescriptions = Violet, Labs = Teal, Consultations = Blue, Imaging = Orange).
- Visual category cards on home dashboard showing document count per category.
- AI auto-categorization suggestion during upload to save user effort.

## Technical Considerations
- Category enum / lookup table with localized display names and icon identifiers.
- Flexible schema capable of extending category-specific structured metadata without database migrations for every category type.
- High-efficiency indexing on `category_id` in database queries for fast filtered views.

## Status
- **Proposed** (Core Domain Architecture)

## Open Questions
- Should users be allowed to create arbitrary new categories, or should categories remain system-standardized with custom tags for user flexibility?
- How should multi-topic documents (e.g., a hospital discharge summary containing both lab results and prescriptions) be categorized?
