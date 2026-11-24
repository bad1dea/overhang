import XCTest

// Drives the iPhone Duo simulator for App Store screenshots: Overhang, Settings and Safari, with a screenshot of
// every screen at each step. Run by .github/workflows/simulator-shots.yml; the screenshots come out of the result
// bundle as attachments.
@MainActor
final class Shots: XCTestCase {
    let overhang = XCUIApplication()
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")

    func shot(_ name: String) {
        for (n, screen) in XCUIScreen.screens.enumerated() {
            let attachment = XCTAttachment(screenshot: screen.screenshot())
            attachment.name = "\(name)-\(n)"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
    }

    // Settings rows can sit below the fold, so look, scroll, look again.
    @discardableResult
    func tap(_ app: XCUIApplication, _ labels: [String], scrolls: Int = 6) -> Bool {
        for _ in 0...scrolls {
            for label in labels {
                for element in [app.cells[label], app.buttons[label], app.staticTexts[label], app.switches[label]]
                where element.exists && element.isHittable {
                    element.tap()
                    return true
                }
            }
            app.swipeUp()
        }
        return false
    }

    func openSettingsFromApp(_ name: String) {
        overhang.activate()
        if tap(overhang, ["Open Safari Settings"]) {
            sleep(4)
        }
        shot(name)
    }

    func testShots() throws {
        overhang.launch()
        sleep(2)
        shot("01-app")

        openSettingsFromApp("02-settings-button-extension-off")

        settings.terminate()
        settings.launch()
        sleep(2)
        tap(settings, ["Apps"])
        sleep(1)
        tap(settings, ["Safari"])
        sleep(1)
        shot("03-settings-safari")
        tap(settings, ["Extensions"])
        sleep(1)
        shot("04-settings-extensions")
        tap(settings, ["Overhang"])
        sleep(1)
        shot("05-settings-overhang")

        let allow = settings.switches.firstMatch
        if allow.waitForExistence(timeout: 3), (allow.value as? String) != "1" {
            allow.tap()
            sleep(1)
        }
        if tap(settings, ["All Websites"], scrolls: 2) {
            sleep(1)
            tap(settings, ["Allow"], scrolls: 1)
            sleep(1)
        }
        shot("06-settings-overhang-on")

        settings.terminate()
        openSettingsFromApp("07-settings-button-extension-on")

        overhang.activate()
        overhang.swipeDown()
        overhang.swipeDown()
        sleep(1)
        shot("08-app-on")

        for (n, page) in ["https://en.wikipedia.org/wiki/Overhang_(architecture)",
                          "https://www.theverge.com",
                          "https://www.google.com/search?q=hiking+trails"].enumerated() {
            safari.open(URL(string: page)!)
            sleep(10)
            shot("1\(n)-safari")
        }

        XCUIDevice.shared.orientation = .landscapeLeft
        sleep(4)
        shot("20-safari-landscape")
        XCUIDevice.shared.orientation = .portrait
    }
}
