import XCTest

final class NativePreloadUITests: XCTestCase {
    func testColdStartHandoffAndNavigation() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "com.mclein.medrec")
        app.terminate()
        app.launch()
        let preload = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Welcome to MedRec. Getting ready.")).firstMatch
        let finished = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: preload)
        XCTAssertEqual(XCTWaiter.wait(for: [finished], timeout: 10), .completed)
        let next = app.buttons["Meet Remy"]
        let create = app.buttons["Create an account"]
        let destination = XCTNSPredicateExpectation(
            predicate: NSPredicate { _, _ in next.exists || create.exists }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [destination], timeout: 10), .completed)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "native-startup-handoff"
        shot.lifetime = .keepAlways
        add(shot)
        if next.exists {
            XCTAssertTrue(next.isHittable)
            next.tap()
            XCTAssertTrue(app.buttons["See how Remy helps"].waitForExistence(timeout: 5))
            app.buttons["Previous scene"].tap()
            XCTAssertTrue(app.buttons["Meet Remy"].waitForExistence(timeout: 5))
        } else {
            let scroll = app.scrollViews.firstMatch
            for _ in 0..<3 {
                if create.isHittable { break }
                scroll.swipeUp()
            }
            XCTAssertTrue(create.isHittable)
            create.tap()
            XCTAssertTrue(app.buttons["Create account"].waitForExistence(timeout: 5))
            let signIn = app.buttons["Sign in"]
            for _ in 0..<3 {
                if signIn.isHittable { break }
                scroll.swipeUp()
            }
            signIn.tap()
            XCTAssertTrue(create.waitForExistence(timeout: 5))
        }
    }
}
