---
project: MedRec
type: resource
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - resources
  - references
  - standards
  - literature
  - tools
  - index
related:
  - "[[Research MOC]]"
  - "[[Literature Review]]"
  - "[[Things I Need To Learn]]"
  - "[[Research Questions]]"
  - "[[MedRec Dashboard]]"
---

# Resources

A curated index of external references, technical specifications, academic literature, standards, competitor landscape, and learning materials supporting the [[MedRec]] project.

---

## 📚 1. Academic Papers

*(To be populated progressively during the [[Literature Review]] phase.)*

- See [[Literature Review]] for comprehensive paper summaries, methodologies, and synthesis.
- *Upcoming areas of study*:
  - Patient-mediated health data exchange empirical outcomes
  - Usability evaluations of Personal Health Record (PHR) mobile systems
  - End-to-end encryption key management in consumer health apps

---

## 🏛️ 2. Industry Standards & Regulatory Frameworks

Essential standards governing healthcare interoperability, security, and privacy:

- **HL7 FHIR (Fast Healthcare Interoperability Resources)**
  - Specification: [HL7 FHIR Release 4 / 5](https://hl7.org/fhir/)
  - Focus: RESTful APIs, JSON/XML resource schemas (`Patient`, `Observation`, `DiagnosticReport`, `DocumentReference`, `Condition`).
  - Related: [[Research Questions]], [[Things I Need To Learn]]
- **SMART on FHIR**
  - Specification: [SMART Health IT](https://smarthealthit.org/)
  - Focus: OAuth2 authentication and launch framework for clinical and patient-facing applications.
- **HL7 Version 2.x & CDA (Clinical Document Architecture)**
  - Focus: Legacy messaging standard still ubiquitous in hospital lab and admit/discharge feeds.
- **DICOM (Digital Imaging and Communications in Medicine)**
  - Focus: Standard for communication and management of medical imaging information and related data.
- **Regulatory Frameworks**
  - **HIPAA (Health Insurance Portability and Accountability Act)**: Privacy Rule, Security Rule, Breach Notification Rule.
  - **21st Century Cures Act**: ONC Final Rule regarding Information Blocking and patient direct-access APIs.
  - **GDPR**: Article 9 (Processing of special categories of personal data / health data).
  - Related: [[Security & Privacy MOC]], [[Data Privacy]]

---

## 🏢 3. Existing Solutions & Competitor Landscape

Products and platforms addressing health records, patient portals, and interoperability to analyze for strengths, weaknesses, and UX paradigms:

- **Patient Portal Giants**:
  - *Epic MyChart*: Widely used patient portal; siloed to participating Epic health networks.
  - *Oracle Health (Cerner) HealtheLife*: Cerner's patient portal counterpart.
- **Health Data Aggregators & Consumer Platforms**:
  - *Apple Health Records*: Aggregates FHIR clinical records via SMART on FHIR direct connections on iOS.
  - *Fasten Health*: Open-source, self-hosted personal electronic health record aggregator.
  - *PicnicHealth*: Service that collects, digitizes, and structures all medical records on behalf of patients (concierge model).
  - *CommonWell Health Alliance & Carequality*: Provider-to-provider nationwide query networks.
- Related: [[Healthcare Data Silos]], [[Hospital Record Systems]], [[Patient Frustrations]]

---

## 🛠️ 4. Tools & Technologies

Libraries, developer toolkits, and infrastructure components relevant to MedRec implementation:

- **Healthcare & Data Parsing**:
  - *HAPI FHIR / fhir-py*: Open-source FHIR parser and utility libraries.
  - *Tesseract OCR / Apple Vision Kit*: Optical Character Recognition for digitizing physical paper lab slips and reports.
  - *PDF.js / PDFBox*: Document rendering and PDF manipulation.
- **Storage & Cryptography**:
  - *SQLite + SQLCipher*: Embedded relational database with transparent 256-bit AES encryption.
  - *libsodium / Argon2*: Password hashing, authenticated symmetric encryption (ChaCha20-Poly1305 / AES-GCM), and public-key cryptography.
- **Client Frameworks**:
  - *Flutter / React Native*: Cross-platform mobile development targets.
  - *FastAPI / Go*: Lightweight local or sync server prototyping.
- Related: [[Technical Architecture]], [[System Architecture]]

---

## 🎓 5. Learning Resources & Guides

Targeted learning materials for skill acquisition:

- *HL7 FHIR Fundamentals*: Official tutorials, FHIR DevDays recordings.
- *Health Informatics Fundamentals*: Clinical terminologies (SNOMED-CT, LOINC, RxNorm, ICD-10/11).
- *Practical Cryptography*: Cryptographic key derivation, envelope encryption patterns, zero-knowledge architecture.
- Related: [[Things I Need To Learn]], [[Things I Don't Understand Yet]]

---

## 🔗 Related Notes

- [[Research MOC]] — Master research map
- [[Literature Review]] — Detailed academic paper analyses
- [[Things I Need To Learn]] — My personal skill acquisition roadmap
- [[Research Questions]] — Open empirical inquiries
