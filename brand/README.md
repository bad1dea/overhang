# Overhang — Fold visual identity

**Concept:** The web unfolds beyond a boundary. A continuous hand-drawn ribbon crosses a dotted seam, with a mint inner track.

## Colours
- Nightfall `#171820` — primary background
- Lavender `#A99AF5` — ribbon / highlight
- Mint `#7EDFC5` — second ribbon / accent
- Chalk `#F8F5EB` — text
- Muted `#999AA9` — secondary text

## Use
- `01-App-Icon`: Square source SVG + 1024px PNG, plus monochrome Safari toolbar SVG. The PNG includes rounded corners for previews; remove the rounded-corner mask for App Store app icon submission if Apple applies its own mask.
- `02-Wordmark`: scalable wordmark variations; text uses fallback DejaVu Sans — convert to outlines in your design editor for permanent lockup.
- `03-GitHub`: README banner 1600×600 and social preview 1280×640. GitHub may crop social preview differently.
- `04-App-Store`: three 1170×2532 **illustrative concepts**, not real product screenshots. Replace the central device UI with genuine device captures before App Store submission. Screenshot dimensions may need changing for target device requirements.
- `05-Website`: standalone website hero visual, not a functioning page.
- `06-Motion`: seamless 24-frame GIF loop and 8-frame reference sheet. Use the SVG line paths for a native SVG/CSS animation in production.

## Motion guidance
Animate the ribbon gently (~2s periodic motion) with a tiny side-to-side translation or path morph. Avoid aggressive glow, particle effects, or neon gradients. Respect `prefers-reduced-motion`.

## App details
Overhang is a Safari extension for the iPhone Duo front screen. It allows page backgrounds and media to extend beneath Safari controls while text and interactive content remain usable. No claims of functionality beyond the README.

## Developer handoff
These SVG sources are editable, PNGs are rendered from them, and the GIF is illustrative. No external font files are bundled. All designs here are original explorations for this project.
