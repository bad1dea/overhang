# Overhang

![Overhang](brand/banner.png)

A Safari extension that lays web pages out across the whole front screen of the iPhone Duo.

On the front screen Safari keeps its buttons in an 84-point column on the right and lays pages out beside it: 377
points of the screen's 461 on our Duo (382 of 466 on others). Overhang lays them out the full width. Pictures, headers,
banners and colored bars run under the buttons; lines of text stop beside them, unless you let them run under too.

## Using it

1. Install Overhang and open it. **Open Safari Settings** goes straight to the extension.
2. Turn on **Allow Extension** and set **All Websites** to **Allow**. Every page is widened as it opens.

A round button beside Safari's column, under the level of its bookmarks button, switches widening for the site
you're on. The panel behind
**•••** › **Overhang** has **Widen every site** (on unless you turn it off), a switch for the site
you're on (an exception to the first: skip this site, or widen it when the rest aren't), **Widen this page** for a
page Overhang can't see yet, a switch to let text run under the buttons, and one to hide the round button.

If you'd rather Safari kept Overhang out of most sites, set **All Websites** to **Ask** and allow sites one at a time
from the same menu.

It works in portrait and in both landscapes (with the camera on the left Safari moves its column to the left, and
Overhang mirrors everything), with or without Shift Display for a case. It leaves other iPhones, the unfolded Duo,
and pages not laid out for phones (no `width=device-width`) alone.

## Layout

- `App/`: the SwiftUI app with the setup steps.
- `Extension/Resources/content.js`: the page script. Measures the page once per change and writes inline styles it
  can take back.
- `Extension/Resources/popup.*`: the panel in Safari's menu.
- `project.yml`: the XcodeGen spec. The `.xcodeproj` isn't committed.
- `brand/`: icon, wordmark and banner sources, and the brand notes. The App Store icon is `brand/icon.svg` rendered
  square (Apple rounds the corners itself).

## Building

Needs Xcode 27.1 or later (an app built against an older SDK runs letterboxed on the Duo) and XcodeGen.

```sh
xcodegen generate
open Overhang.xcodeproj
```

Set your team on both targets and run on a Duo. Safari in the simulator doesn't lay the front screen out the same way
as the phone.

CI (`.github/workflows`):

- `ci.yml` builds unsigned on every push, on GitHub's `xcode-27` image.
- `apple-setup.yml` registers the bundle ids and makes the App Store profiles (run once, then store them as
  `DIST_PROFILE_BASE64` and `DIST_PROFILE_EXTENSION_BASE64`).
- `testflight.yml` builds, signs, uploads and hands the build to the internal testers. The build number is the run
  number, and the manifest version follows it because Safari only reloads an extension's scripts when that changes.

## Credits

The layout code is adapted from [Brim](https://github.com/AVGVSTVS96/brim) (MIT), which in turn credits
[Splay](https://github.com/aztechead/splay) and [DuoWide](https://github.com/hyungchulc/duowide) for working out how
Safari behaves on this screen.

## Wishlist

- Keep header buttons out from under Safari's camera and clock, sliding only the covered ones in. Tried in build 13
  (camera areas from Splay's measurements); it didn't work on the Duo, so it was taken out again.

## Privacy

Overhang collects nothing and makes no network requests: [docs/privacy.md](docs/privacy.md).

## License

MIT, see [LICENSE](LICENSE).
