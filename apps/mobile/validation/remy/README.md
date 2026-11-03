# Remy password reactions — 2026-11-03

[Watch the actual native sign-in interaction](password-interaction.mp4)

- [Sign-in, covered](screenshots/02-sign-in-covered.png)
- [Sign-in, peeking](screenshots/03-sign-in-peek.png)
- [Registration, covered](screenshots/07-registration-covered.png)
- [Registration, peeking](screenshots/08-registration-peek.png)
- [Registration layout](screenshots/06-create-account.png)
- [Full waving hand after clipping fix](screenshots/11-full-waving-hand.png)
- [Registration typing fixed: no yellow cover](screenshots/12-registration-password-fixed.png)

Captured in the real Expo app on iPhone 16 Pro / iOS 18.6, Expo Go 54.0.7. The video is trimmed and resized from the simulator recording; screenshots are unchanged. `demo-only` is fictional test input, never submitted.

Password focus raises Remy's hand and holds it over both eyes. Show password reveals a one-eye peek while retaining input focus; Hide password covers again. Moving to another field lowers the hand. Both sign-in and registration use this interaction. Small blinks/glances/wrist gestures replace repeated whole-body bouncing. Auth navigation uses a 200 ms fade without sideways/vertical form movement.

Both auth screens use an 88-point Remy slot. Measured alpha height and foot anchors normalize all pose/reaction frames and original fallbacks. The provider previews share centered logo/text groups, 16-point labels, 20-point icons, 24-point icon slots, 10-point gaps and 48-point controls. The eye icon is crossed out when hidden and open when revealed.

25 mobile unit tests and TypeScript pass; web, iOS and Android production exports pass. Native XCTest verifies field masking/revealing, typed text and navigation, while the graphics and recorded transition frames were reviewed visually. The earlier iOS strong-password cover is now prevented by disabling automatic generation from initial mount for secure new-password fields. Registration is tested with full masked entry (`demo-only-123`), revealed editing (`!` appended), and repeated hide/show preserving the complete value. Saved-login autofill and Android/web hints remain unchanged. Physical-device automatic generation, Android/device-wide visual parity and store approval require separate verification.

The repeatable UI check is `MedRecUITests/testRemyCoverPeekAndAuthFade` in the [onboarding QA target](../onboarding/QA.xcodeproj). Load the current Metro sign-in URL first and dismiss Expo Go's own tutorial. If Expo Go restores old running JavaScript, terminate it and reopen the current `exp://` URL before testing. Run the Remy method alone from sign-in; it does not submit credentials and returns to sign-in.

```sh
xcrun xcodebuild \
  -project apps/mobile/validation/onboarding/QA.xcodeproj \
  -scheme QA \
  -destination "id=$QA_SIMULATOR_UDID" \
  -parallel-testing-enabled NO \
  -only-testing:QA/MedRecUITests/testRemyCoverPeekAndAuthFade \
  -derivedDataPath /private/tmp/MedRecRemyChecks \
  test
```

Art/provenance: [eight generated atlases and exact prompts](../../assets/remy/acting/README.md).
