---
project: MedRec
type: concept
status: active
created: 2026-08-24
updated: 2026-08-24
tags:
  - moc
  - research
  - index
  - medrec
related:
  - "[[MedRec]]"
  - "[[MedRec Dashboard]]"
  - "[[MedRec MOC]]"
  - "[[Competitive Landscape]]"
  - "[[Regulatory Landscape]]"
  - "[[Academic Literature Summary]]"
---

# Research Map of Content (MOC)

This note serves as the central index and entry point for all research activities, methodologies, inquiries, and empirical discoveries for the [[MedRec]] project.

As a solo developer project, research rigor is essential to ensure I am building something that solves genuine, verifiable problems rather than chasing unfounded assumptions.

---

## 🧭 Research Structure & Navigation

```
                                  [[Research MOC]]
                                         │
     ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
     │                   │                               │                   │
[[Research Questions]]   [[Research Hypotheses]]   [[Research Methods]]   [[Research Gaps]]
     │                   │                               │                   │
     ├─────────┬─────────┘                   ┌───────────┴───────────┐       │
     │         │                             │                       │       │
     ▼         ▼                     [[Qualitative Research]] [[Quantitative Research]]
[[Landscape Research]]                       │                       │       │
  - [[Competitive Landscape]]        [[Interview Questions]]         │       │
  - [[Regulatory Landscape]]                 │                       │       │
  - [[Academic Literature Summary]]  [[Interview Notes]]             │       │
  - [[Literature Review]]                    │                       │       │
     │                                       │                       │       │
     └────────────────────────┬──────────────┴───────────────────────┘       │
                              ▼                                              │
                     [[Research Findings]] ◄─────────────────────────────────┘
                              │
                     [[Research Themes]]
                              │
                     [[Research Insights]]
                              │
                     [[User Needs]] / [[Requirements MOC]]
```

---

## 🌐 Landscape Research

Synthesized landscape overviews establishing the competitive, legal, standards, and academic context for MedRec:

- **[[Competitive Landscape]]**: Teardowns and positioning of existing personal health record tools (Apple Health Records, Epic MyChart, Guava Health, Fasten Health, PicnicHealth), failure post-mortems (Microsoft HealthVault, Google Health v1), and MedRec's market whitespace.
- **[[Regulatory Landscape]]**: Comprehensive overview of ONC 21st Century Cures Act, Information Blocking rules, USCDI / FHIR R4 mandates, HIPAA covered-entity boundaries vs FTC Health Breach Notification Rule, TEFCA, and state health privacy statutes (CCPA/CPRA, Washington My Health My Data Act).
- **[[Academic Literature Summary]]**: Empirical studies, statistics, and clinical benchmarks (Holmgren et al. hospital integration gap, Smith et al. missing data prevalence, ONC fax reliance, MPI error rates, 80% unstructured data challenge, and Kleppmann local-first principles).

---

## 📌 Core Inquiries & Hypotheses

- **[[Research Questions]]**: Foundational questions about patient workflows, provider friction, legal constraints, and technical feasibility.
- **[[Research Hypotheses]]**: Falsifiable statements currently undergoing testing (e.g., manual transfer bottlenecks, patient willingness to self-manage records).
- **[[Research Gaps]]**: Identified knowledge deficits that require targeted primary or secondary research.

---

## 📚 Secondary Research & Literature

- **[[Literature Review]]**: Tracker and catalog of academic papers, industry reports, healthcare interoperability whitepapers, and existing market research.

---

## 🔬 Research Methodologies

- **[[Qualitative Research]]**: Methodological framework for semi-structured user interviews, contextual inquiries, and clinical workflow observations.
- **[[Quantitative Research]]**: Strategy for user surveys, metric benchmarks (transfer latency, error rates), and prototype usage telemetry.

---

## 🎙️ Data Collection

- **[[Interview Questions]]**: Draft interview guide organized by patient journey stages, pain points, privacy expectations, and record-handling habits.
- **[[Interview Notes]]**: Registry and atomic notes of all primary qualitative interview sessions and observational logs.

---

## 📊 Synthesis & Translation

- **[[Research Findings]]**: Validated empirical findings categorized using the epistemic taxonomy (Assumption, Hypothesis, Observation, Finding, Conclusion).
- **[[Research Themes]]**: Higher-level thematic clusters that emerge across multiple research streams.
- **[[Research Insights]]**: Strategic takeaways translating findings into actionable requirements for [[Functional Requirements]] and [[Product Design]].

---

## 🔗 Knowledge Hierarchy & Traceability

I maintain an explicit traceability chain to ensure every design choice is grounded:

$$\text{Observation / Data} \longrightarrow \text{Finding} \longrightarrow \text{Theme} \longrightarrow \text{Insight} \longrightarrow \text{Requirement} \longrightarrow \text{Feature}$$

Related Vault MOCs:
- [[MedRec Dashboard]]
- [[MedRec MOC]]
- [[Problem Space MOC]]
- [[Users MOC]]
- [[Requirements MOC]]
- [[Architecture MOC]]
