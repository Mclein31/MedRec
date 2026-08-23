---
project: MedRec
type: architecture
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - architecture
  - api
  - rest
  - graphql
  - interface
related:
  - "[[Backend]]"
  - "[[Frontend]]"
  - "[[System Architecture]]"
  - "[[Technical Architecture]]"
  - "[[Decision - API Style]]"
  - "[[Authorization]]"
---

# API Architecture

## Overview

The API layer defines the communication interface between client applications (mobile app, guest/doctor web portal) and backend services. It must enforce strict authentication, input validation, consistent error responses, and rate-limiting.

The choice of API paradigm (REST vs GraphQL vs tRPC/gRPC) is **NOT YET DECIDED** and is tracked in [[Decision - API Style]].

## Core Architectural Requirements

1. **Stateless Authentication**: Every request must carry verifiable credentials (e.g., Bearer JWT or cryptographically signed session token) evaluated at the gateway.
2. **Versioned Contracts**: Explicit versioning (e.g., `/api/v1/`) to prevent breaking mobile clients on schema updates.
3. **Consistent Error Modeling**: Standardized JSON error response format (RFC 7807 Problem Details or consistent envelope).
4. **Rate Limiting & Abuse Prevention**: Strict throttling on sensitive routes (authentication attempts, share token lookups, AI generation endpoints).

## Candidate Endpoint / Resource Domains (Planned)

Regardless of REST vs GraphQL, the API will expose functionality across the following primary domains:

| Domain | Scope & Responsibilities | Key Operations (Conceptual) |
|---|---|---|
| **Auth** | User identity, registration, MFA, sessions | `register`, `login`, `refreshToken`, `logout`, `mfaVerify` |
| **User Profile** | Personal demographics, emergency contacts | `getProfile`, `updateProfile`, `exportAllData` |
| **Records** | Medical entries, diagnoses, lab tests, prescriptions | `listRecords`, `getRecord`, `createRecord`, `updateRecord`, `deleteRecord` |
| **Files & Attachments** | Secure document uploads (PDFs, scans) | `getUploadUrl`, `confirmUpload`, `getDownloadUrl` |
| **Sharing & Grants** | QR codes, temporary doctor links, permissions | `createShareGrant`, `getSharedView`, `revokeShareGrant`, `listActiveShares` |
| **AI Insights** | Summarization, term explanation, categorization | `summarizeRecord`, `explainTerms`, `autoCategorize` |
| **Audit** | Access logs, view history | `getAccessLogs` |

## Paradigms Under Consideration

- **REST (OpenAPI/Swagger)**: Mature, predictable, easy to cache, straightforward for third-party web portals.
- **GraphQL**: Strong type system, eliminates over-fetching on complex medical record hierarchies, single endpoint.
- **tRPC / Type-safe RPC**: End-to-end type safety between TypeScript backend and frontend if a TS stack is chosen.

## Related Decision Notes

- [[Decision - API Style]] (Evaluating REST vs GraphQL vs tRPC)
