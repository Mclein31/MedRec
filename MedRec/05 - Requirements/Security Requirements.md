---
project: MedRec
type: requirement
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - security-requirements
  - privacy
  - encryption
  - compliance
  - access-control
related:
  - "[[Security & Privacy MOC]]"
  - "[[Data Encryption]]"
  - "[[Authentication]]"
  - "[[Authorization]]"
  - "[[Non-Functional Requirements]]"
  - "[[Technical Requirements]]"
---

# Security Requirements

Handling personal medical data demands rigorous, defense-in-depth security standards. Because MedRec stores sensitive Protected Health Information (PHI), security and privacy cannot be retrofitted—they must be foundational architectural requirements.

> [!IMPORTANT]
> **Status**: All requirements in this document are **PROPOSED**. Exact implementation patterns are subject to ongoing legal and regulatory compliance research in [[Security & Privacy MOC]].

---

## Proposed Security Requirements

### 1. Data Encryption (At Rest & In Transit)
- **SEC-REQ-01 (At-Rest Encryption)**: All local SQLite databases, document caches, and file attachments must be encrypted using AES-256-GCM. Decryption keys must never be written to persistent plaintext storage.
- **SEC-REQ-02 (In-Transit Encryption)**: All network data transfers (cloud backups, peer sharing, telemetry) must be conducted strictly over TLS 1.3 with certificate pinning to prevent Man-in-the-Middle (MitM) attacks.
- **SEC-REQ-03 (End-to-End Encrypted Sharing)**: Any remote document sharing mechanism must utilize end-to-end encryption (E2EE) where only the intended recipient holding the decryption key can view the plaintext record.
- *Traces to*: [[Data Encryption]].

### 2. Secure Authentication & Identity Verification
- **SEC-REQ-04 (Biometric & Multi-Factor Auth)**: Require biometric authentication (Face ID, Touch ID, Fingerprint) or a secure device passcode to unlock the app.
- **SEC-REQ-05 (Automatic App Lock)**: Automatically lock the interface and wipe in-memory decryption keys after 60 seconds of backgrounding or inactivity.
- *Traces to*: [[Authentication]].

### 3. Role-Based Access Control & Granular Permissions
- **SEC-REQ-06 (Granular Scoping)**: When sharing records with external parties (e.g., a specialist doctor), the user must be able to share specific records without exposing the rest of their medical vault.
- **SEC-REQ-07 (Time-Limited & Revocable Grants)**: Shared links or temporary viewer tokens must have configurable expiration dates (e.g., 24 hours, 7 days) and instant manual revocation capabilities.
- *Traces to*: [[Authorization]].

### 4. Comprehensive Audit Logging & Tamper Evidence
- **SEC-REQ-08 (Access Audit Trail)**: Maintain an immutable local log recording every access, export, share creation, modification, and deletion of a medical record.
- **SEC-REQ-09 (Integrity Verification)**: All stored files must store cryptographic hashes (SHA-256) at ingestion to detect accidental file corruption or malicious tampering.

### 5. Secure Data Backup & Recovery
- **SEC-REQ-10 (Zero-Knowledge Cloud Backup)**: If optional cloud backups are enabled, backups must be encrypted client-side using a user-held recovery key so that the backend server cannot read the medical records.
- **SEC-REQ-11 (Complete Local Deletion)**: Deleting a record must execute secure file shredding / overwrite of the encrypted blob and database row.

---

## Interlocking Architecture Notes

- Bridges directly to [[Non-Functional Requirements]] and [[Technical Requirements]].
- Forms the security framework detailed within [[Security & Privacy MOC]].
- Direct technical implementation tracked in [[Data Encryption]], [[Authentication]], and [[Authorization]].
