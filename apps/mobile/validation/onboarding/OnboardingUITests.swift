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
    /** Any element by its accessibility label: chips and choices surface as different XCUI types per iOS version. */
    func el(_ label: String) -> XCUIElement { app.descendants(matching: .any)[label].firstMatch }
    func text(containing s: String) -> XCUIElement { app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", s)).firstMatch }

    /** First-use setup (DD-52): every answer, Remy's replies, progress, Back, the finish summary and the register prefill. */
    func testSetupAnswersCarryIntoTheApp() {
        openPreview()
        XCTAssertTrue(app.buttons["Set up my MedRec"].waitForExistence(timeout: 30))
        dismissExpoTip()
        XCTAssertFalse(app.progressIndicators.firstMatch.exists)
        capture("01-welcome")
        app.buttons["Set up my MedRec"].tap()

        let name = app.textFields["Your name"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Skip for now"].exists)
        name.tap()
        name.typeText("Alex Morgan")
        XCTAssertTrue(text(containing: "Nice to meet you, Alex.").waitForExistence(timeout: 3))
        XCTAssertTrue(el("Step 1 of 4").exists)
        capture("02-name")
        app.buttons["Continue"].tap()

        let visits = el("Be ready for doctor visits, Show a doctor your records with a temporary QR code")
        XCTAssertTrue(visits.waitForExistence(timeout: 5))
        visits.tap()
        XCTAssertTrue(text(containing: "keep sharing close").waitForExistence(timeout: 3))
        capture("03-goal")
        app.buttons["Continue"].tap()

        XCTAssertTrue(el("Imaging").waitForExistence(timeout: 5))
        el("Imaging").tap()
        el("Vaccinations").tap()
        XCTAssertTrue(text(containing: "Imaging and Vaccinations get their own tabs.").waitForExistence(timeout: 3))
        capture("04-records")
        app.buttons["Continue"].tap()

        XCTAssertTrue(app.buttons["Looks good"].waitForExistence(timeout: 5))
        capture("05-comfort")
        app.buttons["Looks good"].tap()

        XCTAssertTrue(app.buttons["Create my account"].waitForExistence(timeout: 5))
        XCTAssertTrue(text(containing: "All set, Alex").exists)
        XCTAssertTrue(text(containing: "Share shortcut on your home").exists)
        XCTAssertTrue(text(containing: "Imaging and Vaccinations on your Records tabs").waitForExistence(timeout: 3))
        Thread.sleep(forTimeInterval: 1.2)
        capture("06-ready")

        // Back keeps the answers.
        app.buttons["Previous question"].tap()
        app.buttons["Previous question"].tap()
        XCTAssertTrue(text(containing: "Imaging and Vaccinations get their own tabs.").waitForExistence(timeout: 3))
        app.buttons["Continue"].tap()
        app.buttons["Looks good"].tap()

        app.buttons["Create my account"].tap()
        let fullName = app.textFields["Full name"]
        XCTAssertTrue(fullName.waitForExistence(timeout: 10))
        XCTAssertEqual(fullName.value as? String, "Alex Morgan")
        capture("07-create-account")
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
