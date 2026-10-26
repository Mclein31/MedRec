# MedRec — Warm folio, direction 05

Status: reviewable Figma design, 26 October 2026. The user selected the record-organizer mascot and calls him Remy. The previous mint palette and folded-M logo were rejected; this is the latest user-directed Figma version to use for implementation. No production app code changed.

## Product and visual intent

MedRec helps people of different ages store, find, understand and temporarily share their medical records. The working screens are an Operate surface; clinical details are a Read surface. Remy's folder character gives the identity a concrete connection to records. First use, waiting and completion carry personality; results, allergies, access permissions and errors prioritize clarity. The user rejected the oversized folder-shaped category cards; the interface now uses compact text filters, keeping the folder identity in Remy and the logo.

## Color roles

| Role | Value |
|---|---|
| Canvas / ivory | `#FFF9EF` |
| Record surface | `#FFFFFF` |
| Ink | `#302238` |
| Aubergine action / mark | `#492D48` |
| Persimmon signature action | `#E66E4F` |
| Golden character / restrained accent | `#F4CD63` |
| Peach mascot detail | `#F4B89A` |
| Muted text | `#6F5B67` |
| Divider | `#D9CBC6` |
| Supporting neutral | `#F5ECE5` |
| Error / allergy | `#AA283B` |

Measured contrast: ink/ivory 14.20:1; white/aubergine 11.98:1; ink/golden 9.75:1; ink/persimmon 4.75:1; muted/ivory 5.95:1. Persimmon buttons use dark ink, not white text. No mint, teal, tinted icon tiles, or color-only clinical meaning.

## Type, logo and layout

DM Sans body at 16 px with 23 px line height; Sora SemiBold gives headings a clearer personality. Manrope ExtraBold is used for the wordmark. The user replaced the geometric folio logo with Remy for branding and QR receipts. App headers use only the plain MedRec name, without an icon. The top-right Ask Remy action retains the greeting mascot beside its visible label. Primary and reversed brand lockups use Remy plus MedRec; the app icon is an original close-up Remy image inspired by the composition of the user's reference.

Main mobile frames remain 390 × 844 with 24 px gutters, 48–56 px actions, pinned navigation/composer, and scrollable content. Oversized category folders were rejected and replaced by a 52 px text selector: All, Lab results, Prescriptions, More. Four tap areas are 44, 90, 124 and 54 px wide, separated by 10 px gaps; selected All uses weight and a short underline. The document list has more room. The first onboarding preview now shows two actual document rows with titles and dates, without folder shapes or category tiles. Counts retain the existing illustrative dataset: 24 total, 8 labs. This correction was applied and inspected directly in Figma; it generated no Downloads files.

The user subsequently moved **Add record** into the center of the bottom navigation. Current order: Records, Share, Add record, Medical ID, Profile, with five 78 × 64 px tap areas. Add uses a white plus on solid aubergine with a visible label. The four navigation variants and ten instances were updated and linked to record intake. The intermediate two-button row is removed. **Ask Remy** is top right as a 124 × 52 px launcher using greeting artwork and a visible label; five main headers use it. Headers show plain MedRec text on the left.

At the user's request, header Remy artwork is reduced from 48 × 48 to 40 × 40 px in all five launchers. The label, prototype link and 124 × 52 px tap area remain intact.

QR access cards now use Remy plus the wordmark and have editable zigzag tear edges at both the top and bottom: 28 teeth per edge, 6 px deep, applied to all five 342 × 500 px receipt variants. The paper silhouette is a background vector; the QR code, its quiet zone, scope and expiry text keep their existing geometry. The launch screen uses the greeting Remy instead of the old folio mark. These changes were checked directly in Figma without review downloads.

## Remy's placement and expressions

