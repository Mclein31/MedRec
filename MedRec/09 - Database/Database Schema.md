---
project: MedRec
type: architecture
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - database
  - schema
  - data-model
  - entity-relationship
related:
  - "[[Database]]"
  - "[[Medical Records]]"
  - "[[Medical Record Categories]]"
  - "[[User Profile]]"
  - "[[Audit Logs]]"
---

# Database Schema

## Overview

This note provides the conceptual entity-relationship blueprint for MedRec. Detailed physical database schemas, data types, indexes, and migration scripts will be finalized once the underlying database technology is selected in [[Decision - Database Choice]].

## Conceptual Entity Relationship Model

```mermaid
erDiagram
    USER ||--o{ MEDICAL_RECORD : owns
    USER ||--o{ SHARE_GRANT : creates
    USER ||--o{ AUDIT_LOG : generates
    MEDICAL_RECORD ||--o{ RECORD_ATTACHMENT : contains
    MEDICAL_RECORD }o--|| RECORD_CATEGORY : categorized_by
    SHARE_GRANT ||--o{ SHARE_ACCESS_LOG : logs

    USER {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        date date_of_birth
        string blood_type
        jsonb emergency_contacts
        timestamp created_at
        timestamp updated_at
    }

    MEDICAL_RECORD {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        string title
        date encounter_date
        string provider_name
        string facility_name
        jsonb clinical_data
        text ai_summary
        string[] tags
        timestamp created_at
        timestamp updated_at
    }

    RECORD_CATEGORY {
        uuid id PK
        string slug UK
        string display_name
        string icon_identifier
    }

    RECORD_ATTACHMENT {
        uuid id PK
        uuid record_id FK
        string storage_key
        string file_name
        string mime_type
        int file_size_bytes
        string sha256_checksum
        timestamp uploaded_at
    }

    SHARE_GRANT {
        uuid id PK
        uuid user_id FK
        string access_token_hash UK
        string qr_code_id UK
        string[] allowed_record_ids
        string recipient_description
        timestamp expires_at
        boolean is_revoked
        timestamp created_at
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string actor_type
        string actor_identifier
        string action_type
        string resource_type
        uuid resource_id
        string ip_address_hash
        timestamp created_at
    }
```

## Schema Entities (Planned Specifications)

### 1. `users` / [[User Profile]]
- Identity, credentials hash, profile demographics, emergency medical card info, and security preferences.

### 2. `medical_records` / [[Medical Records]]
- Core clinical record entries. Includes structured fields (dates, facility, doctor) and flexible payload (diagnoses, prescriptions, vitals, lab numbers) plus AI-generated summaries.

### 3. `record_categories` / [[Medical Record Categories]]
- Taxonomy for organizing records (e.g. Consultations, Lab Tests, Prescriptions, Imaging, Vaccinations, Surgeries).

### 4. `record_attachments`
- Metadata pointers to binary files stored securely in [[File Storage]].

### 5. `share_grants`
- Ephemeral tokens, permissions scope, expiration timestamps, and revocation flags for doctor sharing sessions.

### 6. `audit_logs` / [[Audit Logs]]
- Immutable event records tracking every data access, modification, export, and sharing event.

## Open Design Questions

- How will field-level encryption affect indexing on searchable medical record attributes?
- Should AI summaries be stored alongside records or in a dedicated versioned table?
- Migration and schema evolution strategy when adding new medical domain types.
