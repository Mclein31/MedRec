---
project: MedRec
type: feature
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - feature
  - viewer
  - ui
related:
  - "[[Digital Medical Records]]"
  - "[[Record Upload]]"
  - "[[Patients]]"
  - "[[Functional Requirements]]"
  - "[[Medical Record Categories]]"
  - "[[Search Medical Records]]"
---

# Record Viewing

## Purpose
Provides a clear, responsive, and secure viewer interface for inspecting stored medical records, including high-resolution medical document previews, embedded multi-page PDF rendering, zoomable diagnostic images, and structured metadata sidebars.

## Problem it Solves
Fixes the frustration patients and doctors experience when attempting to open unsupported file formats, poorly rendered scans, or unorganized files on mobile devices during time-sensitive consultations ([[Patient Frustrations]]).

## Target User
- [[Patients]]: Reviewing past lab results, doctor instructions, and prescription dosages at home.
- [[Healthcare Providers]]: Rapidly examining historical reports, lab trends, and discharge summaries during consultations.

## Related Research
- *Status*: Pending research validation.
- *Observation*: During clinical consults, doctors spend an average of only 15-30 seconds scanning previous lab notes; readability and fast load times are paramount.

## Requirements
- [[Functional Requirements]] — In-app PDF rendering without forcing external third-party viewer app launches.
- Pinch-to-zoom and pan support for high-resolution photo scans of handwritten doctor notes.
- Multi-page navigation (swiping between pages of a multi-page document).
- Display of attached metadata: visit date, provider name, category badge, and doctor's notes.
- Quick action buttons: Share ([[Record Sharing]]), Download, Edit Metadata, Delete.

## Dependencies
- [[Digital Medical Records]]: Data model providing the document records and metadata.
- [[Record Upload]]: Source of persisted files and thumbnails.
- [[Authentication]]: Session verification before decrypting or fetching temporary view URLs.

## UX Considerations
- Fast thumbnail caching for seamless scroll in list/gallery view.
- High-contrast text presentation for clinical readability.
- Fullscreen mode to maximize screen real estate when reading small prescription text on smartphones.
- Dark mode compatibility that avoids inverting medical image scans.

## Technical Considerations
- Secure viewing via time-limited pre-signed S3 URLs (e.g., valid for 15 minutes) to avoid exposing permanent public file URLs.
- Mobile PDF rendering library evaluation: React Native PDF / Flutter PDF viewer plugin memory footprint.
- Client-side caching of rendered pages for rapid re-inspection without redownloading.

## Status
- **Proposed** (Specification stage)

## Open Questions
- Should the app support DICOM image viewing for radiological scans (X-rays, MRIs), or is standard JPG/PNG/PDF preview sufficient for MVP?
- How to handle viewing when the user has intermittent or no internet connectivity?
