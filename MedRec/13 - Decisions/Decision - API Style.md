---
project: MedRec
type: decision
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - decisions
  - api
  - networking
  - rest
  - graphql
  - architecture
  - adr
related:
  - "[[API]]"
  - "[[Decision Log]]"
  - "[[Technical Architecture]]"
  - "[[Backend]]"
  - "[[Frontend]]"
---

# Decision - API Style

## 1. Decision Status
- **Status**: 🟡 Proposed (OPEN — Under Evaluation)
- **Date**: 2026-08-24
- **Decider**: Solo Developer

---

## 2. Context & Problem Statement
**MedRec** requires an API communication pattern between the mobile client and the backend service for authentication, encrypted payload sharing, sync operations, and file metadata management.

Key constraints & requirements:
1. **Low Network Overhead**: Must operate smoothly under high-latency mobile networks (3G/4G/intermittent clinic Wi-Fi).
2. **Predictable Caching & Simplicity**: Straightforward debugging and minimal boilerplate for a solo developer.
3. **Binary File Handling**: Clean support for multi-part file uploads (PDFs, clinical scans, camera captures) &rarr; [[File Storage]].
4. **Strong Schema Contracts**: Clear data models between client and server.

---

## 3. Options Considered

### Option A: Standard RESTful JSON API (OpenAPI / FastAPI)
- **Overview**: Standard HTTP verb-based REST endpoints structured around resources (`/records`, `/shares`, `/auth`, `/sync`).
- **Pros**:
  - Universal standard; battle-tested and simple to inspect, test, and debug (cURL, Postman, Swagger UI).
  - Native multi-part form data support for file uploads.
  - Native HTTP status codes, caching, and simple stateless middleware.
- **Cons**:
  - Potential over-fetching or under-fetching on complex nested timeline queries (though mitigated by tailored endpoints).

### Option B: GraphQL (Apollo / Strawberry GraphQL)
- **Overview**: Single-endpoint query language allowing clients to request exact fields.
- **Pros**:
  - Solves nested data queries efficiently (e.g., fetching a patient encounter along with attached records, prescriptions, and provider metadata in one request).
  - Strongly typed schema contract.
- **Cons**:
  - Higher setup overhead, complex caching layers, and harder multi-part file upload flows.
  - Overkill for a lightweight offline-first architecture where the client already has local relational data.

### Option C: tRPC (if full-stack TypeScript is chosen)
- **Overview**: End-to-end type-safe RPC layer without schema generation.
- **Pros**:
  - Incredible developer ergonomics and zero boilerplate if using TypeScript on both client and backend.
- **Cons**:
  - Couples backend technology strictly to TypeScript / Node.js; limits Python data science/OCR flexibility.

---

## 4. Current Working Hypothesis & Recommendation

> [!NOTE]
> **Working Hypothesis**: Option A (**RESTful API with OpenAPI specs via FastAPI**) is the most practical choice. Since MedRec is an offline-first app where complex filtering happens locally in SQLite on the device, the backend API remains relatively lean and does not require the complexity of a GraphQL layer.

---

## 5. Consequences & Trade-offs (Anticipated)
- REST keeps endpoints intuitive, standard, and easy to document.
- Client will use standard HTTP clients (Axios / Fetch / TanStack Query) with generated TypeScript types from the FastAPI OpenAPI schema.

---

## 6. Related Nodes
- [[API]] — API endpoints and contract specifications
- [[Decision Log]] — Master ADR index
- [[Technical Architecture]] — Tech stack overview
- [[Backend]] — Backend service design
- [[Frontend]] — Client communication layer
