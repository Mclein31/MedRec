---
project: MedRec
type: concept
status: researching
created: 2026-08-24
updated: 2026-08-24
tags:
  - stakeholder
  - institution
  - enterprise-health
  - ehr-systems
related:
  - "[[Hospital Record Systems]]"
  - "[[Healthcare Data Silos]]"
  - "[[Doctors]]"
  - "[[Healthcare Administrators]]"
---

# Hospitals

Hospitals represent major institutional stakeholders within the healthcare ecosystem. They generate, store, and regulate massive volumes of patient diagnostic and treatment data through institutional [[Hospital Record Systems]] (such as Epic, Cerner, or proprietary hospital networks).

For MedRec, hospitals are both primary sources of medical documentation (discharge summaries, imaging, pathology reports) and institutional environments where [[Doctors]] and [[Healthcare Administrators]] operate under strict compliance rules.

## Institutional Characteristics

- **Walled Gardens**: Hospitals often create [[Healthcare Data Silos]], locking patient data within proprietary patient portals (e.g., MyChart) that do not easily interoperate across competing hospital systems.
- **Strict Compliance & Legal Liability**: Institutions are governed by stringent healthcare regulations (e.g., HIPAA, GDPR, local health privacy mandates) making them conservative about external data interchange.
- **Departmental Fragmentation**: Within a single hospital, records from radiology, laboratory, oncology, and surgery can sometimes be disjointed.

## Interaction with MedRec

- **Client-Side Data Extraction**: In early phases of MedRec, direct enterprise API integration with hospital systems is out of scope. MedRec relies on patient-mediated export (patients downloading their portal PDFs/records and importing them into MedRec).
- **Inbound Data Ingestion**: Facilitating how records from external sources can be presented to hospital staff without violating hospital IT policies.

## Current Working Assumptions

> [!NOTE]
> **Assumption**: Large hospital networks have little commercial incentive to support third-party consumer portability, making patient-mediated record capture the most viable strategy for MedRec.
> 
> **Assumption**: Patients frequently receive discharge paperwork as printed packets or unstandardized PDF downloads from hospital portals.
> 
> *These assumptions guide the early technical scope to focus on document parsing and storage over complex enterprise EHR integrations.*

## Open Questions

- What proportion of hospital patient portals offer standard CCDA or FHIR export directly to the patient?
- What are the most common hospital document types patients actually retain and need to carry forward?
