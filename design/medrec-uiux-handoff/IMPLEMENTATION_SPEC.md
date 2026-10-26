# Implementation specification

## Authority and scope

Implement the current Figma version faithfully in the existing v2 app. The exported screens, semantic tokens, current rules here and screen map are the handoff. Latest explicit user corrections override earlier experiments and generic reference advice. Figma is a visual specification, not proof that a feature works. Preserve all working app capabilities even when not represented in the mockups. Do not replace the app with a static prototype.

## Visual system

Ivory canvas `#FFF9EF`, white content `#FFFFFF`, ink `#302238`, aubergine primary `#492D48`, persimmon accent `#E66E4F`, restrained golden `#F4CD63` and peach `#F4B89A`, muted `#6F5B67`, divider `#D9CBC6`, neutral `#F5ECE5`, danger `#AA283B`. White text belongs on aubergine; persimmon uses dark ink. Avoid teal/mint, generic hospital blue and colored icons inside matching tinted squares. Avoid oversized folder-shaped categories. Personality comes from type, thoughtful spacing, Remy and useful feedback; clinical content remains calm.

DM Sans body 16/23, Sora SemiBold headings, Manrope ExtraBold MedRec wordmark. Font binaries are not bundled; acquire official licensed font files and bundle locally with Expo, with a deliberate fallback while fonts load. The app currently uses Lexend Deca; merely recoloring it is insufficient. Use the detailed exported layer specs for heading sizes, radii and spacing. Base mobile reference 390×844, 24px gutters, 48–56px main actions. Adapt to safe areas and narrow/wide devices, dynamic type and keyboard without shrinking everything into a screenshot-sized viewport. Do not hard-code patient text or fixed text heights.

Light mode is designed. Preserve the existing theme preference/system behavior; if retaining dark mode, map the same semantic roles with independently checked contrast rather than leaving the old mint/teal theme. Do not claim dark screenshots exist in this bundle.

## Navigation and latest corrections

- Bottom order: Records, Share, Add record, Medical ID, Profile. Five 78×64 reference slots at 390px. Center Add uses a 40px aubergine shape with white plus and a visible label, routes to real record intake. It is an action, not an empty tab screen.
- Main header left: plain **MedRec** wordmark only, no logo or mascot beside it.
- Top right: **Remy beside Ask Remy**. Art is **40×40** within a **124×52** reference tap area. Keep the label visible and accessible. Do not make the character oversized or float it over data.
- Categories: compact text selector All / Lab results / Prescriptions / More, 52px row; active underline and weight. More exposes the remaining existing categories. Adapt label widths for accessibility, never truncate essential labels or restore folder tiles.
- Welcome illustration stage is **white**, not yellow. Preserve mascot and caption.
- Preload/launch uses greeting Remy; loading records uses reading Remy and honest placeholders. No fake percentage, no forced splash delay.
- All five QR receipt variants use Remy plus MedRec and zigzag paper edges at **both ends**. Reference card342×500, 28 teeth per edge,6px deep. Render paper as decorative SVG/background; preserve QR quiet zone, black/white contrast and real scannability. No decoration over the QR. Scope, expiry, revoke/end action remain clear.
- App icon uses the supplied square close-crop Remy artwork. Use proper platform icon/adaptive assets; do not bake a rounded-square mask into the master or copy the owl reference.

## Remy and chatbot

Use assets exactly, do not redraw/recolor with CSS filters or generate replacements. `remy-default`: identity; `remy-greeting`: welcome, launch, small header entry and empty-chat greeting; `remy-curious`: empty records; `remy-searching`: no search results (magnifying glass); `remy-reading`: processing and compact reply avatar; `remy-saved`: saved confirmation. Maintain aspect ratio and transparent edges. Keep important facts, allergies, permissions and error recovery more prominent than art. Decorative Remy is hidden from screen readers; actionable entry has a meaningful label.

