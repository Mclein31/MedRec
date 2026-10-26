---
project: MedRec
type: design
status: proposed
created: 2026-08-24
updated: 2026-10-26
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

## 2026-10-26 — Warm folio and Remy assistant

**Current Figma organization:** the latest app, components/states, and brand/Remy sections are now on the dedicated **MedRec · App design** page (`77:3066`), with their existing node IDs and five prototype flows preserved. The two rejected old MedRec sections (`69:746`, `69:747`) were deleted at the user's request; the SERVIO page and its content were left unchanged. Historical draft links below refer to removed old sections.

The user rejected the mint color theme and folded-M logo and requested a more creative, fun medical app while explicitly preserving the medical boundary. The selected record-organizer character is now called **Remy** and will represent the question-answering chatbot. This is a Figma concept only; no live chatbot or production UI implementation is included.

The replacement uses ivory `#FFF9EF`, ink `#302238`, aubergine `#492D48`, persimmon `#E66E4F`, golden `#F4CD63`, and peach `#F4B89A`. DM Sans body, Sora headings, Manrope wordmark. A new editable folio mark replaces the M. Folder-shaped record categories, restrained transitions and contextual mascot poses supply personality; health results, allergies, access permissions and errors remain clear and calm. No matching tinted icon tiles.

**Subsequent correction:** the user rejected the oversized folder-shaped record categories. They were replaced in Figma by a compact 52 px text-filter row (All, Lab results, Prescriptions, More), freeing space for the document list. The records onboarding preview now uses two document rows with titles/dates rather than folder tiles. Remy and the logo retain their identity. The correction was reviewed directly in Figma with no review downloads.

**Latest navigation and brand refinements:** Add record moved into the center of the five-item bottom navigation. App headers now show plain MedRec text on the left and the greeting mascot beside Ask Remy on the right; the temporary two-button action row was removed. Remy replaces the old folio mark in the launch screen and all five QR receipt headers. Those receipts now have zigzag tear edges at both ends, keeping the QR quiet zone and access details intact. A new magnifying-glass pose appears on no-match search, and a close-cropped Remy app icon replaces the abstract folder icon. Character shape and warm colors are preserved. Updated sources, exact image prompts and verification are in the workspace DESIGN.md and brand asset folder; no production implementation or overall user approval is implied.

- [App board](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-15559): 29 main screens, including four onboarding steps, launch and loading, and three Ask Remy chat examples; supporting scope/category/overlay states remain.
- [Brand, expressions and placement plan](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-18177): the selected character is recolored, with curious/looking-around, greeting, reading and satisfied/thumbs-up variants. Empty records use the curious pose; welcome/chat use greeting; loading uses reading; a saved record gets quiet reassurance. Main screens have a labeled Ask Remy entry. The character does not float over clinical data or react playfully to errors/urgent situations.
- [Ask Remy](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=75-2656): fixed synthetic examples for finding a record and explaining a term; record-specific answers link to their source. A general-information boundary appears in chat.
- Reference guidance: published Taste app-screen, Emil Kowalski design-engineering and Impeccable sources, together with the previously requested inspiration sites. Exact provenance, reference access limits, color contrast, layout checks and review limits are in `/Users/mclein/Documents/ChatGPT/MedRec/DESIGN.md`.
- Operational preference: keep review files inside the MedRec workspace. The user objected to Downloads clutter; all 24 exact task-created exports were moved out of Downloads. Do not export there again for routine checking.

Only the mascot identity was selected. The replacement palette, logo, expressions and UI await review; existing production decisions are unchanged.

## 2026-10-26 — Iris, mint and coral brand direction

**Superseded visual direction.** The user later rejected mint and the folded-M logo; see Warm folio above.

User feedback rejected the first teal layout, the orange/serif journal concept as inappropriate for a medical app, and the subsequent conventional clinical-blue palette as too typical. The requested balance is a more creative, fun identity that still feels appropriate for a medical records app. Icons must still avoid matching tinted backing tiles.

The current reviewable direction uses iris `#4F3BCB`, mint `#BDEED8`, coral `#F28474`, porcelain `#FAF8FF`, and deep plum `#241E3C`. DM Sans supports clear medical information. Text contrast checks: white/iris 7.45:1, main text/porcelain 15.03:1, secondary text/porcelain 5.96:1. Mint and coral are supporting accents; clinical facts and form content remain clear and restrained.

