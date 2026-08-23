---
project: MedRec
type: problem
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - risks
  - product-risks
  - user-experience
  - product-market-fit
  - competition
related:
  - "[[Problems MOC]]"
  - "[[User Needs]]"
  - "[[Research Questions]]"
  - "[[User Pain Points]]"
  - "[[Product Design MOC]]"
---

# Product Risks

Anticipated product, usability, and market adoption risks for **MedRec**. These represent threats to real-world utility, user engagement, and product feasibility.

---

## ⚠️ Anticipated Product Risks

### 1. Solution Failing to Address Real Core User Needs
- **Nature**: *Anticipated Product-Market Fit Risk*
- **Severity**: 🔴 High
- **Description**: While data fragmentation is objectively a major healthcare problem, the patient-side experience might be infrequent enough (e.g., healthy people visit clinics only once a year) that they lack the motivation to install and maintain a dedicated medical record app.
- **Mitigation Strategy**:
  - Target high-frequency, high-pain personas initially: patients managing chronic illnesses, parents managing family immunizations/pediatric records, and individuals undergoing frequent specialist referrals &rarr; [[User Personas]], [[User Needs]].
  - Validate core value proposition early through user interviews before building extensive feature sets &rarr; [[Research Questions]].

### 2. Excessive Usability & Cognitive Complexity for Non-Technical Users
- **Nature**: *Anticipated UX Risk*
- **Severity**: 🔴 High
- **Description**: Medical terminology, laboratory reference ranges, and cryptographic key management are confusing to everyday users. If the app feels like an enterprise database or requires manual data entry of dozens of fields, abandonment will be high.
- **Mitigation Strategy**:
  - Keep document ingestion dead simple: snap a photo / upload a PDF, auto-extract title/date/doctor, and let the user organize in one tap &rarr; [[Digital Medical Records]].
  - Hide cryptographic complexity under familiar mobile patterns (Face ID / biometrics instead of displaying raw passphrases) &rarr; [[Product Design MOC]].

### 3. Competition from Incumbent Tech Giants and EHR Portals
- **Nature**: *Anticipated Competitive Risk*
- **Severity**: 🟡 Medium
- **Description**: Apple Health, Google Health Connect, and health system portals (Epic MyChart) possess enormous engineering resources and platform leverage.
- **Mitigation Strategy**:
  - Focus on **cross-system independence and sovereign portability**: Apple Health does not offer seamless web-mediated temporary QR sharing to non-Apple clinics; MyChart locks patients within specific hospital networks &rarr; [[Medical Record Portability]].
  - MedRec's differentiator is being patient-owned, platform-agnostic, and frictionlessly shareable with any doctor via standard web/QR access.

---

## 🔗 Related Product Links
- [[User Needs]] — Synthesized user requirements and expectations
- [[User Pain Points]] — Specific frustrations with current record systems
- [[Problems MOC]] — Master problems map
- [[Research Questions]] — Open product inquiries
