import SafariServices
import SwiftUI

@main
struct OverhangApp: App {
    var body: some Scene {
        WindowGroup { Home() }
    }
}

enum Overhang {
    static let extensionID = (Bundle.main.bundleIdentifier ?? "") + ".extension"
    static let source = URL(string: "https://github.com/bad1dea/overhang")!
    static let nightfall = Color(red: 0x17 / 255, green: 0x18 / 255, blue: 0x20 / 255)
    static let lavender = Color(red: 0xA9 / 255, green: 0x9A / 255, blue: 0xF5 / 255)
    static let mint = Color(red: 0x7E / 255, green: 0xDF / 255, blue: 0xC5 / 255)
    static let chalk = Color(red: 0xF8 / 255, green: 0xF5 / 255, blue: 0xEB / 255)

    // Apps on the Duo's front screen get a window narrower than the screen, so the model is checked instead. The
    // extension only knows this screen's widths (content.js), so on any other iPhone it does nothing.
    static var isDuo: Bool {
        var system = utsname()
        uname(&system)
        let machine = withUnsafeBytes(of: system.machine) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
        return (ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] ?? machine) == "iPhone19,4"
    }
}

enum Access: String, CaseIterable, Identifiable {
    case pick, every
    var id: Self { self }

    var title: LocalizedStringKey {
        switch self {
        case .pick: "Sites I pick"
        case .every: "Every site"
        }
    }
}

struct Home: View {
    @Environment(\.scenePhase) private var phase
    @State private var enabled: Bool?
    @State private var access = Access.pick

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 16) {
                        Preview()
                        Text("Safari pages across the whole front screen of iPhone Duo. Pictures and colors run under Safari's buttons; text and links stay beside them.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .listRowInsets(EdgeInsets(top: 16, leading: 16, bottom: 16, trailing: 16))
                }

                if !Overhang.isDuo {
                    Section {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Made for iPhone Duo").fontWeight(.semibold)
                                Text("Other iPhones already give pages the whole width, so Overhang leaves them alone.")
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "iphone").foregroundStyle(.secondary)
                        }
                    }
                }

                Section {
                    status
                    Picker("Where Overhang runs", selection: $access) {
                        ForEach(Access.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowSeparator(.hidden)
                    steps
                    SettingsButton()
                } header: {
                    Text("Set up")
                } footer: {
                    Text(access == .pick
                         ? "Safari only lets Overhang into the sites you allow. Everywhere else it can't see the page until you tap it in Safari's menu."
                         : "Overhang widens every page without asking. You can still switch it off for a site from Safari's menu.")
                }

                Section("In Safari") {
                    Tip(symbol: "puzzlepiece.extension", title: "Overhang in the ••• menu",
                        detail: "Widen this page once, switch Overhang off for a site, or let text run under the buttons.")
                    Tip(symbol: "lock.shield", title: "Allow a site for good",
                        detail: "Tap Overhang in the menu, then Always Allow on This Website. Its pages are widened as they open.")
                    Tip(symbol: "rectangle.portrait.rotate", title: "On its side",
                        detail: "With the camera on the left, Safari moves its buttons left and Overhang leaves the page as it is.")
                }

                Section {
                    Text("Overhang reads where things sit on a page so it can lay it out wider. It has no account, keeps no history and makes no network requests. Its settings stay in Safari on this iPhone.")
                        .font(.subheadline)
                    Link(destination: Overhang.source) {
                        Label("Source code", systemImage: "chevron.left.forwardslash.chevron.right")
                    }
                } header: {
                    Text("Privacy")
                }
            }
            .navigationTitle("Overhang")
        }
        .tint(Color.accentColor)
        .task(id: phase) {
            guard phase == .active else { return }
            enabled = try? await SFSafariExtensionManager.stateOfExtension(withIdentifier: Overhang.extensionID).isEnabled
        }
    }

    @ViewBuilder private var status: some View {
        switch enabled {
        case true?:
            Label("Turned on in Safari", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case false?:
            Label("Not turned on in Safari yet", systemImage: "circle.dashed")
                .foregroundStyle(.secondary)
        case nil:
            Label("Checking Safari", systemImage: "ellipsis.circle")
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder private var steps: some View {
        switch access {
        case .pick:
            Step(number: 1, text: "Turn on **Allow Extension**")
            Step(number: 2, text: "Set **All Websites** to **Ask**")
            Step(number: 3, text: "In Safari, open a site, tap **•••** then **Overhang**, and choose **Always Allow on This Website**")
        case .every:
            Step(number: 1, text: "Turn on **Allow Extension**")
            Step(number: 2, text: "Set **All Websites** to **Allow**")
            Step(number: 3, text: "Turn on **Private Browsing** too, if you use it")
        }
    }
}

private struct SettingsButton: View {
    @Environment(\.openURL) private var openURL
    @State private var failed: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                Task {
                    do {
                        try await SFSafariSettings.openExtensionsSettings(forIdentifiers: [Overhang.extensionID])
                    } catch {
                        failed = error.localizedDescription
                    }
                }
            } label: {
                Text("Open Safari Settings")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glassProminent)
            .controlSize(.large)

            Text("If Settings opens on the list of apps, go to **Safari › Extensions › Overhang**.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            // Test build only: which of these lands on Overhang's page in Settings decides what the button does.
            DisclosureGroup("Other ways to open Settings") {
                Button("Settings › Overhang") {
                    openURL(URL(string: UIApplication.openSettingsURLString)!)
                }
                Button("Settings › Safari › Extensions") {
                    openURL(URL(string: "App-prefs:SAFARI&path=WEB_EXTENSIONS")!)
                }
            }
            .font(.footnote)

            if let failed {
                Text(failed).font(.footnote).foregroundStyle(.red)
            }
        }
        .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
    }
}