- [Updated app board](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-15559): 24 main screens, including four onboarding steps for records, explanations, temporary sharing, and Medical ID. Next and Skip intro paths are linked. Supporting scope, duration, category and overlay states remain on the same page.
- [Brand board](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=71-18177): original folded-M/page-turn mark, MedRec wordmark, compact and reversed lockups, app icon, palette, and proposed mascot.
- The paper/document character called Remy was explicitly rejected. After reviewing the turtle and eight further alternatives, the user selected **Index Crew**, an iris record organizer with tabbed mint/lavender records, a coral tab and mint face/feet. The exact selected image replaces the turtle on the brand sheet, welcome and empty-record screens; results and critical health information remain focused. This selection approves the mascot direction, not the whole UI or logo.
- Logo assets are editable vector components in Figma and exported as SVG/PNG. The selected organizer is a discrete generated transparent PNG at `design-output/brand/medrec-mascot-record-organizer.png`. Updated previews are `MedRec-brand-organizer.png`, `MedRec-welcome-organizer.png`, and `MedRec-empty-organizer.png`; `MedRec-organizer-design-state.json` records the current node state. App screens remain editable; no complete-screen raster is used as the design.
- Source/export pack: `/Users/mclein/Documents/ChatGPT/MedRec/design-output/brand/`; generation prompt and tool provenance are recorded in `BRAND-DIRECTION.md`. Current app overview and node ledger are in the parent `design-output/` folder.

The mascot direction has been selected. The overall interface and logo remain design proposals, not an approved brand standard or production implementation. Existing product decisions remain unchanged pending review.

## 2026-10-26 — Figma redesign draft

**Status: rejected first direction.** Retained below as design history; see the newer brand direction above.

The user requested a simple, engaging mobile experience for different age groups, with an explicit ban on icons placed on matching tinted backgrounds. The editable draft is in the existing [Personal Projects Figma file](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=69-746), beside SERVIO on the same page. No new file, page, or paid assets were required. This is a reviewable design proposal; production UI and the existing decisions have not been replaced.

- **Identity:** retain the v2 source's Lexend Deca family and teal `#087F6D`, with `#F6F7F6` surfaces and `#14211D` text. Use bare outline icons, quiet document rows, and dark green summary/capture panels.
- **Readability:** 16 px body / 24 px line height, 56 px primary actions, at least 44 px category controls, and four visibly labeled destinations: Records, Share, Medical ID, Profile. The proposal replaces the center add button with a labeled Add action in Records; this needs review before changing the existing navigation decision.
- **Inventory:** 20 main mobile screens in a compact four-column board, plus supporting sheets and scope/duration/filter variations. Covers records, document explanation, capture/upload, extracted-detail review, save success, sharing, access expiry/revocation, Medical ID, account entry, empty/error states, and reading preferences.
- **Sharing:** record-detail sharing defaults to that record only. Separate previews represent one record, eight lab results, or all 24 records. The category share flow demonstrates 15, 30, and 60 minute expiry states. Cancelling the end-access overlay closes it without changing scope.
- **AI:** distinguish the whole-record overview from an individual document explanation; retain access to the original and clearly state that AI can make mistakes.
- **Motion:** specify 100–160 ms press feedback and 180–220 ms ease-out transitions, avoiding bounce or repeated choreography. Larger text and reduced-motion implementation should follow device preferences and reflow content.
- **Validation:** editable text/vector/component hierarchy, zero full-screen raster images, one font family asserted, contrast checks of 15.46:1 main text, 4.56:1 muted text, and 4.92:1 white on teal. The Records → document → single-record sharing → QR → end-access confirmation/cancel path was exercised in Figma presentation mode.

[Try the prototype](https://www.figma.com/proto/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=67-7226&starting-point-node-id=67%3A7226&scaling=scale-down). Three named flows: MedRec · Everyday records, MedRec · First visit, and MedRec · Share with a doctor.

All identities, files and medical content are synthetic. The QR uses a reserved `.example` URL. Camera, forms, email, copy, exports and account changes are prototype demonstrations; they are not connected to live services. Secondary document examples are display-only in this prototype. The doctor-facing web viewer, real-device accessibility, full dark-theme parity and implementation remain future work.

Reference material: [Uizze](https://uizze.com), [Impeccable](https://impeccable.style), [Taste](https://www.tasteskill.dev), [Details](https://www.details.so/inspo), [Design Spells](https://designspells.com), [Animmaster](https://animmasterlib.dev), [Skiper](https://skiper-ui.com), [Vengeance](https://www.vengenceui.com), and [Emil Kowalski's design engineering guidance](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md). Marketing-oriented motion references were adapted to brief feedback and transitions suitable for a medical records tool.

Local builder and exported overview/state: `/Users/mclein/Documents/ChatGPT/MedRec/figma-builder/` and `/Users/mclein/Documents/ChatGPT/MedRec/design-output/`.

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


## 2026-10-26 — Complete implementation handoff

The latest dedicated-page design is saved in `design/medrec-uiux-handoff/` at the repository root, with all 52 screen/state/overlay PNGs and SVGs, current component and brand boards, source layer/token/prototype snapshots, selected Remy assets and a browsable `index.html`. Start implementation from `CLAUDE_PROMPT.md`, `IMPLEMENTATION_SPEC.md` and `SCREEN_MAP.md`; target the active v2 app in `apps/mobile` and preserve existing behavior. The bundle includes the smaller 40px header character and white welcome stage. Chat remains a fixed design example until connected to real supported behavior. No production UI was changed by this export task.
