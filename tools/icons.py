#!/usr/bin/env python3
"""Draws the app icon and the extension's icons. Run from the repo root: python3 tools/icons.py"""
from pathlib import Path

from PIL import Image, ImageDraw

S = 1024
NAVY = (22, 50, 79)
ORANGE = (244, 162, 89)
WHITE = (255, 255, 255)


def draw(size=S, rounded=False):
    k = 4  # supersample
    n = size * k
    f = n / S
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box = (0, 0, n - 1, n - 1)
    if rounded:
        d.rounded_rectangle(box, radius=int(225 * f), fill=NAVY)
    else:
        d.rectangle(box, fill=NAVY)

    # The page's banner runs the full width, under the column.
    d.rectangle((0, 250 * f, n, 450 * f), fill=ORANGE)
    # Lines of text stop short of the column.
    for y, length in ((530, 560), (600, 500), (670, 540), (740, 380)):
        d.rounded_rectangle((120 * f, y * f, (120 + length) * f, (y + 34) * f), radius=17 * f, fill=WHITE)

    # Safari's button column, drawn as glass over the page.
    glass = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    g = ImageDraw.Draw(glass)
    g.rounded_rectangle((760 * f, 170 * f, 900 * f, 854 * f), radius=70 * f, fill=(255, 255, 255, 90),
                        outline=(255, 255, 255, 170), width=int(6 * f))
    for y in (300, 512, 724):
        g.ellipse((808 * f, (y - 22) * f, 852 * f, (y + 22) * f), fill=(255, 255, 255, 235))
    img = Image.alpha_composite(img, glass)
    return img.resize((size, size), Image.LANCZOS)


root = Path(__file__).resolve().parent.parent
appicon = root / "App/Assets.xcassets/AppIcon.appiconset"
appicon.mkdir(parents=True, exist_ok=True)
draw().convert("RGB").save(appicon / "icon-1024.png")

res = root / "Extension/Resources"
for px in (48, 96, 128, 256, 512):
    draw(px, rounded=True).save(res / f"icon-{px}.png")
for px in (16, 32, 48):
    draw(px, rounded=True).save(res / f"toolbar-{px}.png")
