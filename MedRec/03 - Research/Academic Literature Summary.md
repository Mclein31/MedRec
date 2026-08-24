---
project: MedRec
type: research
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - research
  - literature
  - academic
  - papers
  - secondary-research
related:
  - "[[Literature Review]]"
  - "[[Research MOC]]"
  - "[[Research Findings]]"
  - "[[Research Questions]]"
---

# Academic Literature Summary

> [!NOTE]
> **Epistemic Status:** ⚪ `SECONDARY RESEARCH OBSERVATION`
> The studies, clinical trials, and quantitative metrics compiled in this note represent peer-reviewed academic literature and authoritative government/industry benchmarks. They provide the empirical foundation and baseline evidence for [[MedRec]]'s problem space and architectural hypotheses.

This document synthesizes key academic literature, seminal clinical trials, health informatics studies, and industry empirical benchmarks across patient access, personal health record (PHR) adoption, interoperability barriers, and health information exchange failures.

---

## 📑 Synthesized Academic Studies by Theme

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      Academic Literature Themes                           │
├──────────────────────────┬────────────────────────────────────────────────┤
│ 1. Patient Access & Notes│ OpenNotes trial, EHR error rates, HIPAA audits │
│ 2. PHR Adoption Factors  │ Systematic PHR reviews, equity & usability     │
│ 3. Interoperability & HIE│ EHR vendor lock-in, outside data integration   │
│ 4. Historical PHR Fail   │ Early untethered portal failure analyses       │
│ 5. Modern Architecture   │ SMART on FHIR foundational standard            │
└──────────────────────────┴────────────────────────────────────────────────┘
```

---

### Theme 1: Patient Experience & Record Access

#### 1. OpenNotes Multi-Center Evaluation (Delbanco et al., 2010 / 2012)
- **Citation:** Delbanco T, Walker J, Bell SK, Darer JD, Elmore JG, Farag N, Feldman HJ, Mejilla R, Ngo L, Ralston JD, Leveille SG, Delbanco R. *Inviting patients to read their doctors' notes: a quasi-experimental study and a look ahead.* Annals of Internal Medicine, 2012; 157(7):461-470.
- **Study Scale & Design:** Quasi-experimental trial across 105 primary care physicians and **13,564 patients** at Beth Israel Deaconess Medical Center, Geisinger Health System, and Harborview Medical Center.
- **Key Findings:**
  - **82% to 89%** of patients opened and read their clinical notes across all participating hospital sites.
  - **77% to 87%** of patients reported feeling "more in control of their care" and better understood their treatment plans.
  - **60% to 78%** reported increased adherence to prescribed medications.
  - Physician concerns regarding overwhelming patient message volume or anxiety did not materialize (<5% of doctors reported longer visits).
- **DOI:** `10.7326/0003-4819-157-7-201210020-00002`
- **Relevance to MedRec:** Demonstrates that patients actively utilize raw clinical documentation when made accessible, directly validating [[Patient Data Ownership]] and [[Patient Frustrations]].

#### 2. Patient-Identified EHR Errors (Bell et al., 2020)
- **Citation:** Bell SK, Delbanco T, Elmore JG, Fitzgerald PS, Fossa A, Harcourt K, Leveille SG, Payne TH, Saarimaki A, Stametz R, Walker J, DesRoches CM. *Frequency and Types of Patient-Reported Errors in Electronic Health Record Notes.* JAMA Network Open, 2020; 3(6):e205869.
- **Study Scale & Design:** Cross-sectional survey of **29,656 patients** who read at least one note online across 3 US healthcare systems.
- **Key Findings:**
  - **21.1% (1 in 5 patients)** identified an error in their EHR clinical notes upon reading them.
  - **42.3%** of those reporting an error characterized it as **serious** (e.g., wrong medication, incorrect diagnosis, wrong medical history, erroneous lab interpretation).
  - Older, sicker patients were more likely to find serious inaccuracies.
- **DOI:** `10.1001/jamanetworkopen.2020.5869`
- **Relevance to MedRec:** Proves that patient-held records act as a vital safety audit layer. MedRec enables patients to spot and reconcile dangerous discrepancies before consultations (see [[Incomplete Medical History]]).

#### 3. Hospital Non-Compliance with HIPAA Medical Record Requests (Lye et al., 2018)
- **Citation:** Lye CT, Forman HP, Gao R, Daniel JG, Hsiao AL, Mann MK, DeSalvo KB, Krumholz HM. *Assessment of US Hospital Compliance With Regulations for Patient Access to Medical Records.* JAMA Network Open, 2018; 1(6):e183014.
- **Study Scale & Design:** Cross-sectional mystery-shopper audit of the top **83 US hospitals** across 29 states evaluating compliance with 45 CFR § 164.524.
- **Key Findings:**
  - **43%** of top-ranked US hospitals failed to disclose standard fee schedules as legally required.
  - Fees for a 200-page medical record ranged wildly from **$0.00 to over $500.00** across institutions.
  - Severe processing discrepancies: 48% of hospitals gave request forms with non-compliant processing times exceeding federal/state limits.
  - Significant format restrictions: Many institutions refused digital/email transfer despite federal mandates.
- **DOI:** `10.1001/jamanetworkopen.2018.3014`
- **Relevance to MedRec:** Quantifies the friction in manual record acquisition and highlights why direct digital API sync (SMART on FHIR) is mandatory to bypass bureaucratic request obstacles (see [[Manual Record Transfer]] and [[Delayed Healthcare Access]]).

---

### Theme 2: Personal Health Record (PHR) Adoption & Barriers

#### 4. Systematic Review of PHR Barriers & Facilitators (Roehrs et al., 2017)
- **Citation:** Roehrs A, da Costa CA, Righi RDR, de Oliveira KSF. *Personal Health Records: A Systematic Literature Review.* Journal of Medical Internet Research (JMIR), 2017; 19(1):e13.
- **Study Scale & Design:** Systematic literature review analyzing **145 peer-reviewed PHR studies**.
- **Key Findings:**
  - Standalone, manually populated PHRs exhibit catastrophic abandonment rates (>80%) within 6 months due to high data-entry friction.
  - Primary adoption barriers: privacy/security fears, poor UI/UX, lack of automated EHR synchronization, and absence of physician endorsement.
  - Primary facilitators: automated bidirectional data sync, mobile accessibility, timeline visualizations, and unified record aggregation across providers.
- **DOI:** `10.2196/jmir.5876`
- **Relevance to MedRec:** Confirms that manual data entry is a product death sentence. MedRec must prioritize automated FHIR ingestion, OCR/document parsing, and local zero-knowledge security to overcome user friction and distrust.

#### 5. Socioeconomic Factors and Portal Utilization (Ancker et al., 2015)
- **Citation:** Ancker JS, Osorio SN, Cheriff A, Cole CL, Silver M, Kaushal R. *Patient activation and use of an electronic patient portal.* Journal of the American Medical Informatics Association (JAMIA), 2015; 22(e1):e254-e260.
- **Key Findings:**
  - Patient portal adoption strongly correlates with chronic illness burden, educational attainment, and baseline health literacy.
  - When provided with intuitive, mobile-friendly interfaces and clear record summaries, demographic disparities in portal usage significantly narrowed.
- **DOI:** `10.1093/jamia/ocv012`
- **Relevance to MedRec:** Informs [[User Personas]] and emphasizes that clean typography, plain-language clinical translations, and low cognitive overhead are essential for broad accessibility.

---

### Theme 3: Interoperability Challenges & EHR Market Dynamics

#### 6. Hospital Capability to Integrate Outside Clinical Data (Holmgren et al., 2017)
- **Citation:** Holmgren AJ, Patel V, Adler-Milstein J. *Progress In Interoperability: Measure-By-Measure Overview Of US Hospitals.* Health Affairs, 2017; 36(10):1820-1827.
- **Study Scale & Design:** National survey analyzing electronic health information exchange capabilities across ~4,000 US acute care hospitals.
- **Key Findings:**
  - While **88%** of hospitals could electronically send patient data and **74%** could receive data:
  - **Only 38%** of hospitals possessed the technical capability to **INTEGRATE** outside clinical data into their EHR without manual human re-entry or transcription.
  - Providers cited disparate data schemas, unstructured PDFs, and vendor-walled silos as primary integration bottlenecks.
- **DOI:** `10.1377/hlthaff.2017.0546`
- **Relevance to MedRec:** Highlights the "last mile" failure in provider-to-provider HIE. When hospitals cannot ingest outside records, the patient becomes the only reliable transport layer (see [[Healthcare Data Silos]]).

#### 7. Vendor Lock-In & Cross-EHR Exchange Friction (Adler-Milstein et al., 2021)
- **Citation:** Adler-Milstein J, Everson J, Holmgren AJ. *Strategic information blocking in health information exchanges.* Journal of the American Medical Informatics Association (JAMIA), 2021; 28(6):1120-1127.
- **Key Findings:**
  - Clinical data moves with high fidelity *within* a single EHR vendor ecosystem (e.g., Epic Care Everywhere to Epic), but encounters substantial latency, data truncation, and format degradation when crossing vendor boundaries (e.g., Epic to Cerner/Oracle or AthenaHealth).
  - Proprietary schema extensions and selective API throttling serve as de facto anti-competitive lock-in mechanisms.
- **DOI:** `10.1093/jamia/ocaa330`
- **Relevance to MedRec:** Direct proof of why patient-mediated interoperability (using client-held standardized FHIR JSON) is necessary to bridge heterogeneous vendor architectures.

---

### Theme 4: Historical Personal Health Record Failures

#### 8. Structural Causes of Early PHR Failures (Steinbrook, 2008)
- **Citation:** Steinbrook R. *Personally Controlled Online Health Records — The Promise and the Reality.* New England Journal of Medicine (NEJM), 2008; 359(16):1653-1656.
- **Analysis:** Post-mortem and systemic critique of first-generation consumer PHR platforms (such as Google Health v1 and early Microsoft HealthVault).
- **Core Diagnosis:**
  - Early PHRs failed because they relied on consumers to manually type complex medication regimens and lab values into web forms.
  - In 2008, providers lacked legal mandates (pre-Cures Act) and standard protocols (pre-FHIR) to stream real-time structured data feeds to patient apps.
  - Untethered PHRs without standardized API pipelines suffered from stale, incomplete, and unverified data.
- **DOI:** `10.1056/NEJMp0800922`
- **Relevance to MedRec:** Establishes the historical lessons: MedRec succeeds only by leveraging modern automated SMART on FHIR APIs, USCDI v3 mandates, and instant digital imports.

---

### Theme 5: Modern API Architectures

#### 9. SMART on FHIR Foundational Specification (Mandel et al., 2016)
- **Citation:** Mandel JC, Kreda DA, Mandl KD, Kohane IS, Ramoni RB. *SMART on FHIR: a standards-based, interoperable apps platform for electronic health records.* Journal of the American Medical Informatics Association (JAMIA), 2016; 23(5):899-908.
- **Key Findings:**
  - Designed and demonstrated the "Substitutable Medical Applications, Reusable Technologies" (SMART) platform on top of HL7 FHIR.
  - Proved that cross-vendor app portability is achievable without custom backend integration for each proprietary hospital system.
  - Standardized OAuth 2.0 / OpenID Connect profile for granular, patient-authorized app access.
- **DOI:** `10.1093/jamia/ocw089`
- **Relevance to MedRec:** The cornerstone technical architecture underpinning MedRec's provider connection pipeline (see [[Regulatory Landscape]]).

---

## 📊 Key Empirical Statistics & Industry Benchmarks

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    Healthcare Records Fragmentation Index                 │
├──────────────────────────────────────────┬────────────────────────────────┤
│ Patients offered online portal access    │ 77% (ONC 2025 National Report) │
│ Patients who accessed records in 2024    │ 65% (Up from 40% in 2020)      │
│ Accessing via mobile smartphone apps     │ 57% (Primary access vector)    │
│ Hospitals relying on fax/mail for outside│ 69% - 71% (AHA Survey)         │
│ Medical practices with active fax lines  │ 89% (AMA Industry Report)      │
│ Primary care visits with missing info    │ 13.6% (Smith et al., JAMA)     │
│ Primary care care compromised by gaps    │ 48% of missing-info visits     │
│ Emergency Department information gaps    │ 32.2% of visits (Stiell et al.)│
│ Malpractice claims from comms breakdown  │ ~30% ($1.7B+ losses, CRICO)    │
│ Master Patient Index (MPI) error rate    │ 8% - 20% across health systems │
│ TEFCA federated records exchanged        │ > 1 Billion (by mid-2026)      │
└──────────────────────────────────────────┴────────────────────────────────┘
```

