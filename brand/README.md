# Brand

A ribbon drawn across a dotted seam: the page running past the edge Safari stops it at.

Colours:

- Nightfall `#171820`: background
- Lavender `#A99AF5`: ribbon, highlights
- Mint `#7EDFC5`: inner track, second accent
- Chalk `#F8F5EB`: text
- Muted `#999AA9`: secondary text

Files:

- `icon.svg`: app icon source. The App Store icon is this rendered square at 1024 px; Apple rounds the corners.
- `toolbar.svg`: one-colour icon for Safari's toolbar.
- `overhang-wordmark-*.svg`: wordmark on dark, light and transparent. The text is set in DejaVu Sans and isn't
  outlined, so convert it before using the wordmark anywhere fonts can differ.
- `banner.png` (1600x600): README banner.
- `social-preview.png` (1280x640): GitHub's social preview.

The screen mockups that came with the brand work were illustrations, not captures, so they aren't used for the App
Store. Screenshots there come from a real Duo (see `tools/frame.py`).