Chat should help users find their own records, understand terms, and navigate the app. Record answers must link to the actual source record and distinguish data from general explanation. Keep composer above the keyboard, scroll messages, expose send/loading/retry/cancel states and preserve the draft. Do not imply diagnosis or emergency triage. The three Figma chat screens have fixed examples only. Existing `api` has document scan/AI snapshots/history summary but no general chat method. Inspect actual backend before integration: reuse supported functions where honest, provide deterministic record search/help if appropriate, and show an explicit unavailable/retry state for unsupported free-form answers. Do not ship fabricated responses or expose model credentials in the client. Report any remaining conversational-backend gap clearly; a new arbitrary medical AI service is outside this visual migration unless separately authorized.

## Flows and state behavior

Onboarding: welcome → four focused steps (records, understand, share, Medical ID) → authentication; keep existing first-launch completion and tour replay semantics. Support sign-in, registration, OTP/resend/recovery using actual API states, including rate limits and session expiry. Do not replace working OTP with simulated verification.

Records: real list/counts/search/category filtering/pagination, empty, no-match, loading, errors and retry. Each row opens its own record ID; prototype sample rows may all link to one example. Detail retains actual original attachments, provider/date, AI explanation/source links, editing and deletion if already present. Do not infer a healthy/unhealthy diagnosis from colors alone.

Intake: camera/photo/document choice → uploaded page review → editable extraction/manual metadata → save → real saved confirmation. Preserve multi-page editing/reorder/discard, uploads, cancellations, failure recovery, and unsaved draft handling in the actual implementation. Do not show saved before the API succeeds.

Sharing: choose all/categories/individual records → choose15/30/60 minutes → confirm scope → real QR receipt → active/expired/revoked states. Counts/scope must match actual authorization. Server remains authority for expiry/revocation; erase or disable expired QR/link access. Preserve link copying/share sheet and recipient web access. Do not copy the illustrative QR from exported screens.

Medical ID: prominent existing emergency facts and consent-based public access; preserve edit, enable/disable/rotate behavior and emergency contact actions. Profile: account, preferences, app lock/security, tour replay and real exports remain reachable. Activity and other working routes absent from Figma receive the same visual language; they must not disappear.

## Motion and accessibility

Use Emil's purposeful short feedback: routine transitions around180ms ease-out, onboarding220ms directional. Reuse existing Reanimated with platform guards; DD-44 documents a web cleanup crash for entering animations. Honor system and in-app reduced motion, background/foreground transitions and focus. No continuous novelty motion on medical reading screens. Real loading lasts only while work is pending.

44px minimum touch targets (larger primary actions), visible focus, contrast, screen-reader headings/roles/state, natural reading order, labeled inputs and errors, accessible selected filters, dynamic type and keyboard-safe forms/chat. Respect safe areas and bottom-bar clearance. No clipping at320px widths or larger type. Do not reproduce fake status bars/home indicators from Figma as in-app UI.

## Integration and verification

Read repository AGENTS and `.brain/PROJECT_CONTEXT.md`, the v2 section of ARCHITECTURE, DD-44 and `apps/README.md`. Inspect `apps/mobile/src/theme.ts`, `src/ui/*`, layouts, existing routes and `src/lib/api.ts` before changes. Preserve dirty work. Refactor shared tokens, typography, header, buttons, record rows, filters, tab bar, receipt and Remy view before screen migration. Avoid parallel competing component systems.

Run `npm test` and `npm run typecheck` in `apps/mobile`; run available relevant build/export checks and changed-area regression tests. Run `apps/api` tests if backend behavior changes, with its required local DB. No test suite is claimed as run by this design packaging task. Validate actual screens visually against exports at390×844 and a narrow viewport, plus large type, keyboard, reduced motion and long/error data. Exercise auth, intake, filters, real row IDs, QR scope/expiry/revoke, Medical ID, exports and app lock. Verify QR with a real decoder/camera. Report checks actually run, failures and missing configuration honestly. Update existing `.brain`/Obsidian only for durable changes. Do not deploy, commit or push unless requested.
