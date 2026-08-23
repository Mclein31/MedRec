---
project: MedRec
type: concept
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - security
  - privacy
  - moc
  - index
  - compliance
related:
  - "[[MedRec MOC]]"
  - "[[MedRec Dashboard]]"
  - "[[Security Requirements]]"
  - "[[Data Encryption]]"
  - "[[Authentication Architecture]]"
  - "[[Authorization]]"
  - "[[Access Control]]"
  - "[[Audit Logs]]"
  - "[[Data Backup]]"
  - "[[Data Privacy]]"
  - "[[Sensitive Data]]"
  - "[[Data Retention]]"
  - "[[Threat Model]]"
---

# Security & Privacy MOC

## Overview

In **MedRec**, security and privacy are **first-class architectural concerns**, not afterthoughts. Because this application handles sensitive personal health records (diagnoses, lab results, prescriptions, provider notes), a single data breach or privacy failure could cause severe real-world harm to users and irreparably destroy trust.

This Map of Content (MOC) acts as the central hub and navigation index for all security, privacy, and compliance documentation across the project.

```mermaid
mindmap
  root((Security & Privacy))
    Data Protection
      [[Data Encryption]]
      [[Sensitive Data]]
      [[Data Backup]]
    Access & Identity
      [[Authentication Architecture]]
      [[Authentication]]
      [[Authorization]]
      [[Access Control]]
    Governance & Compliance
      [[Data Privacy]]
      [[Data Retention]]
      [[Audit Logs]]
    Threats & Defense
      [[Threat Model]]
      [[Security Requirements]]
```

## Security & Privacy Note Index

### 1. Data Protection & Cryptography
- **[[Data Encryption]]**: Requirements and strategies for encryption at-rest, in-transit, and field-level encryption for health data.
- **[[Sensitive Data]]**: Taxonomy of data sensitivity tiers in MedRec (PHI, PII, Credentials, Audit Trails).
- **[[Data Backup]]**: Backup cadence, point-in-time recovery, offsite encryption, and disaster recovery.

### 2. Identity, Authentication & Access
- **[[Authentication Architecture]]**: Technical architecture for secure authentication, token lifecycle, password hashing, and MFA. (User-facing feature: [[Authentication]]).
- **[[Authorization]]**: Role-based and resource-level policy enforcement for data access.
- **[[Access Control]]**: Patient-centric access model, time-limited doctor sharing grants, and QR code capabilities.

### 3. Governance, Privacy & Compliance
- **[[Data Privacy]]**: Privacy-by-design principles, patient consent models, data minimization, and regulatory landscape.
- **[[Data Retention]]**: Policies regarding record lifecycles, deletion, account termination, and right-to-be-forgotten.
- **[[Audit Logs]]**: Immutable logging of all access, modifications, exports, and shared views for accountability.

### 4. Risk Analysis & Security Specifications
- **[[Threat Model]]**: Comprehensive STRIDE threat model analyzing potential attack vectors, threat actors, and mitigations.
- **[[Security Requirements]]**: Formal security specifications, baseline standards, and non-negotiable security rules.

## Core Philosophy: The Zero-Trust Patient Sovereign Model

1. **Patient Sovereignty**: The patient owns their data. No third party or provider may access records without explicit, revocable patient consent.
2. **Least Privilege**: Components and users operate with the minimum permissions necessary.
3. **Defense in Depth**: Multiple overlapping security controls (TLS + Field Encryption + Row-Level Authorization + Audit Logging).
4. **Transparency**: The patient must always be able to inspect who viewed their records, when, and what was accessed.

## Upstream Navigation

- [[MedRec MOC]] — Master project index
- [[MedRec Dashboard]] — Project status dashboard
