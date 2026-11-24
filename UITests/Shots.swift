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
        // Sites asking for location get a prompt over the page.
        for label in ["Don’t Allow", "Don't Allow"] where safari.buttons[label].exists {
            safari.buttons[label].tap()
            sleep(2)
        }
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

    // Overhang's button sits under Safari's column, where taps are matched by position, so it's tapped at
    // the middle of its frame rather than through the element.
    func tapOverhangButton() {
        let button = safari.buttons.matching(NSPredicate(format: "label ENDSWITH 'this site'")).firstMatch
        guard button.waitForExistence(timeout: 5) else { return }
        let frame = button.frame
        safari.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: frame.midX, dy: frame.midY)).tap()
        sleep(3)
    }

    func testB() throws {
        overhang.launch()
        sleep(2)
        shot("10-app-on")
        openSettingsFromApp("11-settings-button-extension-on")

        page("https://en.wikipedia.org/wiki/Fallingwater", "20-wide")
        safari.swipeUp(velocity: .slow)
        sleep(3)
        shot("21-wide-picture")
        tapOverhangButton()
        shot("22-narrow-picture")
        tapOverhangButton()
        shot("23-wide-again")

        page("https://www.google.com/search?q=hiking+trails", "24-google")
        page("https://en.wikipedia.org/wiki/Cantilever", "25-wikipedia")

        safari.buttons["MoreMenuButton"].tap()
        sleep(2)
        shot("30-menu")
        if safari.buttons["Overhang"].waitForExistence(timeout: 5) {
            safari.buttons["Overhang"].tap()
            sleep(4)
        }
        shot("31-panel")
    }

    func testC() throws {
        overhang.launch()
        sleep(3)
        shot("50-app-dark")
        page("https://en.wikipedia.org/wiki/Fallingwater", "51-safari-dark")
    }
}
