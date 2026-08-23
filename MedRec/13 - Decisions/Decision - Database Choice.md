---
project: MedRec
type: decision
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - decisions
  - database
  - storage
  - architecture
  - adr
related:
  - "[[Database]]"
  - "[[Decision Log]]"
  - "[[Technical Requirements]]"
  - "[[Medical Records]]"
  - "[[Database Schema]]"
  - "[[File Storage]]"
---

# Decision - Database Choice

## 1. Decision Status
- **Status**: 🟡 Proposed (OPEN — Under Evaluation)
- **Date**: 2026-08-24
- **Decider**: Solo Developer

---

## 2. Context & Problem Statement
**MedRec** requires a robust data persistence strategy for managing structured medical records, user profiles, clinical encounter timelines, document metadata, and cryptographic sharing permissions.

Key architectural constraints:
1. **Offline-First Requirement**: Patients must be able to view and manage their medical history without an active internet connection (e.g., in hospital basements or transit).
2. **Local Client Encryption**: Sensitive health record metadata stored on-device must be encrypted at rest (e.g., SQLCipher).
3. **Structured & Relational Integrity**: Clinical data involves relationships between providers, encounters, attachments, and timeline events &rarr; [[Medical Records]].
4. **Cloud Synchronization (Optional / Phase 2)**: Backend storage for multi-device sync or temporary encrypted sharing payloads &rarr; [[Technical Requirements]].

---

## 3. Options Considered

### Option A: Local SQLite (with SQLCipher encryption) + Backend PostgreSQL
- **Overview**: Use SQLite locally on the mobile client (encrypted via SQLCipher) as the primary single source of truth, and PostgreSQL on the backend for account sync / encrypted payload transit.
- **Pros**:
  - Extremely reliable, zero-server offline capability.
  - SQLCipher provides battle-tested AES-256 local database encryption.
  - Relational querying fits timeline and structured medical categories well.
- **Cons**:
  - Requires custom bidirectional sync logic between SQLite and PostgreSQL if multi-device sync is added.

### Option B: Local Document/NoSQL Store (WatermelonDB / Realm / PouchDB)
- **Overview**: Use an embedded NoSQL/reactive database optimized for mobile sync.
- **Pros**:
  - Built-in reactive observables and sync protocols.
  - Flexible schema for polymorphic medical record types.
- **Cons**:
  - Harder to enforce strict clinical schemas and referential integrity.
  - Potential vendor lock-in or heavier dependencies for mobile bundles.

### Option C: Pure Cloud Backend (PostgreSQL / Supabase) with Local Cache
- **Overview**: Cloud-first approach where data resides primarily in a remote relational DB and the client maintains an ephemeral query cache.
- **Pros**:
  - Simplest development velocity initially; standard REST/GraphQL CRUD.
- **Cons**:
  - Fails offline-first guarantee; violates patient sovereign data custody principles if all data lives on a centralized cloud server.

---

## 4. Current Working Hypothesis & Recommendation

> [!NOTE]
> **Working Hypothesis**: Option A (Local SQLite / SQLCipher on device, paired with a lightweight PostgreSQL backend for encrypted sync) is the most viable path. It satisfies sovereign data custody and offline reliability while keeping backend complexity minimal for a solo developer.

*Final decision is pending research into mobile SQLite ORMs and sync patterns.*

---

## 5. Consequences & Trade-offs (Anticipated)
- **If Option A is chosen**: Need to design a clean migration strategy and local sync schema &rarr; [[Database Schema]].
- **Storage Boundaries**: Binary files (PDFs, scans, DICOM images) will be stored in filesystem storage rather than inline database blobs &rarr; [[File Storage]].

---

## 6. Related Nodes
- [[Database]] — Database architecture overview
- [[Database Schema]] — Initial entity relationship models
- [[Decision Log]] — Master ADR index
- [[Technical Requirements]] — Non-functional storage constraints
- [[Medical Records]] — Clinical record types and relationships
