import XCTest

// Drives the iPhone Duo simulator for App Store screenshots. Run by .github/workflows/simulator-shots.yml in two
// parts: testA before the workflow turns Overhang on in Safari's extension state, testB after. Screenshots of
// every screen come out of the result bundles as attachments.
@MainActor
final class Shots: XCTestCase {
    let overhang = XCUIApplication()
    let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")

    func tree(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(string: app.debugDescription)
        attachment.name = "\(name)-tree"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func shot(_ name: String) {
        for (n, screen) in XCUIScreen.screens.enumerated() {
            let attachment = XCTAttachment(screenshot: screen.screenshot())
            attachment.name = "\(name)-\(n)"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
    }

    func openSettingsFromApp(_ name: String) {
        overhang.activate()
        for _ in 0..<4 where !overhang.buttons["Open Safari Settings"].isHittable {
            overhang.swipeUp()
        }
        if overhang.buttons["Open Safari Settings"].isHittable {
            overhang.buttons["Open Safari Settings"].tap()
            sleep(5)
        }
        shot(name)
        tree(settings, name)
    }

    func page(_ url: String, _ name: String) {
        safari.open(URL(string: url)!)
        // The runner's network is slow; wait for the page to put text on screen.
        _ = safari.webViews.staticTexts.element(boundBy: 5).waitForExistence(timeout: 45)
        sleep(6)
        shot(name)
    }

    // Safari only lists an extension in its state file once it has run with the extension installed.
    func testA() throws {
        overhang.launch()
        sleep(2)
        shot("01-app-off")
        openSettingsFromApp("02-settings-button-extension-off")
        page("https://en.wikipedia.org/wiki/Overhang_(architecture)", "03-safari-off")
    }

    // Overhang's button is drawn by the page under Safari's column, so it's tapped by position (points on the
    // 466-wide front screen): 24 from the edge when the page is widened, beside the column when it isn't.
    func tapOverhangButton(widened: Bool) {
        let x: CGFloat = widened ? 466 - 24 - 24 : 466 - 84 - 8 - 24
        safari.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: 505)).tap()
        sleep(3)
    }

    func testB() throws {
        overhang.launch()
        sleep(2)
        shot("10-app-on")
        openSettingsFromApp("11-settings-button-extension-on")

        page("https://en.wikipedia.org/wiki/Cantilever", "20-wikipedia")
        tree(safari, "20-wikipedia")
        tapOverhangButton(widened: true)
        shot("21-wikipedia-narrow")
        tapOverhangButton(widened: false)
        shot("22-wikipedia-wide-again")

        page("https://www.google.com/search?q=hiking+trails", "23-google")
        page("https://www.seriouseats.com", "24-seriouseats")
        page("https://www.nasa.gov", "25-nasa")
        page("https://en.wikipedia.org/wiki/Fallingwater", "26-fallingwater")

        // Safari's page menu, then Overhang's panel in it.
        for label in ["Page Menu", "Page Settings", "More", "Format Options"] where safari.buttons[label].exists {
            safari.buttons[label].tap()
            sleep(2)
            break
        }
        shot("30-menu")
        tree(safari, "30-menu")
        if safari.buttons["Overhang"].exists {
            safari.buttons["Overhang"].tap()
        } else if safari.staticTexts["Overhang"].exists {
            safari.staticTexts["Overhang"].tap()
        }
        sleep(3)
        shot("31-panel")
        tree(safari, "31-panel")

        for orientation in [UIDeviceOrientation.landscapeLeft, .landscapeRight] {
            XCUIDevice.shared.orientation = orientation
            sleep(5)
            shot("40-landscape-\(orientation.rawValue)")
        }
        XCUIDevice.shared.orientation = .portrait
    }

    func testC() throws {
        page("https://en.wikipedia.org/wiki/Cantilever", "50-dark")
    }
}
