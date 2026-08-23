---
project: MedRec
type: concept
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - concept
  - problem-space
  - ehr-systems
  - hospital-infrastructure
  - interoperability
related:
  - "[[Healthcare Data Silos]]"
  - "[[Medical Records]]"
  - "[[Research Questions]]"
---

# Hospital Record Systems

**Hospital Record Systems**, primarily known as **Electronic Health Record (EHR)** or **Electronic Medical Record (EMR)** platforms, constitute the core digital operating systems of modern medical enterprises.

They manage the creation, storage, billing, and clinical review of all patient [[Medical Records]] within hospital networks and clinical practices.

---

## The Landscape: Major Platforms

The global and North American hospital market is dominated by a small cadre of enterprise vendors:
1. **Epic Systems**: Market leader in large academic medical centers and major hospital networks (uses the *MyChart* patient portal).
2. **Oracle Health (formerly Cerner)**: Deep presence in large health systems, government healthcare (VA/DoD), and global implementations.
3. **MEDITECH**: Popular across mid-sized and community healthcare facilities.
4. **Athenahealth / Veradigm (Allscripts)**: Common in ambulatory clinics, private outpatient practices, and specialty care groups.

---

## How EHRs Currently Work

```
[Clinical Encounter]
         │
         ▼
┌────────────────────────────────────────────────────────┐
│               Hospital EHR Infrastructure              │
│  - Clinical Documentation (SOAP / Progress Notes)      │
│  - Computerized Physician Order Entry (CPOE)          │
│  - Pharmacy / Medication Dispensing                   │
│  - Medical Billing & Insurance Coding (ICD/CPT)        │
│  - Compliance, Legal & Audit Logging                  │
└────────────────────────────────────────────────────────┘
         │
         ▼
[Patient Portal (e.g. MyChart)] ───> View-only summaries / PDFs for Patients
```

- **Enterprise & Billing Centric**: These platforms were primarily engineered for clinical workflow efficiency, insurance billing optimization, and regulatory compliance—not consumer-facing data liquidity.
- **Patient Portals as Siloed Windows**: Patient portals typically offer read-only views, PDF downloads, or basic messaging with local care teams, rarely allowing complete, structured data export across institutions.

---

## Current State of Interoperability

Interoperability in hospital record systems is evolving across three main mechanisms:

1. **Enterprise Health Information Exchanges (HIEs)**:
   - Networks like *Carequality* and *CommonWell Health Alliance* enable participating hospitals to query records across institutional borders.
   - *Limitation*: Controlled by enterprise agreements; patient access is passive, opaque, and often incomplete.

2. **Standards & Protocols**:
   - **HL7 v2/v3**: Legacy messaging standard still powering laboratory and departmental feeds.
   - **C-CDA (Continuity of Care Document Architecture)**: XML-based summary exchange format.
   - **HL7 FHIR (Fast Healthcare Interoperability Resources)**: Modern RESTful JSON standard enabling resource-level data exchange.
   - **SMART on FHIR**: Open authorization profile (OAuth2/OpenID) allowing third-party applications to authenticate against EHR endpoints.

3. **Information Blocking & Mandates**:
   - Regulatory frameworks (such as the US 21st Century Cures Act) mandate standardized FHIR API access for patients without unreasonable delay.
   - *Observation*: Implementation varies widely; many health systems deploy bare-minimum API capabilities with restrictive rate limits or cumbersome developer access barriers.

---

## Structural Friction with Patient Empowerment

- Despite standardization efforts, [[Healthcare Data Silos]] persist because hospital systems lack native incentives to push data into user-controlled repositories.
- Understanding the exact API capabilities and limitations of these systems is crucial for defining how MedRec ingests and synchronizes health information.

---

## Key Research Questions
- What are the real-world error rates when querying patient records via SMART on FHIR endpoints?
- How do smaller independent clinics manage records outside of Epic/Cerner ecosystems?
- Tracked in [[Research Questions]].
