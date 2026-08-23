---
project: MedRec
type: architecture
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - architecture
  - cloud
  - infrastructure
  - hosting
  - devops
related:
  - "[[Deployment]]"
  - "[[Monitoring]]"
  - "[[Technical Architecture]]"
  - "[[Backend]]"
  - "[[File Storage]]"
  - "[[Decision - Cloud Provider]]"
---

# Cloud Infrastructure Architecture

## Overview

The cloud infrastructure architecture provides the hosting foundation for MedRec's backend services, database persistence, object storage, and DNS/TLS termination. For a solo project handling sensitive medical data, the infrastructure strategy must prioritize **low operational overhead, rock-solid security defaults, cost efficiency, and automated provisioning**.

The specific cloud provider and hosting model are **NOT YET SELECTED** and are being evaluated in [[Decision - Cloud Provider]].

```mermaid
graph TD
    User([User Traffic]) --> DNS[DNS & CDN / DDoS Protection\n(Cloudflare / Route53)]
    DNS --> SSL[TLS Termination / Load Balancer]
    SSL --> Compute[Backend Container / Serverless App\n[[Backend]]]
    Compute --> ManagedDB[(Managed PostgreSQL / MongoDB\n[[Database]])]
    Compute --> ObjStore[(Encrypted Object Storage\n[[File Storage]])]
    Compute --> Secrets[Secrets Manager / Env Vault]
```

## Infrastructure Requirements & Modules

1. **Compute & Runtime**:
   - Containerized deployment (Docker) on a managed PaaS (e.g., Render, Fly.io, Railway) or container service (AWS ECS/Fargate, GCP Cloud Run).
   - Auto-restart, environment variable injection, and automated health checking.
2. **Managed Database**:
   - Managed DB instance providing automated daily snapshots, automated patching, and SSL connections.
3. **Object Storage**:
   - High availability, multi-zone encrypted storage for medical attachments.
4. **Secrets Management**:
   - Centralized, encrypted secret storage (e.g. Doppler, AWS Secrets Manager, or PaaS built-in secrets) to avoid hardcoding API keys or database credentials in source control.
5. **Networking & Security Perimeter**:
   - Isolated VPC / private subnet between application compute and database instance.
   - HTTPS / TLS 1.3 enforced across all public entrypoints.

## Provider Options Under Evaluation

- **PaaS (Render, Fly.io, Railway)**: Very low operational overhead for a solo developer; rapid deployments; moderate cost.
- **BaaS (Supabase / Firebase)**: All-in-one auth, DB, and storage, but higher vendor lock-in.
- **Major Cloud (AWS, GCP)**: Maximum flexibility and compliance certifications (HIPAA readiness), but higher configuration complexity.

## Related Decision Notes

- [[Decision - Cloud Provider]]