| Surface | Role |
|---|---|
| Welcome | Waving greeting in a white illustration panel (`#FFFFFF`, changed from golden at the user's request) |
| Empty records | Curious / looking around; clear scan and upload actions |
| No matching search results | Curious Remy with a magnifying glass; query, Clear search and Add recovery remain visible |
| Main Records, Share, Medical ID, Profile | Labeled Ask Remy entry; no character floating over health data |
| Empty chat | Small welcoming pose and three useful starter questions |
| Chat replies | Compact avatar; record-specific answer links to the source record |
| Loading records | Reading pose alongside honest placeholders, no invented percentage |
| Record saved | Small, quietly pleased thumbs-up pose |
| Results, allergies, errors, urgent help | Neutral information and recovery; no diagnostic claims, jokes, distress or celebration |

Six transparent character assets: `design-output/brand/medrec-mascot-warm-v5.png` plus `design-output/brand/remy-v5/remy-{curious,greeting,reading,saved,searching}.png`. Exact edit prompts and built-in image-tool provenance: `design-output/brand/remy-v5/PROMPTS.md` and `SEARCH-PROMPT.md`. The expression sheet contains five situational poses beside the default character. The opaque app-icon artwork is `design-output/brand/MedRec-remy-app-icon-v1.png`; its prompt and reference roles are in `design-output/brand/REMY-APP-ICON.md`.

## Figma scope and behavior

The latest design is on its dedicated **MedRec · App design** page (`77:3066`) in the existing Figma file. App board `71:15559`, component/state board `71:15560`, brand/expression/placement board `71:18177` were moved with their node IDs preserved. The two rejected canvas sections (`69:746`, `69:747`) were deleted at the user's request. SERVIO remains on `0:1`; all 76 unrelated top-level items were preserved unchanged. The five current MedRec prototype flows moved with the design, and their destinations resolve on the new page. Historical exported ledgers may reference the former shared page; `design-output/MedRec-page-organization.json` records this migration. There are 29 main screens, 12 supporting states and 11 overlays. New main screens:

| Screen | Node |
|---|---|
| Launch | `75:2580` |
| Loading records | `75:2604` |
| Ask Remy | `75:2656` |
| Chat: find a record | `75:2695` |
| Chat: explain a term | `75:2738` |

Launch and loading have timed prototype navigation; onboarding uses a short 220 ms sideways transition; routine links use 180 ms ease-out dissolves. Production must show loading only while actual work is pending and honor reduced-motion preferences. The prototype chat uses fixed synthetic examples; no live chatbot, authentication, processing or real health-data access is implemented by this design task.

## Verification and review boundaries

The native Figma check found no horizontal text overflow or broken destinations across 208 linked nodes. Main foreground/background pairs were calculated. Records, welcome, empty, chat, chat answer, loading, brand and whole-board exports were viewed. An independent visual reviewer requested one material fix: the Prescriptions label. Its corrected records export passed the follow-up; the onboarding fix was verified directly on the live Figma canvas by the primary agent. The reviewer could not independently recapture onboarding after the visible canvas changed. No production device, screen-reader, keyboard or live-chat behavior is claimed.

## Reference use

- [Taste app-screen guidance](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/references/app-screens.md): product-specific folders, honest example data, strong literal labels, no tinted icon squares.
- [Emil Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md): purposeful motion, quick feedback, deceleration, restraint in frequent tasks.
- [Impeccable](https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md): Operate/Read boundaries, hierarchy, meaningful color and delight at useful moments. Published source documents are saved under `design-references/`; its launcher was unavailable, so project context was read directly. Figma authoring and native screenshots replace browser build/detector commands in this design-only workflow.
- [Vengeance folder preview](https://www.vengenceui.com/components/folder-preview): tabbed record shelf adapted for tap, not hover.
- [Design Spells](https://designspells.com/): coherent screen and sheet transitions; public listing only, videos not inspected.
- [Details healthcare collection](https://www.details.so/inspo/site/healthapp-google): one feature per onboarding step; public listing, no private Vault access.
- [Skiper UI](https://skiper-ui.com/): compact, plain-language processing feedback; public homepage only.
- [Animmaster](https://animmasterlib.dev/): restrained directional transitions; public categories, no gated behavior claimed.
- [Uizze](https://uizze.com/): coherent record journeys; individual app explorations not available in the public response.

## Review-file preference

Keep exports and generated assets in this workspace. Do not fill Downloads with review files. On user feedback, all 24 exact task-created exports were moved from Downloads to `design-output/review-exports/`; no unrelated files were touched. Remaining checks use the live Figma canvas.
