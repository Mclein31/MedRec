import XCTest

final class MedRecUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "host.exp.Exponent")
    func capture(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name; a.lifetime = .keepAlways; add(a)
    }
    func dismissExpoTip() {
        if app.buttons["Continue"].exists && app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "developer menu")).count > 0 {
            app.buttons["Continue"].tap()
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap()
        }
    }
    func openPreview() {
        continueAfterFailure = false
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Open"].waitForExistence(timeout: 2) { springboard.buttons["Open"].tap() }
        app.activate()
        let preview = app.buttons["MedRec"].firstMatch
        if preview.exists { preview.tap() }
        _ = app.buttons["Continue"].waitForExistence(timeout: 4)
        dismissExpoTip()
    }
    func testOnboardingScenesAndNavigation() {
        openPreview()
        XCTAssertTrue(app.buttons["Meet Remy"].waitForExistence(timeout: 20))
        dismissExpoTip()
        XCTAssertFalse(app.buttons["Skip intro"].exists)
        let next = ["Meet Remy", "See how Remy helps", "Ready for your next visit?", "Keep the essentials close", "Start my MedRec"]
        let names = ["01-welcome", "02-records", "03-remy", "04-sharing", "05-medical-id"]
        app.buttons["Pause animations"].tap()
        for i in 0..<next.count {
            let action = app.buttons[next[i]]
            XCTAssertTrue(action.waitForExistence(timeout: 5))
            XCTAssertTrue(action.isHittable)
            XCTAssertFalse(app.progressIndicators.firstMatch.exists)
            capture(names[i])
            if i < next.count - 1 { action.tap() }
        }
        app.buttons["Previous scene"].tap()
        XCTAssertTrue(app.buttons[next[3]].waitForExistence(timeout: 3))
        if app.buttons["Play animations"].exists { app.buttons["Play animations"].tap() }
        app.swipeRight()
        XCTAssertTrue(app.buttons[next[2]].waitForExistence(timeout: 3))
        // Restore the welcome screen for a first-use preview.
        app.buttons["Previous scene"].tap()
        app.buttons["Previous scene"].tap()
        XCTAssertTrue(app.buttons[next[0]].waitForExistence(timeout: 3))
    }
    func testMotionControlsAndRestoreWelcome() {
        continueAfterFailure = false
        app.activate()
        dismissExpoTip()
        if app.buttons["Play animations"].exists { app.buttons["Play animations"].tap() }
        app.buttons["Pause animations"].tap()
        XCTAssertTrue(app.buttons["Play animations"].waitForExistence(timeout: 3))
        app.buttons["Play animations"].tap()
        XCTAssertTrue(app.buttons["Pause animations"].waitForExistence(timeout: 3))
        for _ in 0..<4 { if app.buttons["Previous scene"].exists { app.buttons["Previous scene"].tap() } }
        XCTAssertTrue(app.buttons["Meet Remy"].waitForExistence(timeout: 3))
    }
    func testSignInStandardSizingAndDisabledProviders() {
        openPreview()
        let heading = app.staticTexts["Good to have\nyou back."].firstMatch
        if !heading.exists {
            if app.buttons["Already a member? Sign in"].exists { app.buttons["Already a member? Sign in"].tap() }
            else if app.buttons["Sign in"].exists { app.buttons["Sign in"].firstMatch.tap() }
        }
        XCTAssertTrue(heading.waitForExistence(timeout: 15))
        dismissExpoTip()
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.exists)
        XCTAssertLessThanOrEqual(email.frame.height, 52)
        XCTAssertGreaterThanOrEqual(email.frame.height, 43)
        XCTAssertFalse(app.buttons["Continue with Google, unavailable for now"].isEnabled)
        XCTAssertFalse(app.buttons["Sign in with Apple, unavailable for now"].isEnabled)
        capture("06-sign-in")
    }
    func testRemyCoverPeekAndAuthFade() {
        continueAfterFailure = false
        app.activate()
        if !app.textFields["Email address"].exists && app.buttons["Already a member? Sign in"].exists {
            app.buttons["Already a member? Sign in"].tap()
        }
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 10))
        capture("01-sign-in-idle")
        app.secureTextFields["Password"].tap()
        Thread.sleep(forTimeInterval: 0.6)
        capture("02-sign-in-covered")
        app.buttons["Show password"].tap()
        XCTAssertTrue(app.textFields["Password"].waitForExistence(timeout: 3))
        app.textFields["Password"].typeText("demo-only")
        XCTAssertEqual(app.textFields["Password"].value as? String, "demo-only")
        Thread.sleep(forTimeInterval: 0.5)
        capture("03-sign-in-peek")
        app.buttons["Hide password"].tap()
        XCTAssertTrue(app.secureTextFields["Password"].waitForExistence(timeout: 3))
        Thread.sleep(forTimeInterval: 0.5)
        capture("04-sign-in-covered-again")
        app.textFields["Email address"].tap()
        Thread.sleep(forTimeInterval: 0.5)
        capture("05-sign-in-uncovered")
        app.swipeUp()
        app.buttons["Create an account"].tap()
        XCTAssertTrue(app.textFields["Full name"].waitForExistence(timeout: 5))
        capture("06-create-account")
        app.secureTextFields["Password"].tap()
        app.secureTextFields["Password"].typeText("demo-only-123")
        Thread.sleep(forTimeInterval: 0.5)
        capture("07-registration-covered")
        app.buttons["Show password"].tap()
        XCTAssertTrue(app.textFields["Password"].waitForExistence(timeout: 3))
        XCTAssertEqual(app.textFields["Password"].value as? String, "demo-only-123")
        app.textFields["Password"].typeText("!")
        XCTAssertEqual(app.textFields["Password"].value as? String, "demo-only-123!")
        Thread.sleep(forTimeInterval: 0.5)
        capture("08-registration-peek")
        app.buttons["Hide password"].tap()
        XCTAssertTrue(app.secureTextFields["Password"].waitForExistence(timeout: 3))
        Thread.sleep(forTimeInterval: 0.5)
        capture("09-registration-covered-again")
        app.buttons["Show password"].tap()
        XCTAssertTrue(app.textFields["Password"].waitForExistence(timeout: 3))
        XCTAssertEqual(app.textFields["Password"].value as? String, "demo-only-123!")
        app.textFields["Full name"].tap()
        app.swipeUp()
        app.buttons["Sign in"].tap()
        XCTAssertTrue(app.staticTexts["Good to have\nyou back."].firstMatch.waitForExistence(timeout: 5))
        capture("10-back-to-sign-in")
    }
}