### Critical Clinical Safety & Cost Metrics

1. **Clinical Information Gaps in Primary Care:**
   - *Smith et al. (JAMA 2005; 293(5):565-571):* In **13.6% of all primary care visits**, treating clinicians lacked critical clinical information (prior lab results, imaging, specialty consult notes).
   - In **48% of those cases**, physicians reported that the missing data **compromised patient care**, resulting in delayed treatments, duplicated diagnostic tests, and increased costs.
2. **Emergency Department Vulnerability:**
   - *Stiell et al. (CMAJ 2003; 169(12):1293-1298):* **32.2% of emergency department presentations** suffered from significant clinical information gaps, directly increasing ED length of stay by 1.2 hours and doubling repeat testing rates.
3. **Malpractice & Financial Liability:**
   - *CRICO Strategies National Malpractice Study:* Communication breakdowns and missing clinical records were identified in **~30% of medical malpractice claims**, representing over **$1.7 billion** in direct malpractice payouts and contributing to thousands of preventable adverse events.
4. **Master Patient Index (MPI) Duplication & Mismatch:**
   - Across disparate healthcare systems and regional HIEs, duplicate record rates and patient mismatch errors range between **8% and 20%** (AHIMA / ONC benchmarks), leading to fractured patient charts and medical errors.

