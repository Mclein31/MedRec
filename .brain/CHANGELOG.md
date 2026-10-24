---
type: changelog
title: MedRecord_App Changelog
project: MedRecord_App
tags:
  - changelog
  - history
last_updated: 2026-10-24
---

# 📜 MedRecord_App (MedRec) — Changelog

## [2.0.0-alpha] — 2026-10-24 — Rebuild from scratch in `apps/` (DD-44)

- **API (`apps/api`)**: Cloudflare Worker (Hono) on Neon Postgres with forced row-level security as an unprivileged `medrec_app` role; R2 private storage streamed through HMAC-signed short-lived paths; Gemini document reading with model fallback; hourly cleanup cron.
- **Auth**: password + emailed 6-digit code via Gmail SMTP App Password (AdvanCare pattern), newest-code-only, 10-min TTL, 5 tries, 60 s resend cooldown, trusted devices (30 days), rotating refresh tokens with reuse rejection, account lockout, password reset that signs out everywhere.
- **Sharing**: HMAC share tokens (never stored), scope all/categories/records, 15 min–7 days, revoke/revoke-all, server-rendered doctor page with CSP nonce and view notifications. Public Medical ID page with rotation and throttled view alerts.
- **App (`apps/mobile`)**: new Expo SDK 54 client — onboarding, sign-in/register/code/reset, Records (search, chips, keyset pagination), Add (camera/photos/PDF → AI read → review), record detail, Share (QR hero + countdown), Medical ID, Profile (app lock, exports, devices), Activity, Health summary. Light/dark tokens, Lexend Deca, visible labels.
- **Verification**: API 37 integration tests; mobile 7 unit tests; both typecheck; Worker dry-run bundle; web/iOS/Android exports; live `wrangler dev` end-to-end probe; UI sign-in driven in headless Chrome. Legacy `backend/` and `mobile/` untouched.

## [1.4.27] — Automatic First-Launch Onboarding Entry & Login Screen Decoupling

- **Removed Manual Onboarding from Login Screen (`mobile/app/login.tsx`)**:
  - Completely excised the onboarding entry point button ("✨ New to MedRec? Explore app features →") and developer reset triggers across all screen configurations (Phone, Tablet Portrait, and Tablet Landscape).
  - Cleaned up unused `resetOnboarding` import from `useAuth()` and dead `tourLink` / `tourLinkText` StyleSheet rules in `login.tsx`.
- **Automatic First-Launch Stack Priority & Seamless Preload (`mobile/app/_layout.tsx`)**:
  - Dynamically configured `<Stack>` children ordering in `_layout.tsx`: positioned `<Stack.Screen name="onboarding" />` at root stack index 0 whenever `!hasCompletedOnboarding` is detected, with `login` and `register` available as downstream routes in `<Stack.Protected guard={!token}>`.
  - Guaranteed `preload -> onboarding -> login/register` pipeline without screen flicker: fonts (`useFonts`) and persistent auth/onboarding state (`AuthProvider.bootstrap()`) hydrate while native `SplashScreen` remains active, revealing `onboarding` directly as the initial view upon splash dismissal.
  - For returning users (`hasCompletedOnboarding`), `login` is promoted to root index 0 while `onboarding` remains at trailing position for in-app replay from Profile.
- **Verification**:
  - Verified clean TypeScript compilation (`npx tsc --noEmit`) with 0 errors.
  - Verified code quality through `npm run lint` with zero errors across layout and authentication views.

## [1.4.26] — Pre-SignIn Patient Onboarding Flow & First-Launch Guard

- **First-Launch Detection & Persistent Storage Guard (`mobile/lib/api.ts`, `mobile/context/AuthContext.tsx`, `mobile/app/_layout.tsx`)**:
  - Introduced `medrec_onboarding_completed_v1` key in `tokenStorage` with `getHasCompletedOnboarding()`, `setHasCompletedOnboarding()`, and `resetHasCompletedOnboarding()` (conforming strictly to Expo SecureStore `^[a-zA-Z0-9._-]+$` key format constraints).
  - Added `hasCompletedOnboarding`, `completeOnboarding()`, `markOnboardingSeen()`, and `resetOnboarding()` to `AuthContextType`.
  - Fixed premature screen eviction bug where `markOnboardingSeen()` flipped in-memory state on mount; now it records to persistent storage without unmounting the active carousel.
  - Refactored unauthenticated `Stack.Protected` in `_layout.tsx` to conditionally order screen priority (`onboarding` at index 0 on first launch; `login` at index 0 for returning users while keeping `onboarding` accessible).
  - Hardened app bootstrap in `AuthProvider` with asynchronous `try...catch...finally` execution, ensuring `setIsLoading(false)` always executes and eliminating preload splash screen hang.
  - Added splash screen safety dismiss timeout (2.5s) and font loading error fallbacks in `_layout.tsx`.
  - Added tour link and first-launch QA reset trigger to `mobile/app/login.tsx`.
- **4-Step Interactive Patient Onboarding Screen (`mobile/app/onboarding.tsx`, `mobile/constants/onboarding.ts`)**:
  - Implemented responsive horizontal carousel with segmented progress indicator, comfortable Skip button, Back/Next navigation, and animated pill dots.
  - **Slide 1 (Unified Health Vault)**: Category filter chips, Complete Blood Count lab card with Normal status badge, Cardiology Review consultation card, and AI Clinical Summary callout card with vitals insight.
  - **Slide 2 (Doctor QR Sharing)**: Consultation Pass card with Dr. Sarah Mitchell, centered stylized QR code box with teal corner brackets, 14:59 live countdown pill, auto-expiration security notice, and 1-tap instant revoke callout badge.
  - **Slide 3 (Emergency Medical ID)**: Red-accented emergency pass, medical shield icon, O+ Blood Type pill, Critical Allergy warning box (Penicillin anaphylaxis, Peanuts), chronic condition & ICE contact grid, and paramedic vital access notice.
  - **Slide 4 (Zero-Knowledge Privacy)**: Padlock halo emblem, 3 value pillar cards (Zero Ads / No Selling, Private R2 Vault with AES-256, Ephemeral Doctor Tokens), and Dual CTAs ("Get Started" ➔ `/register`, "Already have an account? Sign In" ➔ `/login`).
- **Flicker-Free Bootstrap Coordination (`mobile/app/_layout.tsx`)**:
  - Configured `SplashScreen.hideAsync()` to wait until both custom Lexend Deca fonts and auth/onboarding hydration are resolved, completely eliminating intermediate loading spinners or white flash before destination screen render.
- **In-App Onboarding Replay Guide (`mobile/app/(tabs)/profile.tsx`)**:
  - Added "App Tour & Feature Guide" under Security & Preferences in the Profile screen, enabling authenticated patients to revisit the 4 core product pillars at any time with modal presentation and return dismiss.
- **Code Review Hardening & Quality Refinements**:
  - Gated developer QA reset triggers (`onLongPress`) behind `__DEV__` across `login.tsx` (Phone, Tablet Portrait, Tablet Landscape) and `profile.tsx`.
  - Added comprehensive `accessibilityHint` descriptions to all interactive onboarding controls (close, skip, back, next, indicator dots, and CTAs) for screen readers.
  - Expanded touch hit areas via `hitSlop` on `tourLink`, indicator pills, and `signInLinkBtn` to exceed the 44x44pt minimum target standard.
  - Pruned dead `markOnboardingSeen` method and simplified `completeOnboarding` parameter signature in `AuthContext.tsx` and call sites.
  - Elevated type safety in `constants/onboarding.ts` with typed `IoniconName` and `PrivacyPillar` interfaces, eliminating `as any` type assertions in `onboarding.tsx`.
  - Added `onScrollEndDrag` alongside `onMomentumScrollEnd` on carousel `ScrollView` to prevent Android low-velocity flick index desync.
  - Added orientation and window dimension re-alignment hook in `onboarding.tsx`.
- **Full-Screen Carousel Layout & Typography Refinement (`mobile/app/onboarding.tsx`)**:
  - Centered guide content vertically (`justifyContent: 'center'`) and horizontally across carousel slides.
  - Centered category badges (`badgeWrapper`) and titles (`headlineText`) while justifying narrative descriptions (`subtitleText`, `aiBodyText`, `pillarDescText`) with full-width stretching.
  - Expanded hero preview cards to utilize full available vertical screen height (`flex: 1`, `minHeight: 280`, `justifyContent: 'space-between'`).
  - Added dedicated card grouping in Slide 1 (`recordsGroup`, `recordsCardsStack`) and Slide 3 (`emergencyBodyGroup`) to eliminate artificial ~100pt vertical gaps between list items on tall devices.
  - Bounded tablet layout width to `Math.min(width - 48, 580)` to prevent widescreen distortion and single-line subtitle collapse while allowing full-width expansion on phones (`width - 32pt`).
  - Added explicit `width: '100%'` to nested `<ScrollView>` for reliable React Native Web container expansion.

## [1.4.25] — Comprehensive Review Fixes: iOS Hit-Testing, Android Modal Insets, Tablet Navbar & A11y

- **iOS Hit-Testing on Protruding Add Button (`(tabs)/_layout.tsx`)**:
  - Added `hitSlop={!isTablet ? { top: 35 } : undefined}` to parent `styles.navbar` container so iOS `[UIView pointInside:withEvent:]` does not discard taps on the upper 35pt protruding dome before reaching the Add button.
- **Android Edge-to-Edge Status Bar Collision Fix (`record/add.tsx`)**:
  - Added platform-aware top padding (`Platform.OS === 'android' ? insets.top + 8 : 8`) in modal `styles.header` to clear transparent status bar clock and icons on edge-to-edge Android displays while keeping compact 8pt padding on iOS `pageSheet` modals.
- **Tablet Portrait Floating Navbar Add Button (`(tabs)/_layout.tsx`)**:
  - Guarded the flat white `domeCircle` from rendering on tablet portrait; on tablets, the Add button now renders as a clean centered circular teal button (`tabletAddButton`, 48x48pt, `borderRadius: 24`) flush within the floating rounded pill navbar.
- **Tab Navigation Stack & Accessibility Improvements (`(tabs)/_layout.tsx`)**:
  - Switched tab navigation from `router.push` to `_props?.navigation.navigate(tab.name)` (reserving `router.push` for `/record/add`), preventing duplicate screens from polluting the back navigation stack.
  - Added explicit clinical accessibility labels via `TAB_A11Y_LABELS` (`Records tab`, `Share tab`, `Add health record`, `Scan tab`, `Profile tab`) replacing the automated "Index tab" and "Add action" labels.
- **Code & Style Cleanups (`login.tsx`, `record/add.tsx`)**:
  - Deleted orphaned Google sign-in style definitions (`googleButton`, `google`, `googleText`, `tabletGoogleButton`) and normalized `createButton.marginTop` to 16pt in `login.tsx`.
  - Removed dead, unreachable `isTablet && { maxWidth: ... }` conditions from phone form container in `record/add.tsx`.

## [1.4.24] — Fixed/Static Top Navigation Bar on Share Records Tab

- **Fixed Top Navigation Bar Parity (`(tabs)/share.tsx`)**:
  - Extracted the global navigation toolbar (hamburger menu button and notification bell icon) outside the scrollable `ScrollView` container in the phone view of the Share Records tab, matching the architectural layout of the Records (`(tabs)/index.tsx`) and Profile (`(tabs)/profile.tsx`) screens.
  - Used `ScreenHeader` with `hideToolbar={true}` inside the `ScrollView` so that the page title ("Share Records") and subtitle scroll smoothly underneath the fixed toolbar with zero visual bleed or layout shift.
  - Preserved full interactive parity for menu opening (`setMenuVisible(true)`), notification center modal triggers (`refreshNotifications()`, `setNotificationsVisible(true)`), unread badge counts, and haptic feedback.

