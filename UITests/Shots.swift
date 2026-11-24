import XCTest

// Drives the iPhone Duo simulator for App Store screenshots. Run by .github/workflows/simulator-shots.yml in two
// parts: testA before the workflow turns Overhang on in Safari's extension state, testB after. Screenshots of
// every screen come out of the result bundles as attachments.
@MainActor
final class Shots: XCTestCase {
    let overhang = XCUIApplication()
    let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")

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
            sleep(4)
        }
        shot(name)
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

    func testB() throws {
        overhang.launch()
        sleep(2)
        shot("10-app-on")
        openSettingsFromApp("11-settings-button-extension-on")

        page("https://en.wikipedia.org/wiki/Overhang_(architecture)", "20-wikipedia")
        page("https://www.theverge.com", "21-verge")
        page("https://www.google.com/search?q=hiking+trails", "22-google")
        page("https://www.seriouseats.com", "23-seriouseats")

        XCUIDevice.shared.orientation = .landscapeLeft
        sleep(5)
        shot("30-landscape")
        XCUIDevice.shared.orientation = .portrait
    }
}
