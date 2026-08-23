---
project: MedRec
type: design
status: proposed
created: 2026-08-24
updated: 2026-08-24
tags:
  - medrec
  - design
  - ui
  - styling
  - design-system
related:
  - "[[Wireframes]]"
  - "[[Product Design MOC]]"
  - "[[Design Decisions]]"
  - "[[Medical Record Categories]]"
---

# UI Concepts

## Overview
This document tracks visual design explorations, UI mood boards, typography standards, color palettes, component library selections, and design tokens for the MedRec application.

*Status Note*: High-fidelity concepts, component specifications, and screenshot mockups will be added here as UI exploration progresses.

---

## 🎨 Visual Identity & Design System Directions

### 1. Design Principles
- **Clinical Clarity with Warmth**: Trustworthy, clean medical aesthetics without feeling cold, intimidating, or overly sterile.
- **High Readability**: Clear contrast ratios meeting WCAG 2.1 AA standards, large touch targets, and crisp sans-serif typography.
- **Data Denseness with Breathing Room**: Balancing dense clinical information with structured card layouts and sufficient whitespace.

### 2. Proposed Color Palette (Exploratory)
- **Primary / Brand**: Medical Teal / Cyan (`#0E7490` / `#06B6D4`) — represents hygiene, precision, and tranquility.
- **Secondary / Action**: Deep Slate (`#0F172A`) for typography and high-emphasis controls.
- **Accent / Alert**: Crimson / Coral (`#EF4444`) for emergency badges and critical allergy alerts.
- **Category Colors**:
  - *Consultations*: Blue (`#3B82F6`)
  - *Labs & Diagnostics*: Emerald (`#10B981`)
  - *Prescriptions*: Violet (`#8B5CF6`)
  - *Imaging / Radiology*: Amber (`#F59E0B`)

### 3. Typography Explorations
- **Primary Mobile Font**: System native fonts (`Inter` / `-apple-system` / `Roboto`) for optimal rendering performance and platform familiarity.
- **Monospace Font**: `JetBrains Mono` / `SF Mono` for access tokens, dosage quantities, and medical code references.

---

## 🖼️ UI Component Explorations Catalog

| Component | Target Variant | Notes / Status |
| :--- | :--- | :--- |
| **Record Card** | Compact & Expanded views | Thumbnail preview, title, date badge, category tag |
| **QR Code Modal** | High-contrast popup | Screen brightness trigger, live countdown ring |
| **Filter Chips** | Horizontal scrolling bar | Quick toggle between record categories |
| **Emergency Banner** | Persistent or floating card | Rapid trigger for Medical ID view |

---

## 🔗 Related Notes
- Layout Blueprints: [[Wireframes]]
- Design Choices: [[Design Decisions]]
- Parent Hub: [[Product Design MOC]]
