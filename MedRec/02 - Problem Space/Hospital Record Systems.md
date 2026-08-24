---
project: MedRec
type: concept
status: active
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
  - "[[Academic Literature Summary]]"
  - "[[Competitive Landscape]]"
  - "[[Regulatory Landscape]]"
---

# Hospital Record Systems

**Hospital Record Systems**, primarily known as **Electronic Health Record (EHR)** or **Electronic Medical Record (EMR)** platforms, constitute the core digital operating systems of modern medical enterprises.

They manage the creation, storage, billing, and clinical review of all patient [[Medical Records]] within hospital networks and clinical practices.

---

## The Landscape: Major Platforms & Market Power

The North American and global hospital market is heavily consolidated across a small cadre of enterprise EHR vendors:

1. **Epic Systems**:
   - *Market Position*: The undisputed enterprise market leader, covering ~160M+ US patient lives via its proprietary **MyChart** portal ecosystem and large academic medical center networks.
   - *Integration*: Connects internally via Epic Care Everywhere, but imposes high barriers and walled-garden constraints on external consumer applications.

2. **Oracle Health (formerly Cerner)**:
   - *Market Position*: Deep penetration in large enterprise health systems, international hospitals, and US federal government healthcare (DoD and Veterans Affairs via *MHS GENESIS*).
   - *Integration*: Exposes Cerner Millennium APIs and SMART on FHIR endpoints.

3. **Athenahealth**:
   - *Market Position*: Dominant player among ambulatory clinics, independent practices, and outpatient physician groups; cloud-native multi-tenant infrastructure with open REST/FHIR APIs.

4. **MEDITECH & Veradigm (Allscripts)**:
   - *Market Position*: Widespread in community hospitals, mid-sized regional facilities, and specialized outpatient clinics.

---

## Regulatory Mandate: Standardized FHIR R4 APIs

Under the **ONC 21st Century Cures Act Final Rule** (45 CFR § 170.315(g)(10)), **all certified EHR vendors must expose standardized HL7 FHIR R4 endpoints** with SMART on FHIR OAuth2 authentication for patient-directed access without "information blocking" or custom development fees.

While this legally guarantees MedRec the right to query patient records, real-world implementation creates severe operational friction.

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

## Current State of Interoperability: Empirical Observations

Secondary research reveals a stark discrepancy between vendor claims and clinical realities:

> [!NOTE]
> **Secondary Research Observation (Holmgren et al., 2017)**:
> While **88% of US hospitals can electronically *send* care summaries**, only **38% can electronically *integrate* outside clinical data** into their EHR records without manual re-keying or document re-attachment.

> [!NOTE]
> **Secondary Research Observation (ONC Health IT Data Briefs)**:
> **69–71% of US hospitals still rely on legacy fax and mail** to exchange patient medical records with outside, unaffiliated providers.

### The Three Interoperability Mechanisms:
1. **Enterprise Health Information Exchanges (HIEs)**:
   - Networks like *Carequality* and *CommonWell Health Alliance* enable participating enterprise hospitals to query records across institutional borders.
   - *Limitation*: Controlled by enterprise agreements; patient access is passive, opaque, and often incomplete.

2. **Standards & Protocols**:
   - **HL7 v2/v3**: Legacy messaging standard still powering laboratory feeds.
   - **C-CDA (Continuity of Care Document Architecture)**: XML-based summary exchange format.
   - **HL7 FHIR R4**: Modern RESTful JSON standard enabling resource-level data exchange.
   - **SMART on FHIR**: Open authorization profile (OAuth2/PKCE) allowing third-party applications to authenticate against EHR endpoints.

3. **Information Blocking Penalties**:
   - The Office of Inspector General (OIG) enforces civil monetary penalties (up to $1M per violation) against EHR vendors and health systems engaging in anti-competitive information blocking.

---

## Structural Friction with Patient Empowerment

- Despite standardization efforts, [[Healthcare Data Silos]] persist because hospital systems lack native economic incentives to push data into user-controlled repositories.
- Providers fear liability, record collision, and clinical workflow disruption from unstructured external data.
- Understanding the exact API capabilities and limitations of Epic, Cerner, and Athenahealth is crucial for defining how MedRec ingests and synchronizes health information locally.

---

## Key Research Questions
- What are the real-world error and timeout rates when querying patient records via SMART on FHIR endpoints across Epic vs Cerner?
- How do smaller independent clinics manage records outside of major EHR ecosystems?
- Tracked in [[Research Questions]], [[Competitive Landscape]], [[Regulatory Landscape]], and [[Academic Literature Summary]].
