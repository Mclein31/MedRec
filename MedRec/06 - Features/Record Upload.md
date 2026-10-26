---
project: MedRec
type: feature
status: implemented
created: 2026-08-24
updated: 2026-08-30
tags:
  - medrec
  - feature
  - upload
  - camera
  - scanning
  - storage
related:
  - "[[Digital Medical Records]]"
  - "[[File Storage]]"
  - "[[Medical Record Categories]]"
  - "[[Functional Requirements]]"
  - "[[Medical Records]]"
  - "[[Patients]]"
---

# Record Upload & Document Scanning

## Purpose
Allows users to upload physical and digital medical documents into their MedRec repository, including camera document photo captures (e.g., physical prescriptions, lab slips, consultation notes) and existing photos imported from the device's photo library.

## Problem it Solves
Addresses the bottleneck of digitizing physical medical paperwork. Most clinic encounters produce paper slips, handwritten prescriptions, and printed lab reports. Without an intuitive capture and upload pipeline, records remain scattered across physical drawers ([[Incomplete Medical History|Scattered Health History]]).

## Target User
- [[Patients]]: Scanning paper slips right after a consultation or attaching digital document photos received via email or messaging apps.

## Implemented Camera & Scanning Experience (Phase 1 MVP)
1. **Document-First Camera Viewport (`DocumentCamera.tsx`)**:
   - 3:4 aspect ratio document framing guide (`ViewfinderOverlay.tsx`) with darkened ambient vignette and rounded teal corner markers.
   - Flashlight / Torch toggle (`enableTorch`) to illuminate low-light medical papers.
   - Dual-ring tactile shutter button with haptic feedback (`Haptics.impactAsync`) and a visual shutter flash animation.
   - Photo library fallback button (`expo-image-picker`) to select existing document photos.
   - Permission recovery prompt deep-linking to device settings (`Linking.openSettings()`).
2. **Quality & Legibility Review (`DocumentPreview.tsx`)**:
   - Full-resolution image inspection before saving.
   - Mandatory quality self-check prompt (*"Is this document legible? Make sure text, dates, test values, and signatures are crisp and clearly readable"*).
   - Quick **Retake** (reopens camera) vs. **Use Document** (confirms attachment) actions.
3. **In-Form Attachment Management (`AttachedDocumentCard.tsx`)**:
   - Interactive thumbnail card displayed on the Add Health Record form (`add.tsx`).
   - Shows a 64×64px document thumbnail, status indicator, and quick actions: **Preview / Zoom**, **Replace / Retake**, and **Remove** (with confirmation).
   - Preserves all typed form fields across camera and preview state transitions.
   - Automatically pre-fills a suggested record title if left blank.

## Dependencies
- [[Digital Medical Records]]: The parent container model that holds the uploaded assets.
- [[Medical Record Categories]]: Taxonomy for tagging uploads during the ingestion flow.
- [[Authentication]]: User session token for authenticated upload endpoints.

## Status
- **Implemented** (Phase 1 MVP - Document Camera & Gallery Ingestion completed 2026-08-30)

## Deferred to Future Iterations
- Multi-page document batch scanning (stitching 2-5 pages into a single PDF).
- On-device edge OCR text extraction (Apple Vision / Google ML Kit).
- Cloud S3 object storage with pre-signed upload URLs.