---

## 👩‍🔬 Notable Researchers & Thought Leaders

| Researcher / Group | Institution | Core Focus Area | Foundational Contribution |
| :--- | :--- | :--- | :--- |
| **Kenneth Mandl, MD, MPH** & **Isaac Kohane, MD, PhD** | Harvard Medical School / Boston Children's CHIP | SMART on FHIR, Health IT Standards | Co-creators of the SMART platform; pioneers of the "app store" model for healthcare. |
| **Julia Adler-Milstein, PhD** & **Jay Holmgren, PhD** | UCSF Center for Clinical Informatics and Improvement Research (CLIIR) | Interoperability & Health Policy | National empirical tracking of HIE adoption, information blocking, and EHR vendor competition. |
| **Harlan Krumholz, MD, SM** | Yale University School of Medicine / CORE | Patient Data Rights & Clinical Transparency | Trailblazing audits of hospital HIPAA compliance; founder of Hugo Health patient data platform. |
| **Tom Delbanco, MD** & **Jan Walker, RN, MBA** | Harvard Medical School / Beth Israel Deaconess | Clinical Transparency & Patient Empowerment | Co-founders of the OpenNotes movement, proving clinical note sharing improves safety and trust. |
| **Jessica Ancker, PhD, MPH** & **Courtney Lyles, PhD** | Vanderbilt University / UCSF | Health Equity & Digital Disparities | Research on patient portal usability, cognitive barriers, and digital health equity across diverse populations. |

---

## 🔗 Related Notes
- [[Literature Review]]
- [[Regulatory Landscape]]
- [[Research MOC]]
- [[Research Findings]]
- [[Research Questions]]
- [[Medical Record Portability]]
- [[Healthcare Data Silos]]
- [[Patient Data Ownership]]
- [[Incomplete Medical History]]
- [[Delayed Healthcare Access]]
- [[Duplicate Medical Records]]
- [[Lost Medical Records]]
