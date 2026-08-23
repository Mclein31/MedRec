---
project: MedRec
type: requirement
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - non-functional-requirements
  - system-quality
  - performance
  - security
  - compliance
related:
  - "[[Functional Requirements]]"
  - "[[Security Requirements]]"
  - "[[Technical Requirements]]"
  - "[[Security & Privacy MOC]]"
---

# Non-Functional Requirements

Non-functional requirements (NFRs) define the system qualities, architectural constraints, security benchmarks, and performance standards required for MedRec to operate reliably and safely in a high-stakes healthcare context.

> [!IMPORTANT]
> **Status**: All non-functional requirements below are currently **PROPOSED**. Quantitative thresholds and compliance criteria will be finalized as architectural choices are evaluated.

---

## 1. Performance (Proposed)
- **NFR-PERF-01 (Document Render Speed)**: Medical documents (standard PDFs up to 10MB, high-res scans up to 20MB) must load and render the first page within 1.5 seconds on modern mobile devices.
- **NFR-PERF-02 (Search Latency)**: Local metadata search queries across up to 10,000 indexed records must return initial results in under 200ms.
- **NFR-PERF-03 (App Startup Time)**: Cold app launch time to interactive timeline state must not exceed 2.0 seconds.

## 2. Security (Proposed)
- **NFR-SEC-01 (Encryption at Rest)**: All local SQLite databases, cached files, and persistent document blobs must be encrypted using AES-256-GCM or equivalent authenticated encryption.
- **NFR-SEC-02 (Encryption in Transit)**: All network communications, cloud sync operations, and sharing endpoints must mandate TLS 1.3 with certificate pinning.
- **NFR-SEC-03 (Key Storage)**: Cryptographic keys must be protected within hardware-backed keychains (iOS Secure Enclave / Android KeyStore).
- *See detailed specifications in [[Security Requirements]] and [[Security & Privacy MOC]].*

## 3. Privacy & Compliance (Proposed)
- **NFR-PRIV-01 (Regulatory Adherence)**: The system design must comply with principles of relevant privacy frameworks (e.g., HIPAA Security & Privacy Rules, GDPR data minimization and right to erasure).
- **NFR-PRIV-02 (Zero Telemetry Leakage)**: No Personally Identifiable Information (PII) or Protected Health Information (PHI) may ever be included in application telemetry, crash logs, or analytics.
- **NFR-PRIV-03 (Local-First Priority)**: Core viewing and retrieval functions must be fully functional offline without server dependencies.

## 4. Availability & Reliability (Proposed)
- **NFR-REL-01 (Offline Availability)**: Users must have uninterrupted 100% access to locally cached records even during zero-connectivity scenarios (e.g., hospital basements with no cellular reception).
- **NFR-REL-02 (Data Integrity & Recovery)**: Zero data corruption tolerance for stored medical files; database transactions must adhere to strict ACID properties with automated local backup routines.

## 5. Usability & Accessibility (Proposed)
- **NFR-USA-01 (Accessibility Standards)**: UI must adhere to WCAG 2.1 Level AA guidelines, including dynamic type scaling, high contrast support, and full screen-reader compatibility (VoiceOver/TalkBack).
- **NFR-USA-02 (Low Cognitive Load)**: Core workflows (e.g., viewing medications during a consultation or showing an allergy badge) must be reachable within 2 taps from launch.

---

## Interlocking Architecture Notes

- Bridges with operational architecture defined in [[Technical Requirements]].
- Directly enforces security baselines specified in [[Security Requirements]].
- Serves as non-negotiable constraints on all [[Functional Requirements]].
