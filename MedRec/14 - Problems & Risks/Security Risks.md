---
project: MedRec
type: problem
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - risks
  - security-risks
  - privacy
  - compliance
  - encryption
  - anticipated-risks
related:
  - "[[Problems MOC]]"
  - "[[Security & Privacy MOC]]"
  - "[[Threat Model]]"
  - "[[Security Requirements]]"
  - "[[Non-Functional Requirements]]"
---

# Security Risks

Anticipated security vulnerabilities, privacy threats, and compliance challenges associated with handling sensitive protected health information (PHI) within **MedRec**.

---

## ⚠️ Anticipated Security Risks

### 1. Handling Sensitive Medical Data (PHI / Sensitive Personal Data)
- **Nature**: *Anticipated Security & Privacy Risk*
- **Severity**: 🔴 Critical
- **Description**: Medical records contain the most sensitive personal data possible: diagnoses, psychiatric evaluations, infectious disease histories, prescriptions, genetic markers, and biometric identifiers. Any unauthorized exposure is catastrophic for user trust and safety.
- **Mitigation Strategy**:
  - **Zero-Knowledge Architecture**: The MedRec backend must never store or possess decryption keys for user medical files. Data is encrypted client-side on the device before transmission &rarr; [[Security & Privacy MOC]].
  - **Local At-Rest Encryption**: All locally cached databases and document files on the mobile filesystem must be encrypted using AES-256 (SQLCipher / OS Secure Enclave) &rarr; [[Security Requirements]].

### 2. Catastrophic Consequences of a Data Breach
- **Nature**: *Anticipated Impact Risk*
- **Severity**: 🔴 Critical
- **Description**: A breach of central servers or compromised record sharing links could expose thousands of patient records, leading to severe legal liability, regulatory fines, and irreparable harm to individuals.
- **Mitigation Strategy**:
  - **Ephemeral Sharing & Access Tokens**: Shared records via QR codes or links must be time-bounded (e.g., expires in 15 minutes), single-use or revocable at any second by the patient &rarr; [[QR Code Access]], [[Record Sharing]].
  - **No Plaintext Cloud Data**: Cloud relay servers only hold end-to-end encrypted blobs that expire and auto-purge after delivery.

### 3. Ambiguous Compliance Requirements & Cross-Border Jurisdictions
- **Nature**: *Anticipated Legal / Regulatory Risk*
- **Severity**: 🟡 Medium
- **Description**: Navigating HIPAA (US), GDPR (EU), DPA (Philippines), and other regional healthcare compliance frameworks is extremely complex for a solo indie developer.
- **Mitigation Strategy**:
  - By designing MedRec as a **patient-custody tool** (where the user acts as their own data controller and records remain on-device) rather than an institutional healthcare provider service, MedRec minimizes direct HIPAA Business Associate obligations &rarr; [[Threat Model]].
  - Thoroughly document data flow diagrams and privacy policies before conducting external beta testing.

---

## 🛡️ Threat Model Mapping

| Threat Vector | Potential Impact | Architecture Defense |
| :--- | :--- | :--- |
| **Lost or Stolen Phone** | Unauthorized physical record access | Biometric app lock + OS hardware encryption |
| **Compromised Backend Server** | Mass PHI data leak | Zero-Knowledge (data is E2E encrypted client-side) |
| **Shared Link Interception** | Snooping on doctor visit summary | Time-limited tokens, passphrase protection, instant revocation |
| **Malicious App on Device** | Sandbox data extraction | Secure Enclave key storage + SQLite SQLCipher |

---

## 🔗 Related Security Links
- [[Security & Privacy MOC]] — Master security & privacy hub
- [[Threat Model]] — Detailed threat modeling and adversary profiles
- [[Security Requirements]] — Technical security specifications
- [[Problems MOC]] — Master problems map