## [1.4.23] — Eliminate Excessive Top Spacing on Add Health Record Modal

- **Modal Header Layout Normalization (`record/add.tsx`)**:
  - Removed redundant push-screen inset calculation (`paddingTop: insets.top > 20 ? insets.top + 4 : 8`) that caused a 63pt empty gap on notch/dynamic-island devices within the `pageSheet` modal presentation.
  - Integrated `<DragHandle />` directly inside `styles.header` with clean standardized top padding (`paddingTop: 8`, `paddingBottom: 12`), aligning with `RecordEditModal` and `NotificationCenterModal` modal design system conventions.

## [1.4.22] — Doctor QR Access Notification Card Icons Alignment

- **Doctor QR Notification Icon Parity (`NotificationCard.tsx`)**:
  - Aligned all Doctor QR Access notification cards (`share_created`, `share_expired`, `share_revoked`, `qr_generated`, `qr_terminated`) with the navigation bar's Share/QR icon by replacing Ionicons `qr-code-outline` with `assets/icons/share-inactive.png` (`26x26pt`, `resizeMode: 'contain'`).
  - Kept default/generic notifications using `notifications-outline` and Notification Center empty state using `notifications-off-outline`.

## [1.4.21] — Borderless Solid Navbar with Semicircular Protruding Add Button

- **Navigation UI Enhancement (`(tabs)/_layout.tsx`)**:
  - Removed all top and surrounding borders from the solid navbar and circular dome, creating a seamless, pure white background as designed in Figma.
  - Increased the vertical protrusion to 35pt (`top: -35pt`) with a 74pt circular dome (`borderRadius: 37pt`) and 56pt teal button (`borderRadius: 28pt`), forming a clean semicircular protrusion above the navbar.
  - Expanded touch target bounds to `hitSlop={{ top: 42, bottom: 8, left: 8, right: 8 }}`.

## [1.4.20] — Elevate Protruding Add Button Dome Contour

- **Navigation UI Enhancement (`(tabs)/_layout.tsx`)**:
  - Increased the vertical protrusion of the center add button dome from 20pt to 28pt (`top: -28pt`), expanding the circular dome diameter to 72pt and the inner teal button to 54pt (`borderRadius: 27pt`).
  - Expanded upward touch target coverage (`hitSlop={{ top: 34, bottom: 8, left: 8, right: 8 }}`) to ensure smooth touch interactions across the full elevated dome.

## [1.4.19] — Protruding Dome Add Button on Solid Navbar

- **Navigation UI Enhancement (`(tabs)/_layout.tsx`)**:
  - Implemented the protruding center add button with a white circular dome (`width: 70, height: 70, borderRadius: 35`) that extends 20pt above the solid navbar's top line, framed by a continuous top border contour (`borderColor: '#EEF3F2'`).
  - Positioned the circular teal Add button (`52x52pt`, `borderRadius: 26`, `backgroundColor: Colors.teal`) concentrically within the dome, yielding an even 9pt white rim framing the button with zero drop shadows.
  - Configured `overflow: 'visible'` on the navbar and expanded the hit area (`hitSlop={{ top: 24, bottom: 8, left: 8, right: 8 }}`) to ensure responsive touch responsiveness across the protruding dome on mobile devices.

## [1.4.18] — Solid Bottom Navigation Bar with Original Icons & Flush Add Button

- **Navigation UI Refinement (`(tabs)/_layout.tsx`)**:
  - Restored the solid docked bottom navigation bar anchored to the bottom edge (`position: 'absolute', bottom: 0, left: 0, right: 0`, solid `#FFFFFF` background, `borderTopWidth: 1, borderTopColor: '#EEF3F2'`).
  - Restored the original icon set (`records-active.png` / `records-inactive.png`, `share-active.png` / `share-inactive.png`, `scan-active.png` / `scan-inactive.png`, `profile-active.png` / `profile-inactive.png`, and user avatar).
  - Kept icon color switching on active/inactive states (`source={isActive ? tab.activeIcon : tab.inactiveIcon}`).
  - Removed all text labels for an icon-only presentation.
  - Removed icon background highlights/pills.
  - Styled the new add button as a flush circular teal button (`width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.teal`) with a crisp white plus (`Ionicons name="add"`), with zero shadows and no floating elevation.

## [1.4.17] — Dynamic Metro IP Auto-Detection & Resilient Login Error Handling

- **Development API Routing (`mobile/lib/api.ts`, `mobile/.env`)**:
  - Identified that your computer's Wi-Fi IP address had changed from `192.168.1.38` to `192.168.1.25`, leaving mobile client requests hanging on an unreachable stale IP.
  - Updated `mobile/.env` to point to `http://192.168.1.25:4000/api`.
  - Added dynamic Metro bundler host IP detection (`Constants.expoConfig?.hostUri`) in `getApiBaseUrl()` during development (`__DEV__`), ensuring future Wi-Fi DHCP IP shifts automatically resolve to the host machine running Metro.
- **Accurate Error Reporting (`mobile/app/login.tsx`)**:
  - Replaced indiscriminate `catch` handler that was misreporting network/connection timeouts as "Wrong password" and unfairly penalizing users with account lockouts.
  - Network timeouts and unreachable host errors now report clear connection alerts without incrementing failed attempt lockouts. Genuine authentication errors display the backend's explicit error response.

## [1.4.16] — Remove Google Sign-In Native Module Dependencies for Development Compatibility

- **Authentication Module Clean-up (`AuthContext.tsx`, `login.tsx`, `register.tsx`, `app.json`)**:
  - Removed `@react-native-google-signin/google-signin` native TurboModule import and `configure` calls from `AuthContext.tsx` to eliminate runtime `Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found` warnings/errors when running in Expo Go or unlinked development binaries.
  - Removed `loginWithGoogle` from `AuthContextType` and `AuthProvider`.
  - Removed Google Sign-in button triggers and social authentication handlers from `login.tsx` and `register.tsx`.
  - Removed `@react-native-google-signin/google-signin` config plugin from `app.json`.

## [1.4.15] — Modern Floating Bottom Navigation Bar Redesign

- **Floating Bottom Navigation Architecture (`FloatingBottomNav.tsx`, `(tabs)/_layout.tsx`)**:
  - **Floating Pill Container**: Replaced heavy rectangular bar with a lightweight, Apple-inspired floating container (`borderRadius: 26` on phones, `borderRadius: 30` on tablets) with clean `#FFFFFF` surface, `#EEF4F2` border, and soft multi-layered shadow (`shadowColor: '#072722'`, `shadowOpacity: 0.08`, `shadowRadius: 16`).
  - **Elevated Center "+" Primary Action**: Integrated a floating primary action circular button (`58x58pt` on phones, `64x64pt` on tablet) elevated above the navbar (`marginTop: -26pt`) in MedRec Teal (`#159A83`) with a 3.5pt solid white border and elevated teal drop shadow (`shadowColor: '#159A83'`, `elevation: 10`), navigating to `/record/add` with medium haptic feedback (`Haptics.impactAsync`).
  - **Refined 5-Action Layout Hierarchy**:
    - `Records`: Folder outline icon, navigates to `/(tabs)`.
    - `Scan`: QR Code outline icon, navigates to `/(tabs)/scan`.
    - `Add (+)`: Floating center primary action, navigates to `/record/add`.
    - `Camera`: Camera outline icon, launches `/record/add` directly in document camera mode (`initialMode: 'camera'`).
    - `Profile`: User outline icon (or dynamic avatar image), navigates to `/(tabs)/profile`.
  - **Subtle Active & Pressed States**: Active tabs receive a refined translucent background tint (`rgba(21, 154, 131, 0.09)`), MedRec Teal icon tint, and SemiBold LexendDeca typography without bulky pill outlines. Inactive tabs display clean muted slate (`#94A3B8`). Added press scale (`0.96`) and selection haptics.
  - **Direct Camera Mode Integration (`record/add.tsx`)**: Added `useLocalSearchParams` parsing for `initialMode: 'camera'` / `mode: 'camera'`, opening `DocumentCamera` instantly from the bottom navigation bar.
  - **Responsive & Safe Area Support**: Full viewport adaptation across compact phones, standard/large phones, tablet portrait (`maxWidth: 500pt`), and tablet landscape (`TabletLandscapeNavRail`).
- **Durable Knowledge Documentation**:
  - Recorded technical decision `DD-36` in `.brain/DECISIONS.md`.

## [1.4.14] — Tablet Notification Popup Modal Dual-Layer Animation Decoupling

- **Dual-Layer Tablet Architecture (`NotificationCenterModal.tsx`)**:
  - **Decoupled Scrim & Modal Animation**: Replaced unified `<Modal animationType="slide">` on tablet viewports with a two-layer architecture:
    - **Layer 1 (Independent Stationary Backdrop)**: Full-screen `StyleSheet.absoluteFillObject` stationary dimming overlay (`backgroundColor: Colors.backdrop`) that fades in from `0 -> 1` over 250ms on entrance and fades out from `1 -> 0` over 200ms on exit, with zero vertical translation.
    - **Layer 2 (Independent Sliding Dialog Card)**: Sibling container (`tabletCenterWrapper`) housing the centered modal dialog card (`containerTablet`, clamped with `minHeight: 320` to prevent loading collapse), which slides up from `heightRef.current -> 0` over 280ms with `Easing.out(Easing.cubic)` and exits smoothly to bottom over 220ms with `Easing.in(Easing.cubic)`.
  - **Root Transparency**: Switched `modalRootTablet` to `backgroundColor: 'transparent'` and `animationType="none"`, resolving the visual defect where the entire backdrop was translated upward across the screen from below the viewport.
  - **Decoupled Lifecycle & Immediate State Sync**: `onClose()` notifies parent state immediately upon close initiation to prevent blocked re-open taps, while internal `modalVisible` and `isClosingRef` coordinate the 220ms parallel reverse exit animation before unmounting.
  - **Touch Quarantine & Smooth Reversal**: Wrapped backdrop in `pointerEvents={modalVisible ? 'auto' : 'none'}` and dialog in `pointerEvents={isClosingRef.current ? 'none' : 'auto'}` to prevent touch passthrough; preserved in-flight animation values on rapid re-open to eliminate visual snapping.
  - **Optimistic Non-Blocking Dismissal**: Un-awaited `markAsRead(notification.id)` as an asynchronous background task so modal dismissal and route navigation begin instantaneously on tap without network latency delays.
  - **Phone UI Isolation & A11y**: Mobile viewports (`!isTablet`) retain 100% untouched native iOS `pageSheet` presentation, `<DragHandle />`, `onDismiss={onClose}`, and native swipe-to-dismiss behavior. Added `accessibilityRole="tablist"` / `"tab"`, `hitSlop`, and `accessibilityViewIsModal`.
- **Integration Fix (`(tabs)/index.tsx`)**:
  - Connected `onOpenAiSummary={handleSummarize}` to `<NotificationCenterModal>` in the Tablet Landscape Workspace caller.
- **Durable Knowledge Documentation**:
  - Recorded technical decision `DD-35` in `.brain/DECISIONS.md`.