private struct Step: View {
    let number: Int
    let text: LocalizedStringKey

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text("\(number)")
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 24, height: 24)
                .background(.fill.tertiary, in: .circle)
                .alignmentGuide(.firstTextBaseline) { $0[VerticalAlignment.center] + 5 }
            Text(text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct Tip: View {
    let symbol: String
    let title: LocalizedStringKey
    let detail: LocalizedStringKey

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).fontWeight(.semibold)
                Text(detail).font(.subheadline).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        } icon: {
            Image(systemName: symbol).foregroundStyle(Color.accentColor)
        }
    }
}

// The front screen in miniature, to scale: the banner runs under the button column, the lines of text stop beside it.
private struct Preview: View {
    var body: some View {
        GeometryReader { box in
            let column = box.size.width * 84 / 466
            let edge: CGFloat = 14
            ZStack(alignment: .topLeading) {
                Overhang.nightfall
                VStack(alignment: .leading, spacing: 9) {
                    Overhang.lavender
                        .frame(height: box.size.height * 0.32)
                        .padding(.horizontal, -edge)
                        .padding(.bottom, 6)
                    ForEach([1.0, 0.82, 0.92, 0.55], id: \.self) { length in
                        Capsule()
                            .fill(Overhang.chalk.opacity(0.9))
                            .frame(width: (box.size.width - edge - column - 6) * length, height: 7)
                    }
                }
                .padding(.top, edge * 1.6)
                .padding(.leading, edge)
                VStack(spacing: 0) {
                    ForEach(["square.and.arrow.up", "book", "square.on.square"], id: \.self) { symbol in
                        Image(systemName: symbol)
                            .font(.system(size: 13, weight: .medium))
                            .frame(maxHeight: .infinity)
                    }
                }
                .foregroundStyle(.white)
                .frame(width: column - 16)
                .padding(.vertical, 6)
                .glassEffect(.regular, in: .capsule)
                .padding(.vertical, edge)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
                .padding(.trailing, 8)
            }
        }
        .aspectRatio(466 / 260, contentMode: .fit)
        .clipShape(.rect(cornerRadius: 20, style: .continuous))
        .accessibilityHidden(true)
    }
}
