# Native onboarding and sign-in verification — 2026-11-03

[All six screens](screenshots/overview.jpg)

For the later Remy expressions, password reactions and updated auth layouts, see the [current Remy captures and recording](../remy/README.md). The original overview below predates those refinements.

- [Welcome](screenshots/01-welcome.png)
- [Records](screenshots/02-records.png)
- [Remy](screenshots/03-remy.png)
- [Sharing receipt](screenshots/04-sharing.png)
- [Medical ID](screenshots/05-medical-id.png)
- [Sign in](screenshots/06-sign-in.png)
- [Create account](screenshots/07-create-account.png)

These are screenshots of the actual native Expo app, with labeled fictional onboarding data. The overview only arranges the original screenshots; no UI content was fabricated. Onboarding was captured on iPhone 16e / iOS 18.6 (390×844 points); sign-in on iPhone 16 Pro / iOS 18.6 (402×874 points), both using Expo Go 54.0.7.

## Verified

- Each scene's primary action, no Skip intro or progress indicator, Back navigation, reverse swipe navigation, and returning to the welcome scene.
- Explicit pause/resume controls, plus reduced-motion implementation review. First-use entrances wait for Launch to leave; inactive scenes are hidden from native/web accessibility.
- Standard input sizing (48-point field container; 43-point inner input) and disabled Google/Apple controls. No provider authentication was activated.
- All captions and sample record/receipt text clear the fixed onboarding action area at the captured default sizes. Auth actions follow their form in scrollable content. System enlarged-text and keyboard paths retain scrolling; this pass does not claim a complete device/accessibility matrix.
- Mobile: 15 tests, TypeScript and whitespace checks pass. API: 38 integration tests and TypeScript pass. Web, iOS and Android production bundles export.
- Dependency audit: 34 findings (6 high, 27 moderate, 1 low), the same totals as before this UI change; no critical findings. No broad dependency upgrade was attempted.

## Repeat native checks

Start Metro from `apps/mobile` and load its `exp://` URL in a simulator with Expo Go for SDK 54. Dismiss Expo Go's own first-run tutorial. For the complete suite, use a first-use app state and leave it on the welcome scene. The last test follows the returning-member action to sign-in and sets the normal local first-use marker; it does not submit credentials or create an account.

```sh
xcrun xcodebuild \
  -project apps/mobile/validation/onboarding/QA.xcodeproj \
  -scheme QA \
  -destination "id=$QA_SIMULATOR_UDID" \
  -parallel-testing-enabled NO \
  -derivedDataPath /private/tmp/MedRecOnboardingChecks \
  test
```

The stand-alone test target controls the existing Expo Go app; it does not build or publish MedRec. Real provider login, release signing, production deployment and real-device biometric testing remain separate work.