## [1.4.13] — Native Google Sign-In & Backend ID Token Verification Architecture

- **Native Mobile Integration (`mobile/`)**:
  - **Native Google SDK**: Installed `@react-native-google-signin/google-signin` and configured config plugin in `app.json` with iOS URL scheme support.
  - **AuthContext Integration (`AuthContext.tsx`)**: Configured `GoogleSignin` on app mount with `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Added safe dynamic module loading (`try/catch`) to prevent TurboModule crashes (`RNGoogleSignin could not be found`) in Expo Go or unlinked binaries. Implemented `loginWithGoogle` with silent user cancellation handling (`SIGN_IN_CANCELLED`), Play Services checks, SecureStore session persistence, and profile sync.
  - **Screen Wiring (`login.tsx`, `register.tsx`)**: Connected native `loginWithGoogle` into social login buttons on both login and registration screens.
  - **API Client (`api.ts`)**: Added `loginWithGoogle(idToken)` endpoint method and refined TypeScript array typing.
- **Backend Verification & Takeover Defense (`backend/`)**:
  - **Cryptographic Token Verification (`authController.js`)**: Integrated `google-auth-library` (`OAuth2Client.verifyIdToken`) strictly targeting `GOOGLE_WEB_CLIENT_ID` and validating `payload.email_verified === true`.
  - **Pre-Account Takeover Defense**: For existing local email/password accounts, atomically links Google identity (`linkGoogleAccount`), bumps `users.token_version` to sanitize rogue active JWT sessions, and emits a high-priority `security_alert` notification.
  - **Passwordless Safety**: Added null-safe guards to `authController.login` and `profileController.changePassword` preventing runtime errors when passwordless Google users interact with password flows.
  - **Route & Rate Limiting (`authRoutes.js`, `app.js`)**: Mounted `POST /auth/google` and `POST /api/auth/google` guarded by strict IP/user rate limiting (`authLimiter`).
  - **PostgreSQL Schema (`schema.sql`, `userModel.js`)**: Added `google_id VARCHAR(255)` and `auth_provider VARCHAR(50) DEFAULT 'local'` with partial unique index `idx_users_google_id`.
- **Automated Testing & Quality Verification**:
  - **Backend Tests (`auth.test.js`)**: Added 7 comprehensive tests covering token validation, invalid token rejection, unverified email rejection, new user creation, local account linking, session invalidation, and passwordless login rejection.
  - **Test Suite Results**: 71/71 tests passing across all 8 suites (`npm test`).
  - **Static Analysis**: 0 TypeScript compilation errors (`npx tsc --noEmit`), 0 ESLint errors.
- **Durable Knowledge Documentation**:
  - Recorded technical decision `DD-34` in `.brain/DECISIONS.md`.
  - Updated `.brain/TODO.md`, `.brain/NOTES.md`, `.brain/PROJECT_CONTEXT.md`, and `.brain/ARCHITECTURE.md`.

## [1.4.12] — Records Selection Mode Done Button Parity With Default Select Button

- **Header Done Button Parity (`(tabs)/index.tsx`)**:
  - Aligned the "Done" button in selection mode with the existing "Select" button styling on the default Records tab.
  - **Mobile View**: Both `Select` and `Done` now share `styles.selectHeaderBtn` and `styles.selectHeaderText`, rendering a cohesive bordered pill button with teal text on white background (`backgroundColor: Colors.cardBg`, `borderColor: Colors.border`, `color: Colors.teal`).
  - **Tablet Landscape Workspace**: Master actions header now consistently uses `styles.selectBtn` and `styles.selectBtnText` across both selection and normal states.
  - **Visual Pressed Feedback & Design Tokens**: Added `selectHeaderBtnPressed` and `selectBtnPressed` active press opacity feedback; replaced raw hardcoded `#F1F7F6` with theme design token `Colors.divider`.
  - **Code Cleanliness**: Removed obsolete `doneHeaderBtn`, `doneHeaderBtnPressed`, and `doneHeaderText` styles.
- **Empty-State Resilience & Lifecycle Guards (`(tabs)/index.tsx`)**:
  - **P2 Fix**: Preserved header button mounting when `selectionMode` is active (`(records.length > 0 || selectionMode)`), preventing users from getting trapped in selection mode if records become 0 while selecting.
  - **Auto-Reset on Empty**: Added explicit reset in `loadRecords` to clear `selectionMode` and `selectedIds` if fresh records query returns 0.
  - **P3 Fix**: Added early return guard in `toggleSelectMode` and tablet master header to block entering selection mode on an empty records list.
- **Durable Knowledge Documentation**:
  - Recorded technical decision `DD-33` in `.brain/DECISIONS.md`.

## [1.4.11] — Records Selection Mode Normal-Layout Alignment & Top Actions

- **Single Layout Foundation (`(tabs)/index.tsx`)**:
  - Rebuilt selection mode to strictly follow the normal Records screen layout instead of rendering a separate bottom floating action bar or alternate modal panel.
  - Record cards scroll naturally down to the bottom navigation bar with standard list clearance (`Math.max(insets.bottom, 20) + tabBarClearance`).
  - Completely removed the floating bottom action container, restoring full viewport visibility and eliminating bottom crowding.
- **Top Greeting Scoping (`(tabs)/index.tsx`)**:
  - Greeting (`"Hello, [User] / Here's your health overview"`) is now rendered exclusively in normal mode (`!selectionMode`).
  - When entering selection mode, the greeting is hidden, moving directly to the top action area.
- **Single Compact Header Done Pill (`(tabs)/index.tsx`)**:
  - Consolidated all Done triggers into exactly ONE button located at the top-right header, toggling in place of `[Select]` (`[Select] [Bell]` -> `[Done] [Bell]`).
  - Styled as a compact action pill (`backgroundColor: Colors.teal` `#159A83`, `height: 30`, `paddingHorizontal: 14`, `borderRadius: Radii.pill`, white text, comfortable touch target with `hitSlop={8}`).
  - Completely eliminated duplicate Done buttons across the UI.
- **Top Actions Flow (`(tabs)/index.tsx`)**:
  - **Position 1 (Generate AI Health Summary)**: Positioned near the top of the header. In selection mode, summarizes selected records only (`handleSummarizeSelected`), shows loading state (`summarizingSelected`), and disables when 0 records are selected.
  - **Position 2 (Share Selected Records)**: Positioned directly underneath the AI summary banner. Visible exclusively in selection mode, styled cleanly as a secondary action button with plain text only (`"Share Selected Records"`, no icons, no emoji, no dynamic record count).
  - **Position 3 (Selection Count & Select All)**: Positioned directly under the Share button, displaying current selection status and a toggle to select all records.
  - **Position 4 (Search & Filters)**: Followed naturally by `RecordSearchBar`, category filter chips carousel, section counter header, and the record cards.
- **Selection Privacy & State Lifecycle (`(tabs)/index.tsx`)**:
  - Filter-Bound `selectAllRecords`: Updated selection logic to operate strictly on visible records (`sortedRecords`), preventing sensitive filtered-out medical records from being unintentionally selected or shared. Added toggle support (`"Select all"` / `"Deselect all"`).
  - Tab Blur Cleanup & Reconciliation: Added cleanup handler to `useFocusEffect` to exit selection mode and reset selected IDs on tab blur. Reconciled `selectedIds` in `loadRecords` to purge stale or deleted record IDs.
  - Virtualization & Accessibility: Added `extraData={[selectedIds, selectionMode]}` to FlatLists and `accessibilityState={{ selected: isSelected }}` to record cards.
  - Tablet Landscape Workspace Parity: Added AI Health Summary trigger to tablet landscape master selection pane, kept Share button mounted consistently, and wired `onOpenAiSummary` to navigation modals.
  - Dead Code Elimination: Removed orphaned component `mobile/components/records/RecordRow.tsx`.
- **Backend & API Architecture (`aiController.js`, `recordModel.js`, `api.ts`)**:
  - Extended `/api/ai/summarize` to accept `recordIds` string array.
  - Added UUID regex validation in `aiController.js`, returning `400 Bad Request` if malformed non-UUID strings are passed.
  - Filtered in PostgreSQL via `id = ANY($2::uuid[])` ensuring user tenancy and ID bounding.
  - Maintained fallback clinical synthesis and informational disclaimer.
- **Testing & Code Quality**:
  - Integration test `E2E-06b` added in `backend/tests/integration.test.js` (including non-UUID 400 validation).
  - 64/64 backend tests pass (`npm test`).
  - 0 TypeScript compilation errors (`npx tsc --noEmit`).
  - 0 ESLint warnings or errors (`npx eslint app/(tabs)/index.tsx`).

---

## [1.4.10] — Record Card Edit Trigger Scoping & Edit Modal Image Capture

- **Records Tab Edit Button Scoping (`(tabs)/index.tsx`)**:
  - Removed the inline Edit button from individual record list cards in the dashboard FlatList.
  - Kept the Edit trigger exclusively on the record metadata level (Tablet Master-Detail Overview header card and Record Details view [`record/[id].tsx`]).
- **Record Edit Modal Image Capture & Preview (`RecordEditModal.tsx`)**:
  - Added full document capture, gallery selection, and legibility preview matching `record/add.tsx`.
  - Integrates `DocumentCamera`, `DocumentPreview`, and `AttachedDocumentCard` with thumbnail inspection, retake, and removal flows.
  - Excludes AI summary banners and delete buttons as requested.
  - Handles Cloudflare R2 upload on save if a new document is attached or detached.

---

## [1.4.9] — Security & Data Integrity Audit Fixes (Code Review P0–P2)

### P0 — Security Fix
- **`profileController.js` — Password Change Verification**:
  - `changePassword` now calls `bcrypt.compare(currentPassword, user.password_hash)` before updating.
  - Returns `400` if `currentPassword` is missing; `401` if it does not match the stored hash.
  - Requires `userModel` and `bcryptjs` imports added to `profileController.js`.
  - Test updated in `profile.test.js` to supply `currentPassword` on the successful change case.

### P0 — Data Integrity Fix
- **`recordController.js` + `recordModel.js` — Presigned URL Never Stored in DB**:
  - `updateRecord` now strips any incoming `attachment_url`/`attachmentUrl` that begins with `http://` or `https://` (i.e. short-lived presigned URLs echoed back by the mobile client).
  - `updateRecordForUser` in `recordModel.js` has a matching guard so the DB layer also rejects presigned URLs if called directly.
  - Existing attachment R2 key is preserved when the client sends a signed URL back.

### P1 — Orphaned R2 Object Cleanup on Record Update
- **`recordController.js`**: `updateRecord` now fetches the existing record before writing and calls `deleteR2Object` if a new, different R2 key is provided (replaces or removes previous attachment).

### P1 — R2 Upload Silent Fallback Removed
- **`mobile/app/record/add.tsx`**: Upload failure now shows an `Alert` and aborts the save (with `setSaving(false)`) instead of silently falling back to a local `file://` URI that would never be accessible from the server.
- **`mobile/app/(tabs)/profile.tsx`**: Avatar upload failure now reverts the optimistic preview, shows an `Alert`, and aborts the profile update instead of sending a base64 data URI payload to the server.

### P1 — Dead Code Removed
- **`backend/src/models/tokenModel.js`** deleted — queried non-existent `revoked_tokens` table, was never imported anywhere.

