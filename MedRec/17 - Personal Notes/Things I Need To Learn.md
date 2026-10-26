---
project: MedRec
type: personal-note
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - personal
  - learning
  - skills
  - knowledge-gaps
  - self-development
related:
  - "[[My MedRec Notes]]"
  - "[[Resources]]"
  - "[[Research MOC]]"
  - "[[Security & Privacy MOC]]"
  - "[[Things I Don't Understand Yet]]"
  - "[[MedRec Dashboard]]"
---

# Things I Need To Learn

An honest, prioritized breakdown of technical skills, medical domain knowledge, and research methodologies I need to study and master to build [[MedRec]] successfully.

---

## 🎯 High-Priority Learning Areas

### 1. Healthcare Data Standards (FHIR & HL7)
* **What I need to learn**:
  - The anatomy of core HL7 FHIR (R4/R5) resources: `Patient`, `Observation`, `Condition`, `MedicationRequest`, `DiagnosticReport`, `DocumentReference`.
  - How FHIR Bundle structures work for multi-resource export/import.
  - SMART on FHIR OAuth2 authorization flows for patient-facing apps.
  - Terminology code systems: SNOMED CT (clinical findings), LOINC (laboratory observations), RxNorm (medications), ICD-10-CM (diagnoses).
* **Learning Resources**: Official HL7 FHIR specification, FHIR starter tutorials, [[Resources]].
* **Output Goal**: Ability to construct, parse, and validate valid FHIR JSON payloads in Python / Dart / Go.
* **Related**: [[Research Questions]], [[Technical Architecture]]

---

### 2. Medical Records Regulatory Landscape
* **What I need to learn**:
  - The boundaries of the **HIPAA Privacy and Security Rules**: Does a pure client-side, patient-controlled mobile app fall outside Covered Entity / Business Associate definitions?
  - **21st Century Cures Act**: ONC rules regarding Information Blocking and patient rights to access electronic health information (EHI) without delay.
  - **GDPR Article 9**: Specific requirements for handling special category (health) data in European jurisdictions.
* **Learning Resources**: ONC HealthIT.gov documentation, HHS HIPAA guidelines, health legal commentaries.
* **Output Goal**: A clear compliance roadmap for MedRec's zero-knowledge architecture in [[Data Privacy]].
* **Related**: [[Security & Privacy MOC]], [[Data Privacy]]

---

### 3. Qualitative Research Methodology
* **What I need to learn**:
  - Conducting semi-structured user interviews without introducing confirmation bias or leading questions.
  - Thematic Analysis: Systematic coding of interview transcripts to identify recurring patterns and pain points.
  - Contextual Inquiry: Observing how patients currently organize medical binders, portal logins, and discharge paperwork.
* **Learning Resources**: Qualitative research handbooks, user research methodologies (The Mom Test, Just Enough Research).
* **Output Goal**: Robust interview synthesis in [[Interview Notes]] and [[Research Findings]].
* **Related**: [[Qualitative Research]], [[Interview Questions]]

---

### 4. Security Best Practices for Health Data
* **What I need to learn**:
  - Implementation of **Zero-Knowledge Architecture** (client-side encryption where the server never sees the plaintext or private keys).
  - Secure Key Derivation Functions (Argon2id, PBKDF2) with hardware-backed key storage (iOS Secure Enclave, Android Keystore).
  - Envelope Encryption schemes: Using symmetric data encryption keys (DEKs) encrypted with master key encryption keys (KEKs).
  - Transparent database encryption using SQLCipher.
* **Learning Resources**: Cryptography engineering guides, OWASP Mobile Security Testing Guide (MSTG).
* **Output Goal**: Hardened encryption implementation in [[Security & Privacy MOC|Security Architecture]].
* **Related**: [[Security & Privacy MOC]], [[Technical Architecture]]

---

### 5. Academic Research Writing & Synthesis
* **What I need to learn**:
  - Structuring a formal literature review according to academic rigor (PRISMA framework / systematic scoping reviews).
  - Formulating falsifiable research hypotheses with rigorous inclusion/exclusion criteria.
  - Academic citation management and paper drafting.
* **Learning Resources**: Academic writing guides, health informatics journal standards (JMIR, JAMIA).
* **Output Goal**: High-quality syntheses in [[Literature Review]] and potential academic paper publication.
* **Related**: [[Literature Review]], [[Research Hypotheses]]

---

## 📈 Learning Progress Tracker

| Skill / Domain | Current Level | Target Level | Next Action | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FHIR JSON Resources** | Beginner | Intermediate | Complete FHIR R4 sandbox tutorial | In Progress |
| **HIPAA App Requirements** | Beginner | Working Knowledge | Read ONC Patient Access API rule | Next |
| **User Interview Techniques** | Intermediate | Advanced | Draft & refine [[Interview Questions]] | Active |
| **Zero-Knowledge Encryption** | Intermediate | Advanced | Prototype SQLCipher + Argon2 test | Queued |
| **Literature Review Synthesis** | Beginner | Intermediate | Set up Zotero + review 5 key papers | Active |

---

## 🔗 Related Notes

- [[My MedRec Notes]] — Personal notes hub
- [[Things I Don't Understand Yet]] — Confusions and black boxes
- [[Resources]] — External courses, guides, and tools
- [[Research MOC]] — Research methodologies
- [[Security & Privacy MOC]] — Security and cryptography roadmap
