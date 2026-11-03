# MedRec startup animations — 2026-11-03

[Watch the installed native app start](native-startup.mp4)

- [First-use gathering sequence](screenshots/05-native-first-use.png)
- [Native handoff to onboarding](screenshots/06-native-onboarding.png)
- [Signed-in folio arrival](screenshots/03-signed-in-arrival.png)
- [First-use animation close-up](first-use.mp4)
- [Short login animation](sign-in.mp4)

The first-use story gathers abstract medical pages around the existing Remy character, then fades into onboarding. It runs for 1640 ms plus a 240 ms exit. The returning/login sequence opens a folio containing the actual `RecordSkeleton` component and Remy, then reveals the app after 720 ms plus a 180 ms exit. There is no visual progress bar or invented health data.

The animation starts after the native splash is hidden, layout is ready and the app is active. Backgrounding pauses the remaining motion. Reduced Motion skips moving sequences and the minimum duration. Real session/first-use readiness still gates exit; the post-login arrival requires a confirmed signed-in user and resets after logout. The keyboard dismisses before authenticated arrival.

The installed simulator app is **MedRec 2.0.0**, bundle `com.mclein.medrec`, on iPhone 16 Pro / iOS 18.6 (`85495F80-A293-47AC-8F2C-CE9294F2A266`). Open that app directly to review startup. Its Release build includes the JS/assets and does not need Metro. Expo Go substitutes its own icon loading screen, so it cannot faithfully review this native splash; see [Expo's explanation](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).

`native-startup.mp4` and screenshots 05–06 are direct captures of the installed Release app. The earlier first-use close-up was captured in Expo Go on iPhone 16e. The login capture used the real UI and auth-state transition with an isolated local fixture serving an empty fictional account (`preview@medrec.invalid`), then signed out. No email was sent and no real account or records were accessed. The fixture server was stopped after testing. Videos are only trimmed/resized; UI was not composited.

## Rebuild the simulator preview

From `apps/mobile`:

```sh
npx expo prebuild --platform ios --no-install
cd ios
pod install
cd ..
xcrun xcodebuild \
  -workspace ios/MedRec.xcworkspace -scheme MedRec -configuration Release \
  -destination "id=$QA_SIMULATOR_UDID" \
  -derivedDataPath /private/tmp/MedRecNativeRelease \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- IPHONEOS_DEPLOYMENT_TARGET=15.1 build
xcrun simctl install "$QA_SIMULATOR_UDID" /private/tmp/MedRecNativeRelease/Build/Products/Release-iphonesimulator/MedRec.app
xcrun simctl launch "$QA_SIMULATOR_UDID" com.mclein.medrec
```

Xcode 27 rejects old resource-pod deployment targets (9.0/12.4), so the simulator build uses the app's 15.1 target for all pods. Keep local simulator signing enabled: the initial unsigned build could not finish reading Keychain startup state; the signed build did. The generated `ios/` directory remains ignored under Expo CNG. `plugins/withLaunchBackground.cjs` must precede `expo-splash-screen` in config; it preserves the plum background and removes dangling image constraints when the native splash has no image.

## Checks

29 mobile tests, TypeScript, web/iOS/Android exports, native Release compilation, startup capture, and an isolated fixture login→Records→Profile→sign-out flow were checked. The installed native app also passed the cold-start/navigation test on the returning-installation branch (sign-in→registration→sign-in); first-use handoff is recorded above. The local UI fixture does not establish production authentication or store readiness. Native Android startup, physical devices and release distribution remain unverified.

To run the native handoff/navigation test, leave this app signed out:

```sh
xcrun xcodebuild \
  -project apps/mobile/validation/preload/QA.xcodeproj -scheme QA \
  -destination "id=$QA_SIMULATOR_UDID" -parallel-testing-enabled NO \
  -derivedDataPath /private/tmp/MedRecNativePreloadQA test
```

This test launches the installed native app, waits for the preload to leave, then checks onboarding Next/Back for a new installation or sign-in→registration→sign-in for a returning installation. It preserves the first-use marker.
