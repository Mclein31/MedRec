---
project: MedRec
type: idea
status: idea
created: 2026-08-24
updated: 2026-08-24
tags:
  - ideas
  - experimental
  - speculative
  - high-risk
  - research
related:
  - "[[Ideas MOC]]"
  - "[[Future Ideas]]"
  - "[[Security & Privacy MOC]]"
  - "[[Medical Record Portability]]"
  - "[[Technical Architecture]]"
  - "[[Problems MOC]]"
---

# Experimental Ideas

This document logs speculative, frontier, and technically ambitious concepts for [[MedRec]]. 

> [!WARNING] Experimental & Speculative Status
> **ALL ENTRIES HERE ARE EXPERIMENTAL CONCEPTS.**
> These ideas carry high implementation complexity, uncertain regulatory pathways, or unproven user value. They are documented here to foster creative technical exploration without contaminating the immediate development roadmap.

---

## 🧪 Speculative Concepts

### 1. Blockchain-Based Record Verification & Provenance
* **The Hypothesis**: Storing cryptographic hashes (Merkle roots) of certified medical records on a public or consortium ledger would allow receiving doctors to verify that a patient-provided PDF/FHIR record has not been altered since issuance by the originating clinic.
* **Why it's experimental**: 
  - *Assumption*: Clinics and hospitals would be willing to publish cryptographic attestations.
  - *Risk*: Regulatory compliance (GDPR "Right to be Forgotten" conflicts with ledger immutability if metadata is exposed), unnecessary gas fees, or excessive complexity for a simple digital signature (PKI) problem.
* **Alternative Under Consideration**: Standard W3C Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs) or standard X.509 cryptographic signatures over PDF/A-3 files.
* **Related**: [[Security & Privacy MOC]], [[Data Privacy]]

---

### 2. True Peer-to-Peer (P2P) Offline Record Sharing
* **The Hypothesis**: Enabling local device-to-device record transmission via direct Wi-Fi Direct, Apple Multipeer Connectivity, BLE (Bluetooth Low Energy), or local WebRTC without routing any packets through an external cloud server.
* **Why it's experimental**:
  - *Observation*: Hospital Wi-Fi networks frequently block peer-to-peer traffic and isolate client devices for cybersecurity reasons.
  - *Challenge*: Cross-platform protocol incompatibilities (iOS vs. Android vs. Windows clinical workstations) make seamless discovery notoriously brittle.
* **Potential Value**: Complete offline resilience during network outages, rural healthcare missions, or disaster zones.
* **Related**: [[Record Sharing]], [[Record Transfer]], [[Non-Functional Requirements]]

---

### 3. A Universal, Human-Readable Medical Record Format (.medrec)
* **The Hypothesis**: Creating a lightweight, portable single-file container (similar to SQLite-based `.epf` or a signed ZIP bundle containing Markdown + JSON-LD + raw PDF/DICOM attachments) that can be opened in any browser offline while maintaining semantic FHIR data tags.
* **Why it's experimental**:
  - *Assumption*: Existing standards like FHIR, CDA, and DICOM are too fragmented or complex for consumer devices, and a unified container would solve portability.
  - *Risk*: Creating "yet another competing standard" (XKCD 927 problem) instead of leveraging existing HL7 FHIR Bulk Data and SMART Health Cards.
* **Epistemic Classification**: *Speculative Concept*. Requires deep investigation in [[Literature Review]].
* **Related**: [[Medical Record Portability]], [[Healthcare Data Silos]]

---

### 4. On-Device Predictive Health Insights
* **The Hypothesis**: Running embedded statistical or ML models directly on SQLite health data to detect subtle longitudinal trends (e.g., creeping eGFR decline, missing periodic cancer screenings, vaccination expiry, or anomalous blood pressure trends) and alerting the patient with conversation prompts for their physician.
* **Why it's experimental**:
  - *Liability & Regulatory Risk*: Borderline Software as a Medical Device (SaMD / FDA Class II / EU MDR). Providing predictive diagnosis or clinical recommendations without certification creates severe legal liability.
  - *False Alarm Fatigue*: Imperfect algorithms could cause undue patient anxiety or unnecessary diagnostic testing.
* **Guardrail**: If explored, must remain strictly informational (e.g., "Recommended preventive care calendar based on CDC age guidelines") rather than diagnostic.
* **Related**: [[Health Timeline]], [[Problems MOC]]

---

## 🔬 Triage & Experimentation Process

For an experimental idea to move forward:
1. Conduct a dedicated literature review entry in [[Literature Review]].
2. Build a throwaway proof-of-concept (PoC) in a scratch branch.
3. Validate regulatory boundaries against FDA/HIPAA guidance before writing production code.

---

## 🔗 Related Notes

- [[Ideas MOC]] — Master ideas pipeline
- [[Future Ideas]] — Practical future backlog ideas
- [[Rejected Ideas]] — Explicitly dismissed concepts
- [[Security & Privacy MOC]] — Cryptographic & privacy architecture
- [[Technical Architecture]] — Core system stack
