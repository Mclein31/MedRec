---
project: MedRec
type: problem
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - questions
  - research
  - uncertainties
  - domain-exploration
related:
  - "[[Research Questions]]"
  - "[[Problems MOC]]"
  - "[[Research Gaps]]"
  - "[[MedRec Current State]]"
  - "[[MedRec Vision]]"
  - "[[Technical Requirements]]"
---

# Open Questions

Unresolved conceptual, regulatory, technical, and strategic questions that require answers or empirical research to guide **MedRec** forward.

---

## ❓ Priority Unresolved Questions

### 1. Regulatory & Compliance Frameworks
- **Question**: *What regulatory frameworks apply to MedRec?*
- **Context**: If MedRec operates primarily as a client-side personal health record (PHR) where patients hold their own encrypted records without centralized health system hosting, does it trigger full HIPAA Business Associate requirements in the US, GDPR data controller/processor obligations in the EU, or local Data Privacy Acts (e.g., Philippines DPA 2012)?
- **Current Status**: 🟡 Researching &rarr; [[Security & Privacy MOC]], [[Security Requirements]]

### 2. EHR Interoperability & Ingestion
- **Question**: *How do existing EHR systems handle interoperability?*
- **Context**: Large EHRs (Epic, Cerner/Oracle Health) support FHIR APIs (SMART on FHIR), but access often requires certified developer partnerships or institution-level approvals. How realistic is direct API integration versus patient-mediated document export (PDF / CCDA / camera scan)?
- **Current Status**: 🟡 Researching &rarr; [[Medical Record Portability]], [[Healthcare Data Silos]]

### 3. Medical Record File Standards & Parsing
- **Question**: *What file formats are standard for medical records?*
- **Context**: Healthcare data arrives in varied formats: scanned paper receipts, PDF lab reports, CDA/C-CDA XML documents, FHIR JSON bundles, and DICOM imaging files. Which formats must be supported at MVP versus deferred?
- **Current Status**: 🟡 Researching &rarr; [[Medical Records]], [[Digital Medical Records]]

### 4. Sustainability & Business Model
- **Question**: *Is there a viable business model, or is this purely academic / open-source?*
- **Context**: As a personal project, should MedRec remain a pure open-source, local-first utility for patient privacy, or is there a sustainable freemium model (e.g., advanced AI summarization, family plan cloud backup) without commoditizing patient health data?
- **Current Status**: 🟡 Proposed &rarr; [[MedRec Goals]], [[MedRec Vision]]

### 5. Minimum Viable Feature Set (MVP Scope)
- **Question**: *What's the absolute minimum viable feature set?*
- **Context**: To avoid over-engineering as a solo developer, what is the smallest functional slice that delivers immediate patient utility? (e.g., Local encrypted document wallet + timeline + instant QR code sharing for doctor visits).
- **Current Status**: 🟡 Active Discussion &rarr; [[Functional Requirements]], [[MedRec Roadmap]]

---

## 📋 Tracking & Resolution Workflow

> [!NOTE]
> Questions move from here into [[Research Questions]] or [[Decision Log]] as they are investigated, and are marked resolved once evidence or an ADR is established.
