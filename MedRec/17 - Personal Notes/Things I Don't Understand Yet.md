---
project: MedRec
type: personal-note
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - personal
  - questions
  - confusion
  - inquiry
  - open-questions
related:
  - "[[Open Questions]]"
  - "[[Things I Need To Learn]]"
  - "[[Research Questions]]"
  - "[[My MedRec Notes]]"
  - "[[Healthcare Data Silos]]"
---

# Things I Don't Understand Yet

An unvarnished, humble catalog of domain complexities, industry black boxes, and unanswered technical questions about healthcare records.

> [!NOTE] Developer's Note
> Acknowledging what I *don't* understand is the best defense against building flawed software on top of faulty assumptions. Every entry here is an invitation for targeted research or prototyping.

---

## ❓ The "Black Box" List

### 1. How EHR Interoperability *Actually* Works in Practice
* **The Confusion**: On paper, FHIR R4 and the 21st Century Cures Act mandate standardized REST APIs. In reality, every health system configures their Epic, Cerner, or Allscripts instance differently, requiring custom OAuth developer registrations, institution-specific endpoints, and disparate data mappings.
* **What I need to figure out**: How feasible is it for an independent app to connect to multiple health systems without paying exorbitant aggregator fees (e.g., Particle Health, Redox) or negotiating individual provider agreements?
* **Related**: [[Healthcare Data Silos]], [[Hospital Record Systems]], [[Medical Record Portability]]

---

### 2. What HIPAA Specifically Requires for a Patient-Held App
* **The Confusion**: HIPAA applies strictly to "Covered Entities" (hospitals, doctors, health plans) and their "Business Associates". If a patient downloads their own health records and stores them in a personal app on their own phone, does MedRec have any formal HIPAA compliance obligations, or is it governed strictly by FTC consumer protection and state privacy laws?
* **What I need to figure out**: Where is the exact legal line between a "Business Associate" and a pure "Patient-Directed Personal Health Record"?
* **Related**: [[Data Privacy]], [[Security & Privacy MOC]]

---

### 3. Legal Realities of "Patient Data Ownership" Across Jurisdictions
* **The Confusion**: We often say "patients own their data", but legally, in many jurisdictions (including many US states), the hospital owns the physical or electronic medical record, while the patient only has a "statutory right of access and inspection".
* **What I need to figure out**: What are the practical and legal implications of this distinction? Are there jurisdictions where patients have true legal title to their data?
* **Related**: [[Patient Data Ownership]], [[Research Questions]]

---

### 4. Efficient Handling & Storage of Medical Imaging (DICOM)
* **The Confusion**: Diagnostic imaging (CT scans, MRI volumes, multi-slice X-rays) generates gigabytes of raw DICOM datasets. Mobile devices have constrained storage, and rendering 3D volumetric slices requires specialized clinical rendering engines.
* **What I need to figure out**: Should MedRec attempt to ingest raw DICOM files, or should it focus on lightweight diagnostic summary reports and high-resolution JPEG/PNG key-slice previews?
* **Related**: [[Technical Architecture]], [[Non-Functional Requirements]]

---

### 5. Why Previous Consumer Health Record Solutions Failed
* **The Confusion**: Google Health (original 2008 attempt), Microsoft HealthVault, and numerous venture-backed personal health record startups all shut down or struggled with user retention. Even Apple Health Records has modest active engagement.
* **What I need to figure out**: What were the root causes of failure? Was it user friction (entering data manually)? Lack of immediate utility (you only care when you're sick)? Or doctor refusal to trust patient-provided data?
* **Related**: [[Patient Frustrations]], [[User Pain Points]], [[Qualitative Research]]

---

## 🔍 Investigation Strategy

1. Move high-priority questions into formal inquiry in [[Research Questions]].
2. Investigate academic post-mortems in [[Literature Review]].
3. Validate patient and doctor behaviors directly in [[Interview Questions]].

---

## 🔗 Related Notes

- [[My MedRec Notes]] — Developer's external brain hub
- [[Things I Need To Learn]] — Structured learning goals
- [[Open Questions]] — Technical & system-level unresolved questions
- [[Research Questions]] — Formal research questions
- [[Problems MOC]] — Systemic risks and constraints
