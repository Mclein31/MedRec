# MedRec UI/UX implementation handoff

Snapshot: 26 October 2026. **Current direction: Warm folio, latest user refinements.**

Start with `CLAUDE_PROMPT.md`, `IMPLEMENTATION_SPEC.md`, `SCREEN_MAP.md` and `index.html`. All paths inside this bundle are relative, so the folder can be moved as a unit.

## Contents

- `figma-export/screens/png/`: every current screen, supporting state and overlay at 1× scale, including any outer frame shadows.
- `figma-export/screens/svg/`: matching vector exports, with text outlined for portable viewing; reference material, not application UI.
- `figma-export/overviews/`: app board, components/states board and identity/Remy board.
- `figma-export/identity/`: primary/reversed brand lockups, plain wordmark and icon exports.
- `figma-export/source/`: live-exported screen manifest, complete layer trees for the three sections, variables, prototype links, five flow starts and latest native design state.
- `assets/`: six selected transparent Remy poses and the original square app-icon artwork.
- `TOKENS.json`: semantic implementation tokens; Figma raw variables are also included.
- `DESIGN.md`: visual rationale, latest corrections, placement, accessibility and reference-use notes.
- `references/`: previously consulted Taste, Emil Kowalski and Impeccable source guidance.
- `provenance/`: mascot/icon generation prompts and page migration ledger.
- `MANIFEST.json`: file sizes and SHA-256 integrity checks.

The editable source is the [MedRec · App design Figma page](https://www.figma.com/design/ejP1MZ0Bzaqxzc31vgo5Bi/Personal-Projects?node-id=77-3066). App board `71:15559`, components/states `71:15560`, identity/Remy `71:18177`. SERVIO is unrelated. Deleted/rejected MedRec sections `69:746` and `69:747` are not the target.

This is a complete design reference and asset handoff, not a `.fig` native backup or production app implementation. Layer JSON preserves structure/specifications but is not a standalone Figma importer. Prototype examples are synthetic; timed loading and fixed chatbot answers must not become production behavior. Live Figma remains the editable design source. No secrets, app databases or patient attachments are packaged.

## Existing app target

Repository root: `/Users/mclein/Documents/Developer/Personal_Projects/MedRecord_App`.
The active v2 rebuild is `apps/mobile` (Expo SDK 54 / React Native 0.81 / Expo Router 6 / TypeScript), backed by `apps/api` (Hono Worker / Neon / R2 / Gemini / email OTP). Legacy root `mobile/` and `backend/` remain v1. Follow DD-44 and inspect current code before editing; older brain sections still describe v1.

No production code, deployments or Git commits were made while creating this handoff. Existing unrelated working-tree changes were retained.