### P1 — Server-Side JWT Invalidation on Logout
- **`authController.js` `logout`**: Now calls `userModel.incrementTokenVersion(req.user.id)` so existing JWTs are immediately rejected by the auth middleware after logout.
- **`userModel.js`**: Added `incrementTokenVersion(id)` function.

### P2 — Notification Unread Count Guard
- **`NotificationContext.tsx` `markAsRead`**: Now checks `target.read === false` before decrementing `unreadCount`. Prevents the count going negative when the same notification is marked read more than once.

### P2 — Idempotent CHECK Constraint in Schema
- **`schema.sql`**: Added a `DO $$ … END $$` block that idempotently adds the `medical_records_type_check` constraint for existing databases that were created before the `CHECK` was defined inline in `CREATE TABLE`.

---

## [1.4.8] — Shared Records ZIP Export Bundle: Streaming Archive & One-Tap Direct Download
- **Backend ZIP Export Endpoint (`GET /share/:token/zip` & `GET /share/:token/download-all`)**:
  - Implemented high-performance ZIP archive packaging using `jszip` in `shareController.js`.
  - Automatically bundles a structured, human-readable clinical summary index (`README_CLINICAL_SUMMARY.txt`), machine-readable `records_metadata.json`, and all scanned document attachments into an `attachments/` folder.
  - Supports direct streaming from Cloudflare R2 bucket (`getR2ObjectStream`), base64 data payloads, and presigned/HTTP URLs.
  - Added automated Jest integration tests verifying ZIP archive structure and response headers (63/63 passing).
- **Mobile Shared Records ZIP Downloader (`scan.tsx` & `api.ts`)**:
  - Added `getSharedZipUrl` helper in `api.ts`.
  - Upgraded `downloadFileDirectly` with native `.zip` MIME type mapping (`application/zip`) and iOS/Android UTI support (`public.zip-archive`).
  - Added prominent primary **"Download All as ZIP Archive"** banner card at the top of the Download Records Modal on both phone and tablet layouts.
  - Added loading indicator and direct device download/save sheet integration.

## [1.4.7] — Record Metadata Editing: Backend API & Mobile Edit Modal
- **Record Metadata Editing Endpoint (`PUT /records/:id` & `PATCH /records/:id`)**:
  - Implemented `updateRecordForUser` in `recordModel.js` and `updateRecord` in `recordController.js` supporting title, category type, event date, and description updates.
  - Enforced strict user ownership isolation and input validations.
  - Added automated Jest integration tests verifying metadata updates and error rejection.
- **Mobile Edit Modal Component (`RecordEditModal.tsx`)**:
  - Built interactive sliding modal for editing record title, horizontal scrolling category carousel with pill chips matching the Add Record tab (`record/add.tsx`), event date with quick "Set Today" shortcut, and multi-line clinical notes.
  - Integrated into **Records Tab** (`(tabs)/index.tsx`) cards, **Tablet Landscape Workspace Detail Pane**, and **Record Details Screen** (`record/[id].tsx`).
  - Added instant optimistic state synchronization on save with haptic feedback.

## [1.4.6] — Instant Image Lightbox Pop-Up: High-Velocity Presentation & Dismiss Transitions
- **Instant Expand & Dismiss Velocity**:
  - Re-tuned `ImageLightboxOverlay` in `scan.tsx` and `record/[id].tsx` from 250ms spring settling down to snappy 70–90ms quad-eased parallel tracks.
  - Adjusted initial content scale to `0.96`, eliminating visual lag and creating an instant, crisp document pop-up feel.

## [1.4.5] — Notification Redesign: Fullscreen Sliding Modal, Standalone Icons & Subtle Contrast
- **Fullscreen Sliding Modal Presentation**:
  - Maintained smooth fullscreen sliding pageSheet modal with top drag handle on phones and responsive floating modal on tablets.
  - Harmonized typography (`LexendDeca` weights), spacing, segmented filter controls (`All` / `Unread`), and clean header layout.
- **Standalone Thematic Icons (Zero Background Highlights)**:
  - Removed all background highlight boxes, colored circles, and pills behind notification icons in `NotificationCard`.
  - Configured `qr-code-outline` icon specifically for doctor QR code generation, expiration, and revocation notifications (`share_created`, `share_expired`, `share_revoked`).
- **Clean Read vs. Unread Surface Distinction**:
  - Removed vertical green/teal sidebar stripe on unread notifications.
  - Unread notifications utilize clean true white `#FFFFFF` surface background, subtle teal border, and teal dot indicator.
  - Read notifications utilize slightly darker `#F2F7F5` surface tone, maintaining clear visibility without disabled appearance.

## [1.4.4] — Profile Picture Cloudflare R2 Presigned Download URL Resolution & Resilient Fallback
- **Presigned Avatar Download URLs**:
  - Implemented `attachSignedAvatarUrl` across `profileController.js` (`getProfile`, `updateProfile`) and `authController.js` (`login`, `register`, `me`).
  - Automatically resolves relative Cloudflare R2 object storage keys (e.g. `userId/fileUuid.jpg`) into valid 24-hour signed download URLs so React Native `<Image>` renders uploaded profile photos correctly.
  - Added resilient local image preview fallback in `mobile/app/(tabs)/profile.tsx` with error recovery to high-contrast monogram initials.
  - Added automated Jest integration tests verifying that profile updates with storage keys resolve to signed URLs.

## [1.4.3] — Session Security & Capacity Control: Strict 5 Active Sessions Cap
- **Active Share Session Limit**:
  - Enforced `MAX_ACTIVE_SHARE_SESSIONS = 5` per patient across all doctor access tokens.
  - Implemented `shareModel.pruneExcessActiveShares` in PostgreSQL to automatically recycle/revoke the oldest active sessions when new QR codes are generated.
  - Updated mobile UI in `mobile/app/(tabs)/share.tsx` to display live active session counts (`Active Access Sessions (X/5)`) and `MAX 5 ACTIVE` badge indicators.
  - Added automated Jest integration tests verifying that creating 7+ sessions automatically restricts active database count to 5 and revokes excess tokens with immediate 404 responses.

## [1.4.2] — Shared Records Clinical Actions: AI Session Summarization, R2 Document Downloads & Recipient Termination
- **Summarize Shared Records**:
  - Implemented `POST /api/share/:token/summarize` reusing `aiService.summarizeRecords` to synthesize a clinical overview across all active shared records with medications, diagnoses, and follow-ups.
  - Added deterministic structured clinical synthesis fallback for 100% offline/mock resilience with 0 hallucinations.
  - Integrated modal UI with loading states, formatted cards, and clear non-diagnostic medical disclaimer.
- **Download Shared Records**:
  - Implemented single-record document downloads and session bundle export modal with Cloudflare R2 short-lived signed URLs.
  - Preserved strict tenant isolation with no credential exposure.
- **Recipient Session Termination (Done — Terminate Access)**:
  - Implemented recipient-initiated revocation via `POST /api/share/:token/terminate` and `shareModel.terminateByToken`.
  - Added confirmation dialog clearly warning that access is being ended without altering the patient's underlying PostgreSQL records.
  - Successfully tested immediate 404 response on any subsequent access attempt.

## [1.4.1] — Shared Records Document Viewer Redesign & Fullscreen Lightbox
- **First-Class Document Preview Container**:
  - Redesigned `mobile/app/(tabs)/scan.tsx` and `mobile/app/record/[id].tsx` with prominent dedicated document containers preserving exact aspect ratios (`resizeMode="contain"`).
  - Supported portrait medical scans and landscape diagnostic reports without stretching, clipping, or distortion.
  - Implemented asynchronous loading states (`ActivityIndicator`) and network error recovery fallbacks.
  - Added clean empty-state cards for medical records with no attached images.
- **Interactive Fullscreen Lightbox**:
  - Implemented high-contrast dark overlay modal allowing doctors and patients to inspect medical scans at maximum viewport resolution with tap-to-dismiss and dedicated close button.
- **Doctor Context & Sovereign Session Badges**:
  - Added sovereign patient-shared badges and temporary read-only indicators in both Phone modal and Tablet master-detail workspaces.

## [1.4.0] — Direct PostgreSQL Database, Cloudflare R2 Object Storage & Backend-Owned Authentication
- **Direct PostgreSQL Architecture**:
  - Engineered direct PostgreSQL schema in `backend/src/migrations/schema.sql` with `public.users` storing bcrypt-hashed passwords and `token_version` for instant session revocation.
  - Implemented automatic profile provisioning via trigger `on_user_created` executing `public.handle_new_user()`.
  - Maintained full foreign key integrity with `ON DELETE CASCADE` across `user_profiles`, `medical_records`, `shared_access`, and `notifications`.
- **Cloudflare R2 Object Storage Integration**:
  - Implemented AWS SDK v3 S3 client (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) in `backend/src/config/r2.js` targeted at Cloudflare R2.
  - Issued single-use presigned upload URLs (`POST /storage/upload-url`) and 15-minute signed download URLs (`GET /storage/download-url`) with strict user prefix containment (`<userId>/<uuid>.<ext>`).
  - Integrated storage cleanup on medical record deletion and cascade account deletion.
- **Dependency Optimization & Decoupling**:
  - Completely purged all `@supabase/supabase-js`, `jwks-rsa`, and `jose` packages from both `backend/` and `mobile/`.
  - Preserved 100% of mobile UI screens, responsive layouts, forms, and client methods via native Express REST API.
- **Comprehensive Test Suite**:
  - 55 automated test suites passing with 100% success rate across integration, authentication, profile, records, sharing, storage, notifications, and security threat hardening.

## [1.3.0] — Initial Cloud Architecture Research & Foundation
- **Supabase Cloud PostgreSQL & Auth Schema**:
  - Re-architected PostgreSQL schema with foreign keys referencing `auth.users(id) ON DELETE CASCADE`.
  - Added trigger `on_auth_user_created` to automatically populate `public.user_profiles` upon signup.
  - Implemented Row Level Security (RLS) policies across `user_profiles`, `medical_records`, `shared_access`, and `notifications`.
- **Asymmetric JWKS Token Verification Middleware**:
  - Implemented pure Node.js native JWKS key resolver in `backend/src/utils/jwks.js` with remote key caching from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
  - Integrated multiple fallback mechanisms (symmetric secrets, Supabase Admin `getUser`, local test runners).
- **Presigned Supabase Storage Pipeline**:
  - Created `POST /api/storage/upload-url` and `GET /api/storage/download-url` for single-use presigned upload/download URLs.
  - Enforced private bucket isolation for `medical-records` with short-lived (15-minute) signed URLs for clinical scans.
  - Integrated direct mobile uploads in `record/add.tsx` and `(tabs)/profile.tsx`.
- **Google OAuth 2.0 PKCE Handshake**:
  - Configured `loginWithGoogle()` in `mobile/context/AuthContext.tsx` using `expo-web-browser` and `medrec://auth/callback`.
  - Connected "Sign in with Google" button in `mobile/app/login.tsx`.
- **Automated Test Suite Expansion**:
  - Implemented 48 automated test suites spanning auth, profile, records, sharing, storage, notifications, and security hardening with 100% pass rate.

