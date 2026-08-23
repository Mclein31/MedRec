---
project: MedRec
type: task
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - development
  - backlog
  - planning
  - solo-dev
related:
  - "[[Next Actions]]"
  - "[[Development MOC]]"
  - "[[Functional Requirements]]"
  - "[[Non-Functional Requirements]]"
  - "[[Technical Architecture]]"
  - "[[MedRec Roadmap]]"
---

# Backlog

Future work items, ideas, and upcoming technical tasks for **MedRec**, organized by area. Items move from this backlog into [[Next Actions]] when they become high priority and actionable.

---

## 🔬 Research & Discovery

- [ ] Investigate FHIR (Fast Healthcare Interoperability Resources) JSON schema specifications for patient records &rarr; [[Research Questions]], [[Technical Requirements]]
- [ ] Evaluate open-source OCR engines (Tesseract vs Apple Vision framework vs Cloud APIs) for medical document extraction &rarr; [[Digital Medical Records]]
- [ ] Research legal frameworks regarding medical data handling (HIPAA compliance, GDPR considerations, Philippine DPA if applicable) &rarr; [[Security Requirements]], [[Open Questions]]
- [ ] Conduct competitive analysis on Apple Health, CommonHealth, and Fasten Health &rarr; [[Product Risks]]
- [ ] Synthesize findings from initial patient interviews into themes &rarr; [[Research Themes]], [[User Pain Points]]

---

## 🎨 Product & UX Design

- [ ] Create low-fidelity wireframes for the patient health timeline view &rarr; [[Health Timeline]], [[Product Design MOC]]
- [ ] Design document upload and categorization flow (camera scan + PDF import) &rarr; [[Medical Record Categories]], [[User Flow]]
- [ ] Wireframe temporary QR-code based record sharing screen &rarr; [[QR Code Access]], [[Record Sharing]]
- [ ] Define color system and typography for clinical readability &rarr; [[Product Design MOC]]
- [ ] Map emergency contact and critical allergy badge interface &rarr; [[Emergency Access]]

---

## 🛠️ Development & Engineering

### Architecture & Setup
- [ ] Prototype local SQLite database schema for offline-first medical record storage &rarr; [[Database Schema]], [[Decision - Database Choice]]
- [ ] Evaluate mobile framework options (React Native vs Flutter vs Native Swift/Kotlin) &rarr; [[Decision - Frontend Technology]]
- [ ] Set up basic backend starter repository and evaluate API style (REST vs GraphQL) &rarr; [[Decision - Backend Technology]], [[Decision - API Style]]
- [ ] Define client-side symmetric key encryption flow using AES-256-GCM &rarr; [[Security & Privacy MOC]], [[Technical Architecture]]

### Core Features (Milestone 1 Prototype)
- [ ] Implement local document storage and sandboxed file viewer &rarr; [[File Storage]], [[Digital Medical Records]]
- [ ] Build basic record metadata tagging (Date, Provider, Record Type, Doctor Name) &rarr; [[Functional Requirements]]
- [ ] Implement biometric lock (Face ID / Fingerprint) for app unlock &rarr; [[Authentication]], [[Security Requirements]]
- [ ] Build QR code generation and time-bounded token verification for sharing &rarr; [[QR Code Access]], [[Record Sharing]]

---

## 📚 Documentation & Process

- [ ] Document data retention and export policies &rarr; [[Non-Functional Requirements]]
- [ ] Write Architecture Decision Records (ADRs) as tech stack decisions finalize &rarr; [[Decision Log]]
- [ ] Create automated testing strategy for cryptographic operations &rarr; [[Testing MOC]] *(future)*
- [ ] Maintain technical debt log once code development commences &rarr; [[Technical Debt]]
