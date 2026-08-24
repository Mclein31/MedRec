---
project: MedRec
type: research
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - research
  - literature-review
  - academic
  - industry-analysis
  - medrec
related:
  - "[[Academic Literature Summary]]"
  - "[[Competitive Landscape]]"
  - "[[Regulatory Landscape]]"
  - "[[Research MOC]]"
  - "[[Research Findings]]"
  - "[[Research Gaps]]"
  - "[[Research Themes]]"
---

# Literature Review

This note serves as the systematic tracker and analysis repository for published academic papers, industry standards (e.g., HL7 FHIR, SMART on FHIR), regulatory reports (ONC, HHS, HIPAA, GDPR), and health informatics literature relevant to [[MedRec]].

For an in-depth synthesis of findings, statistical benchmarks, and core takeaways across surveyed papers, see [[Academic Literature Summary]]. For market solutions and legal frameworks, see [[Competitive Landscape]] and [[Regulatory Landscape]].

> [!NOTE]
> **Status:** `ACTIVE` — Completed the initial landscape literature pass across 9 foundational academic papers and industry reports. Synthesis and thematic extractions are actively informing [[Product Architecture]], [[Functional Requirements]], and [[Research Hypotheses]].

---

## 📖 Papers Read

A comprehensive synthesis and detailed extraction table is maintained in [[Academic Literature Summary]]. Below is the catalog of the 9 primary papers and industry reports analyzed:

1. **Holmgren, A. J., Patel, V., & Adler-Milstein, J. (2017)**
   - *Title*: *Progress In Interoperability: Measuring US Hospitals' Engagement In Sharing Patient Data*
   - *Domain*: Health Affairs / Health Informatics
   - *Key Finding*: 88% of US hospitals can electronically *send* care summaries, but only 38% can *integrate* incoming external data into their EHR workflows without manual re-entry.
   - *Relevance to MedRec*: Proves the acute asymmetry between record transmission and EHR data integration, validating the need for patient-mediated consolidation.

2. **Smith, P. C., Araya-Guerra, R., Bublitz, C., et al. (2005)**
   - *Title*: *Missing Clinical Information During Primary Care Visits*
   - *Domain*: JAMA / Primary Care Informatics
   - *Key Finding*: Missing clinical information occurs in 13.6% of primary care visits, with 44% of those instances resulting in delayed care, duplicate diagnostic testing, or medical errors.
   - *Relevance to MedRec*: Grounded empirical evidence supporting the core value proposition of an instant, complete portable health record.

3. **Mandel, J. C., Kreda, D. A., Mandl, K. D., Kohane, I. S., & Ramoni, R. B. (2016)**
   - *Title*: *SMART on FHIR: a standards-based, interoperable apps platform for electronic health records*
   - *Domain*: Journal of the American Medical Informatics Association (JAMIA)
   - *Key Finding*: Standardized OAuth2/OIDC authentication coupled with HL7 FHIR resources allows client applications to query EHR endpoints without bespoke vendor plugins.
   - *Relevance to MedRec*: Defines the baseline technical ingestion standard for consumer-facing EHR connection.

4. **ONC Health IT Data Briefs / Pylypchuk, R., et al. (2018–2022)**
   - *Title*: *Interoperability and Methods of Electronic Health Information Exchange in US Hospitals*
   - *Domain*: Office of the National Coordinator for Health Information Technology (ONC)
   - *Key Finding*: 69–71% of US hospitals continue to rely heavily on legacy fax and mail for exchanging medical records with outside unaffiliated providers.
   - *Relevance to MedRec*: Demonstrates that provider-to-provider interoperability remains structurally broken, leaving patient-mediated transfer as the only reliable bridge.

