---
project: MedRec
type: concept
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - security
  - backup
  - disaster-recovery
  - data-resilience
  - infrastructure
related:
  - "[[Cloud Infrastructure]]"
  - "[[Database]]"
  - "[[Security & Privacy MOC]]"
  - "[[Security Requirements]]"
  - "[[File Storage]]"
---

# Data Backup & Disaster Recovery Strategy

## Overview

Medical records represent irreplaceable historical health data: losing records could adversely impact medical treatment, diagnosis continuity, and patient wellbeing. MedRec must implement a resilient, automated, and secure backup and disaster recovery (DR) architecture.

The technical mechanisms and backup schedule are currently **TBD** and will be finalized once cloud and database providers are selected.

```mermaid
graph TD
    subgraph PrimaryInfra ["Primary Infrastructure"]
        LiveDB[(Live Database\n[[Database]])]
        LiveFiles[(Live Object Storage\n[[File Storage]])]
    end

    subgraph BackupEngine ["Backup & DR Automation"]
        Snapshotter[Automated Snapshot Service]
        CryptoBackup[Backup Encryption & Checksumming]
        Snapshotter --> CryptoBackup
    end

    subgraph OffsiteStorage ["Encrypted Offsite Vault"]
        ColdDB[(Encrypted DB Snapshots\nSecondary Region)]
        ColdFiles[(Replicated Object Buckets\nSecondary Region)]
    end

    LiveDB --> Snapshotter
    LiveFiles --> Snapshotter
    CryptoBackup --> ColdDB
    CryptoBackup --> ColdFiles
```

## Backup Requirements & Strategy

### 1. Recovery Objectives (Targets)
- **Recovery Point Objective (RPO)**: < 1 hour (maximum allowable data loss in catastrophic disaster).
- **Recovery Time Objective (RTO)**: < 4 hours (maximum allowable downtime to restore full service).

### 2. Backup Levels & Cadence
- **Continuous / Point-in-Time Recovery (PITR)**: Write-Ahead Logging (WAL) / transaction log shipping enabling restore to any specific second within the last 7–30 days.
- **Daily Automated Snapshots**: Full encrypted database snapshots created daily during low-traffic periods.
- **Cross-Region Storage Replication**: Medical attachment files asynchronously replicated to a secondary geographical region.

### 3. Backup Security
- **Independent Encryption Keys**: Backups encrypted with separate Customer Master Keys (CMKs) not accessible to primary web servers.
- **Immutability / Object Lock**: Backup buckets configured with WORM (Write Once, Read Many) policies to protect against ransomware deletion.

### 4. Recovery Verification & Testing
- Automated monthly restore drills into an isolated staging environment to verify snapshot integrity and recovery runbooks.

### 5. User-Level Self-Service Backups
- In keeping with patient data ownership, the app must provide an "Export All My Data" feature creating a password-protected, encrypted archive (PDF + JSON) for local offline storage.

## Assumptions & Hypotheses

- **Assumption**: Managed cloud databases (e.g. AWS RDS, GCP Cloud SQL, Supabase) handle automated PITR out of the box with minimal operational overhead for a solo developer.
- **Hypothesis**: Giving patients a one-click local backup option increases user confidence against vendor lock-in.