## [1.2.3] — Tablet Authentication UI Refinement & Landscape Brand Showcase Expansion
- **Tablet Landscape Split-Screen Visual Panel with 3:4 Native Graphic (`mobile/app/login.tsx` & `register.tsx`)**:
  - Balanced both columns to equal 50/50 widths (`tabletLandscapeLeft: { flex: 1 }` and `tabletLandscapeRight: { flex: 1 }`), giving equal architectural weight to the visual panel and authentication card.
  - Implemented the new 3:4 (`1792 × 2400px`) `graphic-2.png` asset as the full-bleed background of the entire left column (`StyleSheet.absoluteFillObject`, `resizeMode: 'cover'`), occupying 100% width and 100% height with zero borders, gaps, or distortion.
  - Overlaid the prominent MedRec branding (80×80pt logo, 36pt bold title, 16pt tagline) comfortably in the upper sky region (`position: 'absolute'`, `top: 128`, `zIndex: 2`) with clean left-alignment between title and tagline.
  - Removed all bottom security trust badges ("End-to-End Encrypted", "Sovereign Vault" / "Patient-Sovereign Data", "Doctor QR Access" / "Biometric Security") across Login and Create Account screens.
- **Phone-Harmonized Centered Branding Architecture (`mobile/app/login.tsx` & `register.tsx`)**:
  - Restructured Tablet Portrait branding across Login and Create Account screens to strictly follow the phone authentication UI's centered visual hierarchy: centered MedRec logo mark (52×52pt for Login, 50×50pt for Register), centered app title ("MedRec", 24pt/22pt `LexendDeca-Bold`), and centered supporting tagline ("Your Health Records in Your Pockets", 12pt/11.5pt `LexendDeca-Regular`).
- **Compact Floating Tablet Card Architecture (`maxWidth: 420pt`)**:
  - Centered a compact, mobile-proportioned white authentication card (`maxWidth: 420pt`) with 24pt rounded corners, subtle `#E5F0EE` border, and soft elevation shadow on the `#F4FAF9` tablet portrait canvas.
  - Retained the exact phone component structure and vertical flow (Branding -> Blue Heading -> Subtitle -> Inputs with icons -> Primary CTA -> Divider -> Google SSO -> Switch CTA -> Footer Terms & Privacy).
  - Scaled horizontal and vertical spacing modestly (32pt horizontal padding, 28pt top padding for Login, 26pt for Register) to eliminate dead space while guaranteeing zero scrolling on standard tablet portrait viewports.
- **Strict Responsive Layout Quarantine**:
  - Guarded all changes within `isTablet && isLandscape` and `isTablet && !isLandscape` branches, guaranteeing 100% preservation of Phone UI (`!isTablet`).

- **Decoupled 2-Layer Modal Animation Architecture for Profile Tab Edit Modals**:
  - Re-architected both Edit modals launched from the Profile tab (`ProfileEditModal.tsx` for Demographics & Medical ID, and `ChangePasswordModal.tsx` for Password Updates) to separate the background dimming animation from the modal sheet/card popup animation on both Phone and Tablet layouts.
  - **Layer 1 (Independent Stationary Dimming Backdrop)**: An absolute-fill backdrop (`rgba(0, 0, 0, 0.5)`) that animates strictly via opacity fade-in (220ms) and fade-out (180ms) without sliding or translating with the modal.
  - **Layer 2 (Independent Modal Entrance/Exit Transitions)**:
    - **Tablet (`isTablet`)**: Enters with a subtle scale (`0.93 -> 1.0`) and vertical translation (`14pt -> 0pt`) alongside opacity (`0 -> 1`) in 240ms cubic easing; exits smoothly on dismiss before unmounting.
    - **Phone (`!isTablet`)**: Enters with bottom sheet translation (`windowHeight -> 0`) alongside opacity in 260ms cubic easing; exits cleanly downwards in 200ms cubic easing.
  - **Lifecycle & Dismissal Guarding**: Integrated `modalVisible` state, `prevVisibleRef`, and `animTokenRef` sequence tokens to prevent race conditions during rapid dismissals and save events, ensuring dismissal animations run smoothly to completion before calling `onClose()`.
  - Preserved 100% of all form fields, input validations, Save/Update API mutations, cancel actions, accessibility roles, and styling across compact phones, standard phones, tablet portrait, and tablet landscape layouts.
- **Code Review Security & Asset Cleanup (`mobile/components/ChangePasswordModal.tsx`, `login.tsx`, `register.tsx`)**:
  - Fixed independent visibility state in `ChangePasswordModal.tsx` by introducing dedicated `showConfirm` / `setShowConfirm` state, resolving input coupling where toggling the confirm password eye icon inadvertently unmasked the new password field.
  - Removed dead `AuthBrandingHeader` imports from `login.tsx` and `register.tsx` and pruned orphaned component files.
  - Purged unreferenced binary assets (`mobile/assets/logo/logo`) and OS metadata files from mobile asset directories.
  - Synchronized `PROJECT_CONTEXT.md` component catalog with active codebase architecture.

## [1.2.1] — Tablet Portrait Add Health Record Modal Header Simplification & Asset Cleanup
- **Tablet Portrait Add Health Record Duplicate Save Button Removal**:
  - Removed duplicate `tabletHeaderSaveBtn` from the top-right corner of the Tablet Portrait Add Health Record modal header in `mobile/app/record/add.tsx`.
  - Replaced with balanced `tabletHeaderSpacer` (`width: 32`) to maintain title centering and dismiss control alignment with zero regressions to phone or tablet landscape layouts, leaving the primary bottom Save CTA (`tabletSaveBtn`) fully functional.
- **Repository Hygiene & Asset Cleanup**:
  - Relocated unreferenced binary document `MINUTES-OF-THE-MEETING-2.0.docx` from `mobile/assets/icons/` into `MedRec/17 - Personal Notes/` to prevent unnecessary bundle weight during Expo asset compilation.

## [1.2.0] — Full-Stack Production Security, Privacy & App Store Readiness Hardening
- **SEC-R01: Account Lockout Denial-of-Service Defense**:
  - Refactored `authController.js#login` to validate credentials first, ensuring legitimate users with valid passwords are not denied service by third-party unauthenticated failed attempts from other IPs.
  - Coupled failed attempt auditing with strict IP rate limiting (`authLimiter`) and progressive response delays.
- **SEC-R02: Password Reset Token Leakage Remediation**:
  - Unconditionally purged `resetTokenPreview` from `authController.js#forgotPassword` across all environments (`production`, `development`, `test`), returning only generic confirmation messages to eliminate account takeover vulnerabilities.
- **SEC-R03: iOS Camera Purpose String & App Store Compliance**:
  - Added `expo-camera` plugin configuration with explicit `cameraPermission` (*"MedRec uses your camera to scan medical records and doctor sharing QR codes."*) to `mobile/app.json`, eliminating App Store Connect rejection ITMS-90683.
- **SEC-R04: Atomic Record Ownership in Sharing (Pagination Invariant)**:
  - Added `recordModel.verifyOwnership(userId, recordIds)` using atomic parameterized SQL (`WHERE user_id = $1 AND id = ANY($2::uuid[])`), replacing in-memory array filtering in `shareController.js#createShare` and fixing false IDOR sharing rejections for users with >50 records.
- **SEC-R05: User-Keyed AI Rate Limiting**:
  - Re-keyed AI rate limiting in `aiRoutes.js` using `req.user.id` (10 requests / 15-min window per authenticated user) following `requireAuth`, preventing cellular CGNAT IP collisions.
- **SEC-R07: Strict Database TLS Configuration**:
  - Updated `backend/src/config/db.js` to enforce strict certificate verification by default in production with configurable `PGSSL_REJECT_UNAUTHORIZED`.
- **SEC-R08: App Store Privacy Policy Web URL Binding**:
  - Wired `mobile/app/login.tsx` privacy policy triggers to open the hosted public URL `https://medrec.health/privacy` via `Linking.openURL()` with offline dialog fallback.
- **SEC-R10: Database Row Level Security (RLS)**:
  - Enabled Row Level Security on `medical_records`, `user_profiles`, `shared_access`, and `notifications` in `backend/src/migrations/schema.sql`.
- **Comprehensive Automated Negative Security Test Suite**:
  - Created `backend/tests/security.test.js` covering Lockout DoS immunity, reset token leak prevention, bulk share pagination (>50 records), user-keyed AI rate limiting, token_version session revocation, and cross-user IDOR access/mutation barriers (35/35 passing backend tests).

## [1.1.1] — Tablet Portrait Global Navigation Toolbar Parity & Inset Normalization
- **Unified Global Top Toolbar Architecture**: Standardized Burger Navigation and Notification Bell positions across `(tabs)/profile.tsx` (Source of Truth), `(tabs)/index.tsx`, `(tabs)/share.tsx`, and `(tabs)/scan.tsx` on Tablet Portrait and Tablet Landscape, anchoring the controls as fixed direct children of the root view (`paddingTop: insets.top + 12`, `paddingLeft/Right: Math.max(insets, screenPadding)`).
- **Tablet Landscape Nav Rail Icon-Only & Burger Integration**: Removed background highlight pills and text labels from the left navigation rail, adopting the phone UI's pure active/inactive icon asset switching paradigm and original `add-record.png` icon asset. Relocated the Burger menu button to the top of the Nav Rail with `SideMenuModal` integration.
- **Tablet Landscape Notification Deduplication & Scan Tab Burger Removal**: Removed the redundant notification bell from the Nav Rail, standardizing on a single notification button aligned to the right in the main content top toolbar (`styles.topToolbar`), and hid the duplicate burger button across both the camera viewfinder (`cameraTopBar`) and list view states of `(tabs)/scan.tsx`.
- **Tablet Landscape Record Metadata Vertical Alignment**: Removed redundant safe area top inset from `detailScrollContent` in `(tabs)/index.tsx`, eliminating the empty vertical space above the Record Metadata section and aligning it directly with the top of the master browser pane.
- **Tablet Landscape Document Attachment / Capture Color Harmonization**: Standardized Document Attachment and Document Capture hero/accent colors on `Colors.blue` (`#1976D2`) to match the visual language of the AI Summary cards across `(tabs)/index.tsx`, `record/add.tsx`, and `record/[id].tsx`.
- **Tablet (Portrait & Landscape) Notification Panel & Independent Dimming**: Re-architected `NotificationCenterModal.tsx` across Tablet Portrait and Tablet Landscape to use a two-layer structure: an independent full-screen stationary backdrop (`backdropFadeAnim`) and a right-side sliding panel (`panelSlideAnim` from `+panelWidth` to `0`), eliminating bottom-sliding sheet transitions and dimming layer motion attachment while preserving Phone UI pageSheet modal.
- **Quiet Sovereign Drawer Navigation Redesign**: Redesigned `SideMenuModal.tsx` and `SideMenuItem.tsx` from heavy nested squircle containers into a lightweight, unboxed, single-line navigation architecture. Active/inactive states now rely on dedicated dual-state icon assets (`*-active.png` vs `*-inactive.png`), typographic weight (`LexendDeca-SemiBold` in `#159A83` vs `LexendDeca-Regular` in `#12343B`), and a slim 2.5px leading indicator accent. Unboxed the patient profile header and streamlined sections into "Patient Vault", "Clinical Tools", and pinned utility footer.
- **Orientation-Invariant Tablet Classification**: Fixed device categorization in `useResponsive.ts` to evaluate `isTablet = shorterDimension >= 600`, preventing smartphones in landscape orientation (width: 667–932pt, height: 375–430pt) from falsely activating tablet layouts, nav rails, or centered dialogs.
- **Modal Animation Lifecycle & Accessibility Hardening**: Enhanced `EmergencyIdModal.tsx`, `NotificationCenterModal.tsx`, and `SideMenuModal.tsx` with internal `modalVisible` state, `prevVisibleRef` transition tracking, `animTokenRef` sequence guards, and `.stopAnimation()` calls, eliminating rapid-tap race conditions and replayed opening transitions on orientation change. Added WCAG 2.2 AA `accessibilityRole="button"`, explicit accessibility labels, and `maxFontSizeMultiplier={1.35}` across all medical baseline and emergency call actions.

