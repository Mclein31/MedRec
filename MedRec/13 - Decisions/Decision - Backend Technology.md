---
project: MedRec
type: decision
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - decisions
  - backend
  - server
  - architecture
  - adr
related:
  - "[[Backend]]"
  - "[[Decision Log]]"
  - "[[Technical Architecture]]"
  - "[[API]]"
  - "[[Authorization]]"
  - "[[Cloud Infrastructure]]"
---

# Decision - Backend Technology

## 1. Decision Status
- **Status**: 🟡 Proposed (OPEN — Under Evaluation)
- **Date**: 2026-08-24
- **Decider**: Solo Developer

---

## 2. Context & Problem Statement
While **MedRec** adopts an offline-first, client-heavy philosophy, a backend service is required for:
1. **Authentication & Identity**: User account creation, device pairing, and token revocation &rarr; [[Authorization]].
2. **Encrypted Transit & Relay**: Handling temporary encrypted payloads for QR code / link record sharing &rarr; [[Record Sharing]].
3. **Optional Cloud Sync & Backup**: Storing zero-knowledge encrypted backups for multi-device sync.
4. **Document Processing / OCR Workers**: Background processing of scanned clinical PDFs and medical lab reports &rarr; [[Digital Medical Records]].

The backend must be lightweight, easy to maintain for a solo engineer, secure, and fast to deploy.

---

## 3. Options Considered

### Option A: Python (FastAPI) + Pydantic + SQLAlchemy
- **Overview**: Asynchronous REST/WebSocket API framework in Python.
- **Pros**:
  - Excellent ecosystem for data parsing, health data modeling (Pydantic models for FHIR), and ML/OCR integrations (Tesseract, PyTorch).
  - Automatic OpenAPI / Swagger generation.
  - Very rapid solo prototyping speed.
- **Cons**:
  - Slightly higher runtime memory footprint than compiled Go/Rust.

### Option B: Go (Golang) + Chi / Gin
- **Overview**: Compiled, highly concurrent microservice backend.
- **Pros**:
  - Single binary deployment, ultra-low memory footprint, high execution speed.
  - Built-in concurrency handling for I/O operations.
- **Cons**:
  - More verbose boilerplate code; slower iteration on complex data structures and medical schema validation compared to Python.

### Option C: TypeScript (Node.js / Hono or NestJS)
- **Overview**: TypeScript backend runtime using Fastify, Hono, or Express.
- **Pros**:
  - End-to-end type sharing with React Native frontend.
  - Rich npm ecosystem and familiar tooling.
- **Cons**:
  - Python has superior libraries for document parsing, PDF manipulation, and medical text extraction.

### Option D: Backend-as-a-Service (Supabase / Pocketbase)
- **Overview**: Managed backend providing Postgres, Auth, and Storage.
- **Pros**:
  - Near-instant setup; handles auth and row-level security out of the box.
- **Cons**:
  - Less flexibility for custom zero-knowledge encryption pipelines or proprietary sharing logic.

---

## 4. Current Working Hypothesis & Recommendation

> [!NOTE]
> **Working Hypothesis**: Option A (**Python with FastAPI**) is currently the leading candidate. It offers rapid API prototyping, built-in validation via Pydantic (ideal for structured medical schemas), and seamless future integration with Python-based OCR/NLP document parsing tools.

*Final decision will be made once backend scope and document parsing pipelines are defined.*

---

## 5. Consequences & Trade-offs (Anticipated)
- FastAPI enables rapid iteration with self-documenting APIs.
- Production deployment will use containerized Docker instances running on a simple VPS or PaaS &rarr; [[Cloud Infrastructure]], [[Deployment]].

---

## 6. Related Nodes
- [[Backend]] — Backend architecture overview
- [[API]] — API interface design
- [[Decision Log]] — Master ADR index
- [[Technical Architecture]] — System technology stack
- [[Authorization]] — Auth and token management
