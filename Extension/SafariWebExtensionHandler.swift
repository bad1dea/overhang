import Foundation

// The extension keeps everything in browser.storage; there's nothing for the native side to answer.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        context.completeRequest(returningItems: nil)
    }
}