## [1.1.0] — Complete Tablet Landscape UI Redesign (88pt Nav Rail, Master-Detail & 2-Column Studios)
- **Zero Phone & Tablet Portrait UI Regression (100% Locked & Isolated)**: Strictly quarantined all tablet landscape architecture behind `isTablet && isLandscape` (and `isTabletLandscape`), preserving Phone (`!isTablet`) and Tablet Portrait (`isTablet && !isLandscape`) pixel-for-pixel with zero regressions.
- **Archetype 1 — 88pt Left Navigation Rail (`TabletLandscapeNavRail.tsx`)**:
  - Pinned 88pt left rail replacing the legacy 260pt sidebar, reducing lateral overhead to <8% screen width.
  - 36×36 MedRec logo brand glyph routing to `/(tabs)`.
  - 4 Primary vertical navigation tabs (Records, Share with active count badge, Scan, Profile) with 3.5px active teal vertical pill indicator and `#EDFAF7` background tint.
  - Centered quick action CTA: `+ Record` (44×44 teal circular button, white plus glyph) routing directly to `/record/add`.
  - Bottom utility cluster: AI Health Summary trigger, Notification Bell with red unread badge dot (opening 420pt right slide-over panel), Paramedic Emergency ID trigger (opening 680pt 2-column triage placard), and Patient Avatar/Monogram.
- **Archetype 2 — Master-Detail Clinical Workspaces (`(tabs)/index.tsx`, `(tabs)/scan.tsx`)**:
  - **Records Dashboard (`index.tsx`)**: Fixed 360pt browser pane on the left with sticky search input, category chips carousel with live record distribution counts, multi-select action banner, and independent scrolling FlatList with active state border (1.5px `#159A83`) and background highlight (`#F1FAF8`). Live detail canvas on the right (Flex 1) dynamically rendering balanced 2-column split when attachment exists (document zoom preview + delete on left, clinical notes + AI insights with 1-tap re-explain on right) or full-width bounded clinical canvas when no attachment exists.
  - **Doctor Scanner (`scan.tsx`)**: Pre-scan centered 280pt 1:1 camera viewfinder with teal corners + torch/guidance; Post-scan Master-Detail workspace (Left 340pt: authorized records list; Right Flex 1: complete read-only clinical notes, metadata, read-only notice, and floating "Scan Another Patient QR" CTA).
- **Archetype 3 — 2-Column Clinical & Intake Studios**:
  - **Add Record Studio (`record/add.tsx`)**: Centered 960pt 2-column intake studio (`transparentModal`, dimmed backdrop `rgba(0,0,0,0.45)`) pairing Left 48% (classification chips, title, date, multiline clinical notes with `KeyboardAvoidingView`) and Right 52% (camera capture hero / `AttachedDocumentCard`, AI analysis badge, sovereign vault notice).
  - **Sharing Studio (`(tabs)/share.tsx`)**: Centered 1040pt 2-column studio pairing Left 44% (high-contrast 200pt living QR code with 15s countdown ticker and instant revoke) and Right 56% (active doctor access sessions ledger + past history timeline).
  - **Record Details Studio (`record/[id].tsx`)**: Centered 1040–1100pt 2-column clinical split pairing Left 44% (overview + document photo preview with tap-to-inspect zoom modal + delete action) and Right 56% (clinical notes & observations + AI medical insights).
  - **Patient Profile Studio (`(tabs)/profile.tsx`)**: Centered 1040pt dual-column studio pairing Left 48% (Emergency Medical ID, clinical baseline, 1-tap ICE call button) and Right 52% (unboxed identity hero, personal demographics, security & preferences with JSON export, account & legal actions).
- **Archetype 4 — Content-Driven Clamped Modals**:
  - `EmergencyIdModal.tsx`: 680pt clamped 2-column triage placard with auto-height sizing (`flexGrow: 0, flexShrink: 1`).
  - `ProfileEditModal.tsx`: 640pt clamped form dialog with 2-column paired form grid and inline validation.
  - `ChangePasswordModal.tsx`: 480pt clamped security dialog with `flexGrow: 0` content-driven height.
  - `NotificationCenterModal.tsx`: 420pt right slide-over panel preserving workspace continuity.

## [1.0.0] — Approved Tablet & iPad UI Redesign (Master-Detail, Persistent Sidebar, Split Workspaces)
- **Zero Phone UI Regression (100% Locked & Isolated)**: Strictly quarantined all tablet layouts behind `isTablet` ternary checks, preserving the existing phone UI pixel-for-pixel across all phone form factors.
- **Adaptive Tablet Navigation Architecture**:
  - **Landscape Persistent Left Sidebar (`isTablet && isLandscape`, 260pt)**: Pinned left sidebar (`TabletPersistentSidebar.tsx`) with patient avatar card, main tab routes, "+ Add Health Record" CTA, AI Health summary trigger, Emergency Medical ID trigger, JSON vault export, and Sign Out.
  - **Portrait Floating Centered Pill Navbar (`isTablet && !isLandscape`)**: Clamped floating pill navbar (`maxWidth: 480`, `height: 68`, `borderRadius: 24`).
- **Auth Flow 2-Column Split & Centered Forms (`login.tsx`, `register.tsx`)**:
  - **Landscape Tablet**: 2-column split with Brand/Value-prop Showcase hero on left (75×75 logo mark, sovereign trust guarantees) and bounded 480pt form card on right.
  - **Portrait Tablet**: Centered bounded form card (`maxWidth: 480`) with top brand hero.
- **Records Dashboard Master-Detail Split Workspace (`app/(tabs)/index.tsx`)**:
  - **Landscape Tablet**: Interactive 2-column split workspace:
    - **Master Column (380pt)**: Search input, category filter carousel chips, multi-select action banner, and records list with active item selection state.
    - **Detail Column (Flex 1)**: Live inline document preview with tap-to-inspect zoom modal, clinical notes card, AI Medical Insights card with 1-tap regenerate button (`api.explain`), and delete record CTA.
  - **Portrait Tablet**: 2-column Bento Grid (`numColumns={2}`) with category chips and search.
- **Record Intake Single-Column Studio (`app/record/add.tsx`)**:
  - Centered 580pt bounded single-column intake studio on tablet matching the phone's vertical hierarchy and flow (Document Attachment → Record Details divider → Record Type chips → Form Card → Primary Save CTA).
- **Sharing Center Dual-Mode Screen (`app/(tabs)/share.tsx`)**:
  - **Landscape Tablet**: 2-Column Sharing Studio (`maxWidth: 1060pt`) with QR Hero + Security guarantee on left, and Active Access Sessions + Past Share History (top 10 records with expandable toggle) on right.
  - **Portrait Tablet**: Centered 600pt single-column vertical stack (LOCKED).
- **Record Details Dual-Mode Screen (`app/record/[id].tsx`)**:
  - **Landscape Tablet**: 2-Column Clinical Split Workspace (`maxWidth: 1100pt`) with Overview + Scanned Document Attachment + Delete action on left (44%), and Clinical Notes + AI Medical Insights on right (56%).
  - **Portrait Tablet**: Centered 600pt single-column vertical stack (LOCKED).
- **Emergency ID Triage Placard Modal (`components/EmergencyIdModal.tsx`)**:
  - **Landscape Tablet**: 2-Column High-Contrast Triage Placard (`maxWidth: 680pt`) with First Responder Summary + Demographics + Emergency Contact on left, and Offline Paramedic QR Code on right.
- **Notification Center Slide-Over Panel (`components/notifications/NotificationCenterModal.tsx`)**:
  - **Landscape Tablet**: Right-anchored Slide-Over Panel (`width: 420pt`) with smooth dismiss backdrop allowing concurrent dashboard inspection.
- **Doctor Scanner Master-Detail Workspace (`app/(tabs)/scan.tsx`)**:
  - Clamped 320×320 viewfinder in camera mode; Interactive Master-Detail split pane in loaded records mode (Left: Authorized records list; Right: Selected record full details & clinical notes inline).
- **Patient Profile Inset Grouped Bento Layout (`app/(tabs)/profile.tsx`)**:
  - 2-column bento layout on tablet with sidebar clearance offset (Left: Profile hero + Emergency & Medical ID; Right: Personal Demographics + Security Preferences + Legal/Account).
- **Centered Floating Modals**: All modals (`ProfileEditModal`, `EmergencyIdModal`, `ChangePasswordModal`, `NotificationCenterModal`) clamped with `maxWidth: 560-640pt`, dark backdrop dismiss, and paired 2-column form rows.
- **Review Hardening & Precision Polish**:
  - Enforced explicit `'UTC'` timezone flag in `app/record/[id].tsx` date formatting to eliminate day-shift anomalies across negative UTC offset devices.
  - Reset `detailExplanation` state on record selection switch in landscape Master-Detail view (`app/(tabs)/index.tsx`).
  - Added active interval ticker (`15s`) in `app/(tabs)/share.tsx` to maintain accurate living QR expiry countdown on static tablet displays.
  - Formatted dedicated floating modal for AI Health Summary in `TabletPersistentSidebar.tsx` with clinical disclaimer and scrollable synthesis card.
  - Refined "Add Health Record" tablet modal into a content-driven single-column floating studio card (`maxWidth: 580pt`) matching the phone's unified mental model and component flow with `transparentModal` presentation and dimmed backdrop dismiss, maintaining 100% phone modal isolation.

## [0.9.5] — Burger Navigation Drawer UI/UX Architecture & Scannability Upgrade
- **Dual-Coded Iconography**: Added 18×18 icons housed in dedicated 32×32 squircle containers (`#DDF5EE` teal for clinical tools, `#EBF3FB` blue for scan, `#F1F5F9` slate for data, `#FEF3F2` red for destructive logout), increasing visual search velocity.
- **Interactive Patient Demographic Card**: Upgraded user section to a 38×38 avatar/monogram card displaying patient name, email, and trailing chevron affordance linking directly to `/(tabs)/profile`.
- **Cognitive Section Chunking**: Structured navigation items into `CLINICAL TOOLS` and `DATA & VAULT` groups with subtle 10.5pt uppercase headers (`letterSpacing: 0.8`), eliminating harsh divider lines.
- **Active Route Highlighting Parity**: Implemented `isRouteActive` helper supporting Expo Router route variations (`/share`, `/scan`, `/profile`, `/`), styling active rows with `#F0F9F7` surface fill, `#159A83` bold label, and a 3.5px solid teal left vertical indicator pill.
- **Responsive Geometry & Accessibility**: Clamped phone drawer width to `Math.min(width * 0.80, 310)` (preserving ≥ 20% backdrop for thumb dismiss) and tablet drawer width to `Math.min(width * 0.42, 360)` with full WCAG 2.2 AA accessibility states (`accessibilityRole="button"`, `accessibilityState={{ selected: active }}`, `maxFontSizeMultiplier={1.3}`).
- **Pinned Footer & Version Stamp**: Pinned destructive Sign Out row and non-interactive `MedRec v1.0.0 • Sovereign Health Vault` micro-caption to the bottom safe area.