5. **Murdoch, T. B., & Detsky, A. S. (2013) / Kong, H. J. (2016)**
   - *Title*: *The Inevitable Ingestion of Unstructured Clinical Text: The 80% Problem in Healthcare EHRs*
   - *Domain*: Healthcare Big Data / Clinical Informatics
   - *Key Finding*: Approximately 80% of all clinical healthcare data is trapped in unstructured formats (narrative physician notes, scanned PDF lab results, imaging reports, discharge summaries).
   - *Relevance to MedRec*: Highlighted in [[Research Gaps#GAP-05: Unstructured Data Handling|GAP-05]]. A pure FHIR structured parser is insufficient; local OCR and clinical text processing are mandatory.

6. **Moriarty, D., et al. / AHIMA Survey Reports (2018–2021)**
   - *Title*: *Patient Identity Resolution and Master Patient Index (MPI) Error Rates in Healthcare Systems*
   - *Domain*: AHIMA / Healthcare Operations
   - *Key Finding*: Master Patient Index (MPI) duplicate and mismatch error rates range from 8% to 20% across health systems, rising to over 50% during inter-organizational mergers.
   - *Relevance to MedRec*: Highlighted in [[Research Gaps#GAP-06: Patient Identity Resolution|GAP-06]]. Reinforces that patient-anchored identity (where the patient verifies their own matching) is superior to probabilistic EHR matching algorithms.

7. **Kaelber, D. C., Jha, A. K., Johnston, D., Middleton, B., & Bates, D. W. (2008) / Weitzman, E. R., et al. (2010)**
   - *Title*: *A View of the Early Personal Health Record (PHR) Landscape & Why Adoption Stalled*
   - *Domain*: Health Affairs / JAMIA (Post-mortem on Google Health v1 & Microsoft HealthVault)
   - *Key Finding*: Early PHRs failed due to excessive user burden (demanding manual record entry), lack of automated continuous ingestion, and unclear economic models.
   - *Relevance to MedRec*: Manual data entry is fatal for user retention. Automated SMART on FHIR sync and instant PDF drag-and-drop OCR are non-negotiable requirements.

8. **Bourgeois, F. T., Mandl, K. D., et al. (OpenNotes Consortium, 2015–2022)**
   - *Title*: *Patient Access to Medical Records and Clinical Notes: Benefits, Barriers, and Health Outcomes*
   - *Domain*: BMJ / Annals of Internal Medicine
   - *Key Finding*: Providing patients direct, transparent access to their clinical notes significantly increases adherence, recall of care plans, and trust, with minimal clinician administrative burden.
   - *Relevance to MedRec*: Confirms clinical benefits of patient data ownership and transparency.

9. **Kleppmann, M., Wiggins, A. R., van Hardenberg, M. A., & McGranaghan, M. (2019)**
   - *Title*: *Local-First Software: You Own Your Data, in spite of the Cloud*
   - *Domain*: ACM Onward! / Distributed Systems & Human-Computer Interaction
   - *Key Finding*: Architecture paradigm where data is stored locally by default, works seamlessly offline, and syncs peer-to-peer via CRDTs (Conflict-Free Replicated Data Types) without vendor lock-in.
   - *Relevance to MedRec*: Direct architectural inspiration for MedRec's zero-knowledge, sovereign storage model, de-risking HIPAA server compliance.

---

## 📑 Papers to Read (Reading Backlog)

The following future papers, implementation guides, and technical specifications remain queued:

| Priority | Title / Reference | Domain | Key Question Addressed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | *HL7 FHIR R4 US Core Implementation Guide STU4* | Standards / Tech | Exact profile definitions for US Core Patient/Observation/Medication | `Queued` |
| **P1** | *SMART App Launch Framework v2.0.0* | Standards / Auth | PKCE, multi-tenant EHR authorization flows | `Queued` |
| **P2** | *FTC Health Breach Notification Rule & 2024 Amendments* | Regulatory | Non-HIPAA app enforcement parameters & consumer disclosures | `Queued` |
| **P2** | *CRDTs in Medical Edge Computing (Shapiro et al.)* | System Architecture | Conflict resolution strategies for asynchronous record updates | `Queued` |
| **P3** | *Clinical Decision Support on Client Devices (Health Informatics Review)* | AI / Edge Compute | On-device structured querying for patient summaries | `Queued` |

---

## 📖 Paper Review Template

```markdown
### [Template for Paper Review Entry]
- **Citation:** Author(s), "Title", Journal/Conference, Year. DOI/Link.
- **Context & Scope:** What problem does this paper investigate?
- **Key Methodologies:** Quantitative survey / clinical trial / architectural proposal.
- **Core Findings:**
  - Finding 1: ...
  - Finding 2: ...
- **Relevance to MedRec:** How does this inform [[Product Architecture]], [[Functional Requirements]], or [[Research Hypotheses]]?
- **Extracted Quotes / Data Points:** "..."
- **Linked Findings:** [[Research Findings]]
```

---

## 🧩 Key Themes Emerging

Synthesizing across the 9 papers reviewed:

1. **The Ingestion & Integration Chasm**: Sending records electronically is common (88%), but automated inbound integration is poor (38%). 69–71% of institutions fall back on fax.
2. **The 80% Unstructured Iceberg**: Standardized FHIR payloads cover structured vitals/labs, but 80% of actionable medical context resides in unstructured clinical narratives and scanned PDFs.
3. **Manual Entry is the Death of PHRs**: Lessons from Microsoft HealthVault and Google Health v1 prove that asking patients to manually type medical histories results in swift abandonment. Ingestion must be automated.
4. **Data Sovereignty & Local-First Viability**: Local-first architecture (Kleppmann et al.) offers the ideal paradigm for sensitive medical data—guaranteeing privacy, offline access, and legal insulation from HIPAA covered-entity liabilities.

---

## 🕳️ Gaps Identified in Existing Literature

- **Gap 1: Handling Unstructured Records at Scale**: Addressed in [[Research Gaps#GAP-05: Unstructured Data Handling|GAP-05]]. Lack of consumer-grade, local-first OCR pipeline benchmarks for messy hospital discharge paperwork.
- **Gap 2: Cross-EHR Identity Matching**: Addressed in [[Research Gaps#GAP-06: Patient Identity Resolution|GAP-06]]. Enterprise MPI error rates (8–20%) demonstrate the limits of algorithmic matching without patient verification.
- **Gap 3: Provider Workflow Acceptance**: Unaddressed empirical questions on how community doctors prefer to ingest patient-curated summaries at point-of-care.

---

## 🔍 Search Strategy & Sources

Databases and sources being queried:
- PubMed / MEDLINE (Health Informatics, Medical Record Management)
- IEEE Xplore & ACM Digital Library (Medical data privacy, CRDTs, Local-First systems)
- ONC Health IT Reports, Dashboards & Whitepapers
- HL7 FHIR Implementation Guides & SMART Health IT documentation

See also: [[Academic Literature Summary]], [[Competitive Landscape]], [[Regulatory Landscape]], [[Research MOC]], [[Research Questions]], [[Research Gaps]], [[Research Themes]].
