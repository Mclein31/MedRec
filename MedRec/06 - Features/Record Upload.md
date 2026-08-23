---
project: MedRec
type: feature
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - feature
  - upload
  - storage
related:
  - "[[Digital Medical Records]]"
  - "[[File Storage]]"
  - "[[Medical Record Categories]]"
  - "[[Functional Requirements]]"
  - "[[Medical Records]]"
  - "[[Patients]]"
---

# Record Upload

## Purpose
Allows users to upload physical and digital medical documents into their MedRec repository, including camera photo captures (e.g., physical prescriptions, lab slips), PDFs (e.g., hospital discharge summaries, diagnostic imaging reports), and scanned image files.

## Problem it Solves
Addresses the bottleneck of digitizing physical medical paperwork. Most clinic encounters in my region still produce paper slips, handwritten prescriptions, and printed lab reports. Without an intuitive capture and upload pipeline, records remain scattered across physical drawers ([[Scattered Health History]]).

## Target User
- [[Patients]]: Uploading paper slips right after a consultation or attaching digital PDFs received via email/patient portals.

## Related Research
- *Status*: Pending research validation.
- *Hypothesis*: If the upload flow takes more than 3 taps or requires tedious manual transcription, user drop-off during onboarding will exceed 50%.

## Requirements
- [[Functional Requirements]] — Support multi-format file uploads (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.heic`).
- Multi-page document capture (stitching camera snapshots into a single record entry).
- Metadata tagging upon upload: title, date of visit, category selection ([[Medical Record Categories]]), and optional doctor notes.
- Client-side image compression before network transmission.

## Dependencies
- [[Digital Medical Records]]: The parent container model that holds the uploaded assets.
- [[File Storage]]: Cloud storage service / S3 bucket configuration for object persistence.
- [[Medical Record Categories]]: Taxonomy for tagging uploads during the ingestion flow.
- [[Authentication]]: User session token for authenticated upload endpoints.

## UX Considerations
- Camera scanner with auto edge-detection / document cropping to make physical document capture effortless.
- Clear progress indicator for multi-megabyte PDF uploads.
- Ability to quickly preview uploaded pages before saving the record.
- Background upload queue so users aren't locked on the screen while waiting for slow network transfers.

## Technical Considerations
- Direct-to-storage upload using pre-signed S3 URLs to reduce load on the main API server.
- MIME-type validation and virus/malware scanning on file ingestion.
- File size caps (e.g., max 15MB per file) and client-side compression (downsampling high-res smartphone camera photos).
- Future integration path: OCR pipeline to extract text automatically from uploaded photos/PDFs.

## Status
- **Proposed** (Specification stage)

## Open Questions
- Should I support multi-file batch uploads at once (e.g., 5 separate lab result sheets from one visit)?
- How to handle offline uploads when a patient captures records in a clinic waiting room with poor cell reception?
- What is the storage cost trajectory per active user given free-tier cloud limits?