## [0.9.4] — Codebase Modernization, Dead Code Elimination & Architecture Consolidation
- **Domain Types & Category Map Centralization**: Created canonical `mobile/types/record.ts` (`MedicalRecord`, `RecordSection`) and `mobile/constants/records.ts` (`RECORD_TYPE_ASSETS`, `RECORD_TYPE_LABELS`, `CATEGORY_FILTERS`, `RECORD_TYPE_OPTIONS`), eliminating duplicate type declarations and asset dictionaries across 6+ screen files.
- **Shared Date & Age Utilities**: Created `mobile/utils/dateUtils.ts` containing pure, tested formatters (`calculateAge`, `formatDateLong`, `formatDateShort`, `formatTimeAgo`) with explicit UTC timezone flags, replacing copy-pasted date parsing in profile, emergency ID, records dashboard, and detail views.
- **Auth Bootstrap Deduplication**: Consolidated user state resolution in `mobile/context/AuthContext.tsx` by eliminating redundant `Promise.all([api.getMe(), api.getProfile()])` blocks in favor of `refreshUser()`.
- **API Client Generics**: Added `<T = any>` response typing to `request()` in `mobile/lib/api.ts` for type-safe API communication.
- **Dead Code & Template Pruning**: Safely removed 14 unused Expo starter boilerplate files (~1,800 lines of dead code), legacy boilerplate theme objects, and unreferenced packages (`@react-navigation/elements`, `expo-symbols`).
- **Render Performance**: Stabilized `keyExtractor` across `FlatList` components in records dashboard, scan viewer, and notification center modal.

## [0.9.3] — Login & Register Visual Design Restoration & Safe-Area Header Alignment
- **Login Visual Design Restoration (`01acaad`)**: Restored the canonical 320pt hero graphic with 75×75pt brand logo mark, 24pt bold wordmark, 30pt "Welcome Back!" title, 57.5pt input rows, primary teal CTA, Google sign-in card, and outlined "Create an Account" action.
- **Top Safe-Area Branding Alignment**: Adjusted `brandRow` in `login.tsx` to anchor at the top of the hero header (`top: insets.top > 0 ? insets.top + 5 : 40`, `left: -20`), providing seamless hardware notch/status bar clearance.
- **Register Visual Design Restoration (`0b579ad`)**: Restored the 210pt pure hero graphic banner with image transform (`translateY: 60`, `scale: 1.03`), 30pt "Create your Account" title, 57.5pt input rows, and bottom "Already have an Account? Sign In" transition row without extraneous header branding.
- **Preserved Core Security & Functionality**: Maintained active 5-attempt lockout countdown (`30s`), strict password complexity validation (min 8 chars, numbers, uppercase), and `useResponsive` integration.

## [0.9.2] — Global Header Toolbar & Notification Dot Alignment
- **Universal Toolbar Button Geometry**: Standardized top toolbar touch targets across all tab views (`Records`, `Profile`, `Share`, `Scan`, and `ScreenHeader.tsx`) with `padding: 4`, `minWidth: 40`, `minHeight: 40`, and `25×25px` icon containment.
- **Consistent Notification Dot Offsets**: Harmonized active notification dot badge dimensions and positioning to `right: 8`, `top: 5`, `width: 10`, `height: 9`, `borderRadius: 5` across all screens and camera overlay headers.
- **Top Safe-Area Alignment**: Unified `cameraTopBar` and `ScreenHeader` top padding to `insets.top + 12` with interactive haptic feedback (`Haptics.selectionAsync()`) on bell triggers.

## [0.9.1] — Automated Startup Database Migration Guard & Schema Synchronization
- **Startup Migration Execution**: Integrated programmatic `runMigrations()` in `server.js` to automatically verify database catalog alignment and execute non-destructive schema migrations upon every service boot.
- **Idempotent Column Alterations**: Added explicit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` clauses in `schema.sql` for all recently evolved entities: `medical_records.attachment_url`, `user_profiles.avatar_url`, `user_profiles.height`, `user_profiles.weight`, `user_profiles.organ_donor`, `shared_access.allowed_types`, and `shared_access.record_ids`.
- **Eliminated Undefined Column Errors**: Resolved runtime PostgreSQL 42703 exceptions (`column "attachment_url" of relation "medical_records" does not exist`) by executing live migrations across development and production PostgreSQL instances.

## [0.9.0] — App-Wide Responsive Architecture & Clinical Data Integrity Pass
- **Partial Profile Upsert Isolation**: Re-architected `profileModel.js` and `profileController.js` to dynamically update only explicitly provided fields, preventing demographic updates from overwriting emergency medical ID baselines (blood type, allergies, emergency contacts) and vice versa.
- **Physical Metrics Support**: Added `height VARCHAR(20)` and `weight VARCHAR(20)` to `user_profiles` schema, controllers, and profile edit forms with persistent storage and display.
- **Medical Record Attachments**: Added `attachment_url TEXT` to `medical_records` schema, accepted `attachmentUrl` in record creation endpoints, and rendered attached document / scanned photos in Record Details (`record/[id].tsx`).
- **Dynamic API Base URL Resolution**: Replaced hardcoded local hostname with `process.env.EXPO_PUBLIC_API_URL` and cross-platform fallback (`10.0.2.2:4000` for Android, `localhost:4000` for iOS/Web).
- **Auth Revocation Performance**: Removed per-request write locks (`DELETE`) from `tokenModel.isRevoked` to eliminate database contention on authenticated read requests.
- **Enhanced Rate Limiting**: Added rate limiting middleware to sensitive endpoints (`PUT /profile/password`, `POST /share`, `GET /share/:token`).
- **Development Postgres SSL**: Configured SSL in `db.js` to automatically disable in local/test environments unless explicitly set.
- **App-Wide Responsive UI**: Comprehensive adaptive layout across compact phones, standard phones, and tablets with stepped typography bounds, 2-column bento grids on tablets, floating pill tab bar, and centered modal sheets.

## [0.8.7] — Continuous Scrollable Profile Architecture
- **Continuous Scroll Surface**: Refactored the Profile screen (`mobile/app/(tabs)/profile.tsx`) so that the "Profile" title and subtitle scroll away naturally with the profile content inside a single continuous `<ScrollView>`, significantly increasing usable vertical viewport height.
- **Fixed Global Navigation Toolbar**: Preserved the fixed top header containing the Burger Menu drawer trigger and Notification Bell with dynamic unread indicator dot directly under the safe area.
- **Clean Safe-Area Clearance**: Retained 110px bottom navigation clearance and verified zero nested scrolling or layout jumps across sections.

## [0.8.6] — Records Screen Layout Overhaul & Quick Category Carousel
- **Full-Width Search Bar**: Replaced cramped header search input with a prominent full-width `<RecordSearchBar />` supporting instant real-time filtering and clear (X) reset.
- **Category Quick Chips Carousel**: Enhanced horizontal category filter row with dynamic, live record distribution count badges (e.g., `All (14)`, `Labs (5)`, `Prescriptions (3)`), allowing immediate 1-tap filtering without repetitive modals.
- **Clean Card Chevron Presentation**: Preserved signature classic record cards while removing the circular background highlight tint from the right chevron arrow for a calmer, cleaner aesthetic.
- **Enhanced Top Toolbar & Multi-Select**: Added an explicit "Select" toolbar toggle button alongside row long-press for multi-record QR sharing, with floating "Share Selected" CTA button.

## [0.8.5] — App-Wide UI/UX Consistency Pass & Design System Centralization
- **Centralized Design System**: Overhauled `mobile/constants/theme.ts` with comprehensive canonical tokens:
  - `Colors`: Canonical teal (`#159A83`), ink (`#12343B`), mint/light (`#DDF5EE`), canvas (`#F4FAF9`), surface (`#FFFFFF`), border (`#E5F0EE`), AI blue (`#1976D2`), alert red (`#D92D20`), and modal affordance colors.
  - `Typography`: Pre-configured `LexendDeca` typography styles (`display`, `title1`, `title2`, `sectionHeader`, `body`, `caption`, `button`).
  - `Spacing`: Standardized grid tokens with `screenPadding: 20` and `tabBarClearance: 110`.
  - `Radii`: Standardized component border radii (`card: 16`, `button: 12`, `pill: 10`, `sheet: 24`).
- **Unified Reusable UI Suite (`mobile/components/ui/`)**:
  - `ScreenHeader.tsx`: Universal top toolbar for all tab roots with Burger Menu (left drawer trigger), Notification Bell with dynamic unread indicator dot, 28px `LexendDeca-Bold` title, and subtitle.
  - `DragHandle.tsx`: Standardized 38×4px `#CBD5E1` pill affordance for sliding sheet modals.
  - `Button.tsx`: Unified multi-variant button component with haptic feedback, loading state, and consistent touch targets (48px height, 12px radius).
  - `Card.tsx`: Standardized 16px radius card container with `#E5F0EE` hairline border.
- **Resolved Color Divergences**: Replaced divergent non-canonical greens (`#1D9E75`, `#085041`, `#f0f7f4`) in `mobile/app/(tabs)/scan.tsx` with canonical MedRec tokens (`#159A83`, `#12343B`, `#F4FAF9`).
- **Standardized Screen Geometries**: Harmonized horizontal padding to universal `20px` (`Spacing.screenPadding`) across `index.tsx`, `share.tsx`, `scan.tsx`, `profile.tsx`, `record/[id].tsx`, and `record/add.tsx`, and enforced `110px` tab clearance across all scroll containers.
- **Universal Modal Drag Handles**: Standardized modal sheet handles with `<DragHandle />` across `ProfileEditModal`, `ChangePasswordModal`, `EmergencyIdModal`, `NotificationCenterModal`, `add.tsx`, and `index.tsx` sort sheet.
- **Redesigned**: Restructured the Share Records tab (`mobile/app/(tabs)/share.tsx`) using the Adaptive Hero and Cardless Flat Timeline architecture:
  - **Tier 1 (Adaptive Hero)**: Dynamically transitions between the primary blue generation hero card (`#1976D2`) with horizontal QR icon and the living white QR preview card (`#FFFFFF`, `QRCode` 142px) with clean countdown text and instant revocation action.
  - **Tier 2 (Active Shares)**: Displays secondary live doctor access sessions with active timers and one-tap QR inspection.
  - **Tier 3 (Past Sessions)**: Replaced repetitive individual multi-border cards and enterprise audit ledgers with a calm, unboxed typography list rendered directly on the `#F4FAF9` canvas, separated by 1px hairline dividers (`#E5F0EE`).
- **Streamlined**: Eliminated repetitive 39px QR icons, drop shadows, and heavy pill badges on historical entries in favor of clean, right-aligned status typography (`Revoked` in soft red `#D92D20`, `Expired` in muted slate `#64748B`).
- **Progressive Disclosure**: Implemented automatic collapsing for long history feeds, displaying up to 3 past sessions by default with an expandable `"Show full history (N sessions)"` toggle.

## [0.8.3] — Unified Blue AI Cards, Share Card Restructure & Record Type Carousel
- **Restructured**: Redesigned the "Share your records with your Doctor" card in `mobile/app/(tabs)/share.tsx` into a balanced horizontal top row layout (`generateTopRow`, `flexDirection: 'row', alignItems: 'center', gap: 12`) pairing the white QR icon (`qr-white.png`) beside the title with responsive `flex: 1` text wrapping, expiration notice underneath, and full-width white CTA at bottom.
- **Unified**: Standardized all AI feature cards (`mobile/app/record/[id].tsx` AI Medical Insights, `mobile/app/record/add.tsx` Scan Health Document, and `mobile/app/(tabs)/share.tsx` Share Card) to use the signature `#1976D2` blue background, white typography, white action CTA buttons, and direct icon rendering with all background highlight pills removed.
- **Streamlined**: Converted the multi-line record type selector grid in `mobile/app/record/add.tsx` into a single-line horizontal scrolling carousel (`ScrollView horizontal`, `showsHorizontalScrollIndicator={false}`) with edge-to-edge full-bleed padding, reducing vertical height above the fold and improving form accessibility.

