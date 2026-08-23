---
project: MedRec
type: problem
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - risks
  - technical-risks
  - architecture
  - engineering
  - anticipated-risks
related:
  - "[[Problems MOC]]"
  - "[[Technical Architecture]]"
  - "[[Threat Model]]"
  - "[[Non-Functional Requirements]]"
  - "[[File Storage]]"
  - "[[Database]]"
---

# Technical Risks

Catalog of anticipated engineering, architectural, and computational risks for **MedRec**. Because these are **anticipated risks** rather than proven issues, each entry documents the risk severity, potential impact, and proactive mitigation strategy.

---

## ⚠️ Anticipated Technical Risks

### 1. Healthcare Data Interoperability Complexity
- **Nature**: *Anticipated Architectural Risk*
- **Severity**: 🔴 High
- **Description**: Medical data standards (HL7, FHIR, C-CDA, DICOM) are notoriously intricate, with differing implementations across hospital vendors and clinics. Relying on universal API ingestion may lead to brittle integrations.
- **Mitigation Strategy**:
  - Adopt a **patient-mediated ingestion model** (PDFs, images, OCR, manual entry) as the baseline rather than relying solely on hospital API hooks.
  - Implement a flexible internal JSON schema that can map to standard FHIR resources over time &rarr; [[Technical Requirements]].

### 2. Significant Security & Cryptographic Requirements
- **Nature**: *Anticipated Security/Engineering Risk*
- **Severity**: 🔴 High
- **Description**: Storing sensitive clinical health information requires uncompromising data protection. Flaws in key derivation, salt generation, biometric unlocking, or transport encryption could expose private records.
- **Mitigation Strategy**:
  - Use standard, audited cryptographic primitives (AES-256-GCM, PBKDF2/Argon2, SQLCipher) rather than custom crypto &rarr; [[Threat Model]], [[Security & Privacy MOC]].
  - Keep master encryption keys strictly on the user's client device (zero-knowledge model).

### 3. File Format Handling & OCR Extraction Challenges
- **Nature**: *Anticipated Technical Risk*
- **Severity**: 🟡 Medium
- **Description**: Medical documents vary wildly in quality: crumpled paper prescriptions, low-contrast photocopies, multi-page PDF lab results with complex tabular layouts. Standard OCR may yield gibberish or hallucinated values.
- **Mitigation Strategy**:
  - Maintain the original raw document (PDF / photo scan) as the authoritative source of truth &rarr; [[File Storage]].
  - Treat OCR/extracted text as a searchable metadata index and draft suggestion that the patient can review and edit &rarr; [[Digital Medical Records]].

### 4. Scalability & Storage Limits for Medical Imaging (DICOM)
- **Nature**: *Anticipated Resource Risk*
- **Severity**: 🟡 Medium
- **Description**: Medical imaging series (CT scans, MRIs, X-rays in DICOM format) can easily reach gigabytes in size per study. Storing full uncompressed DICOM archives on a mobile device will quickly exhaust device storage and mobile bandwidth.
- **Mitigation Strategy**:
  - Scope MVP to diagnostic reports, summaries, and key image slices rather than full multi-gigabyte DICOM PACS volumes.
  - Explore compressed preview rendering or cloud-streamed viewer integrations for advanced phases &rarr; [[Backlog]].

---

## 📊 Risk Matrix

| Risk | Likelihood | Impact | Overall Risk Level | Mitigation Status |
| :--- | :--- | :--- | :--- | :--- |
| Interoperability Complexity | High | High | 🔴 Critical | Fallback to patient-mediated upload |
| Cryptographic Implementation | Low | Critical | 🔴 Critical | Standard primitives & SQLCipher |
| OCR Parsing Inaccuracies | High | Medium | 🟡 Moderate | Human-in-the-loop validation |
| Imaging / DICOM Bloat | Medium | Medium | 🟡 Moderate | Scope MVP to reports & key slices |