## [0.8.2] — Universal Sliding Modal Drag Handles & Profile Input Placeholder Refinement
- **Standardized**: Implemented universal subtle grey drag handle affordance (`38×4px`, `borderRadius: 2`, `#D1D5DB`, `marginBottom: 12`) across all sliding sheets/modals in the application:
  - `ProfileEditModal.tsx` (Demographics & Medical ID editing)
  - `ChangePasswordModal.tsx` (Security & Password change)
  - `EmergencyIdModal.tsx` (First Responder Emergency ID)
  - `mobile/app/record/add.tsx` (Add Health Record form)
  - `mobile/app/(tabs)/index.tsx` (Filter & Sort Records sheet)
  - `mobile/app/(tabs)/scan.tsx` (Shared Record Inspection sheet)
- **Refined**: Adjusted placeholder font size across all Profile edit and password change input fields to a lighter, more compact `12.5px` (`fontSize: 12.5`), ensuring long medical prompts fit cleanly while entered text retains standard `14px` clarity.

## [0.8.1] — Add Record Scan Hero Blue AI Theming
- **Updated**: Styled the "Scan Health Document" hero card in `mobile/app/record/add.tsx` with signature AI blue (`#1976D2`), matching the AI Health Summary card on the Records tab and AI Medical Insights on Record Details.
- **Retained**: Preserved the standard healthcare green/teal palette (`#159A83` / `#DDF5EE`) across record type chips, form field icons, primary Save CTA button, and attached document cards.

## [0.8.0] — Profile Tab Modernization, Avatar Upload & Persistent Storage
- **Redesigned**: Rebuilt `mobile/app/(tabs)/profile.tsx` with an iOS-inspired Inset Grouped architecture, removing visual clutter, outer card containers, and heavy background highlights behind text (e.g. red blood pills, green action icon boxes, full-width red logout buttons).
- **Added**: Unboxed Profile Hero with centered 72×72px avatar, 20px patient name, 13px muted email, single-line bullet metadata summary, and understated "Edit Profile" link.
- **Added**: 4 clean Inset Grouped Cards (`borderRadius: 16`, `borderColor: '#E5F0EE'`) with hairline row dividers (`#F0F5F4`):
  - *Emergency & Medical ID*: Blood Type, Known Allergies, Chronic Conditions, Maintenance Meds, Primary Emergency Contact with 1-tap dial, and First Responder Digital QR ID.
  - *Personal Information*: Date of Birth (with calculated age), Biological Sex, Phone Number, and Address.
  - *Security & Preferences*: Active QR Shares, Change Password, Export Health Vault (JSON Archive), Biometric App Unlock toggle, Push Notifications toggle, and About MedRec & Disclaimer.
  - *Account Actions & Footer*: Clean Sign Out row and subtle, centered Delete Account & Health Vault link.
- **Added**: Interactive profile photo upload using `expo-image-picker` with camera badge affordance, 1:1 square crop, direct `PHPickerViewController` invocation, and immediate preview.
- **Added**: Dynamic bottom navigation Profile tab avatar displaying the user's uploaded circular image (`28×28px`, `cover`, `borderRadius: 14`, with 1.5px `#159A83` active border), falling back to default `profile-active.png`/`profile-inactive.png` icons when no photo exists.
- **Added**: Global `avatarUrl` session state in `AuthContext` with parallel backend hydration (`api.getMe()` + `api.getProfile()`) across navigation and app restarts.
- **Added**: Backend `avatar_url` database column in PostgreSQL `user_profiles` table, left-joined lookups in `userModel.js`, controller handling in `authController.js` and `profileController.js`, and test coverage in `profile.test.js`.
- **Linked**: Integrated `ExpoImagePicker (17.0.11)` and `EXImageLoader (6.0.0)` into CocoaPods (`mobile/ios/Podfile.lock`), added `NSPhotoLibraryUsageDescription` in `Info.plist`, and increased Express JSON limit to `10mb`.

## [0.7.0] — Privacy-Conscious In-App Notification Center & Modal Refinement
- **Added**: Interactive notification bell trigger and dynamic unread badge dot across Records Overview (`index.tsx`) and Share Center (`share.tsx`).
- **Added**: In-App Notification Center modal (`NotificationCenterModal.tsx`) with segmented filter tabs (All / Unread), pull-to-refresh, 1-tap batch read action, and reassuring empty state.
- **Added**: Subtle neutral grey drag handle affordance (`38×4px`, `borderRadius: 2`, `#D1D5DB`) integrated directly into the header card with compact vertical spacing for clear swipe-down dismiss guidance.
- **Added**: Categorized notification card components (`NotificationCard.tsx`) with high-contrast icon badges, relative timestamps, and one-tap deep linking to records (`/record/[id]`), active sharing (`/(tabs)/share`), emergency profile (`/(tabs)/profile`), or AI summaries.
- **Added**: Global notification state provider (`NotificationContext.tsx`) with optimistic local updates and server synchronization.
- **Added**: Backend notification engine with PostgreSQL `notifications` table, indexed queries, authenticated REST API routes (`/notifications`), and automated event triggers on record creation, share generation/revocation, security updates, and AI summarization.

## [0.6.0] — Functional Burger Navigation & Text-Only Menu Refinement
- **Added**: Reusable left-slide navigation drawer (`mobile/components/menu/SideMenuModal.tsx`) with hardware-accelerated translation, backdrop fade, and dismiss gestures.
- **Added**: Text-only navigation row component (`mobile/components/menu/SideMenuItem.tsx`) using pure typography (`Lexend Deca`), spacious padding, and subtle active highlights rather than icons or emojis.
- **Added**: Authentic MedRec app logo branding (`assets/logo/logo.png`) and user demographic summary in the drawer header.
- **Added**: Comprehensive destination routing to Home/Records (`/(tabs)`), Share (`/(tabs)/share` with active shares badge), Doctor QR Scanner (`/(tabs)/scan`), Add Record (`/record/add`), Profile (`/(tabs)/profile`), Emergency Medical ID (`/(tabs)/profile`), AI Health Summary, Vault JSON Export, About MedRec with clinical disclaimers, and secure Sign Out.
- **Connected**: Universal top toolbar burger icon triggers across Records (`index.tsx`), Share (`share.tsx`), and Scanner (`scan.tsx`).

## [0.5.0] — Camera & Document Scanning Experience Redesign
- **Added**: Modular camera subsystem in `mobile/components/camera/` (`DocumentCamera.tsx`, `DocumentPreview.tsx`, `ViewfinderOverlay.tsx`, `CameraControls.tsx`, `AttachedDocumentCard.tsx`).
- **Added**: 3:4 aspect ratio document viewfinder overlay with darkened vignette mask (`rgba(10, 18, 17, 0.62)`), high-contrast rounded teal corner guides (`#159A83`), and an animated scanning indicator.
- **Added**: Essential document camera controls including Flash/Torch toggle (`enableTorch`), dual-ring tactile shutter button with haptic feedback (`Haptics.impactAsync`), and visual shutter flash animation.
- **Added**: Photo Library / Gallery alternative button (`expo-image-picker`) in both the camera viewport and Add Record hero card for importing existing records.
- **Added**: Dedicated Document Preview screen with mandatory quality/legibility self-check prompt (*"Is this document legible?"*), Retake button, and Confirm ("Use Document") button.
- **Added**: In-form Attached Document Card with 64×64px thumbnail, zoom preview trigger, retake/replace action, and destructive delete with confirmation.
- **Improved**: Refactored `mobile/app/record/add.tsx` into a clean controller, ensuring form fields (`title`, `date`, `description`, `type`) persist reliably across camera transitions.
- **Added**: Auto-suggested title formatting (`Scanned Document — <Date>`) when confirming a captured document into an empty form.
- **Added**: Camera permission denial recovery flow with direct deep-linking to system settings (`Linking.openSettings()`).

## [0.4.0] — Profile Tab, Emergency Medical ID & Data Governance
- **Added**: Complete native Profile tab (`app/(tabs)/profile.tsx`) with user initials avatar, demographic details, and quick metrics badges.
- **Added**: Emergency Medical ID card & modal (`components/EmergencyIdModal.tsx`) featuring Blood Type, life-critical allergy highlights, chronic conditions, maintenance medications, and 1-tap direct dial for primary emergency contacts.
- **Added**: Offline-scannable First Responder QR code encoding vital clinical facts for zero-friction emergency triage.
- **Added**: In-place edit modal (`components/ProfileEditModal.tsx`) for demographics and medical attributes with input validation and pickers.
- **Added**: Authenticated Password Change modal (`components/ChangePasswordModal.tsx`) with complexity rules.
- **Added**: Health Vault full JSON export using native `Share.share` and account self-service deletion with cascade cleanup.
- **Added**: Backend `user_profiles` schema, `profileModel.js`, `profileController.js`, and `profileRoutes.js` mounted on `/profile`.
- **Added**: Dynamic user greeting in home screen header (`index.tsx`) resolving real authenticated user first name.
- **Added**: Automated Jest integration test suite (`tests/profile.test.js`) verifying all profile endpoints.

## [0.3.2] — Add Record Modal Drag Handle Affordance
- **Added**: iOS-style centered horizontal drag handle pill (`#CBD5E1`, 38×4px, `pointerEvents="none"`) at the top of the Add Record modal sheet (`record/add.tsx`) to provide visual dismiss/drag affordance without intercepting native swipe gestures.

## [0.3.1] — Record Details Metadata & Layout Redesign
- **Changed**: Reorganized Record Details (`record/[id].tsx`) overview card with a compact two-column horizontal metadata row for Date of Event and Logged in MedRec with an inline divider.
- **Improved**: Established modular card hierarchy with dedicated sections for Overview, Clinical Notes & Observations, and AI Medical Insights.
- **Refined**: Preserved MedRec design tokens, Lexend Deca typography, curated asset icons, and safe-area insets while significantly reducing vertical footprint.

## [0.3.0] — Backend Core & Testing Suite
- **Added**: Complete Node/Express 5 REST API with Auth, Records, Sharing, and AI route modules.
- **Added**: PostgreSQL schema migrations (`schema.sql`) with user, record, share, and audit tables.
- **Added**: Jest and Supertest test environment setup (`tests/setupEnv.js`).
- **Added**: Express security hardening with Helmet, CORS, and Rate Limiting middleware.

## [0.2.0] — Mobile Client Scaffold & Navigation
- **Added**: React Native Expo SDK 52 application setup with Expo Router v4.
- **Added**: Tab navigation (`(tabs)/index.tsx`, `share.tsx`, `scan.tsx`) and auth screens (`login.tsx`, `register.tsx`).
- **Added**: Responsive scaling utility (`hooks/useResponsive.ts`) and custom themed UI components.

## [0.1.0] — Obsidian Research & Product Design Vault
- **Added**: 18-module Obsidian knowledge vault in `MedRec/` documenting clinical problem spaces, patient needs, and regulatory requirements.
