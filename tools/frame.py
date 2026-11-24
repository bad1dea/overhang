#!/usr/bin/env python3
"""Puts Duo screenshots on App Store sized canvases with a caption above.

App Store Connect has no screenshot size for the Duo's front screen, so the shots go on the 6.9" iPhone size
(1320x2868, or 2868x1320 for landscape shots) and fastlane uploads them as that.

    tools/frame.py shots/ captions.txt

captions.txt has one line per screenshot, in the order they should appear: the file name, a tab, the caption.
Output goes to fastlane/screenshots/en-CA, replacing what's there.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

NIGHTFALL = "#171820"
CHALK = "#F8F5EB"
PORTRAIT = (1320, 2868)
LANDSCAPE = (2868, 1320)
MARGIN = 90
RADIUS = 56
OUT = Path(__file__).resolve().parent.parent / "fastlane/screenshots/en-CA"

FONTS = [
    "/System/Library/Fonts/SFNS.ttf",
    "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def font(size):
    for path in FONTS:
        if Path(path).exists():
            face = ImageFont.truetype(path, size)
            try:
                face.set_variation_by_axes([700])
            except Exception:
                pass
            return face
    return ImageFont.load_default(size)


def wrap(draw, text, face, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if line and draw.textlength(trial, font=face) > width:
            lines.append(line)
            line = word
        else:
            line = trial
    return lines + [line]


def frame(shot, caption):
    shot = ImageOps.exif_transpose(Image.open(shot)).convert("RGB")
    size = LANDSCAPE if shot.width > shot.height else PORTRAIT
    canvas = Image.new("RGB", size, NIGHTFALL)
    draw = ImageDraw.Draw(canvas)
    face = font(84 if size == PORTRAIT else 72)

    # The Duo's front screen is wider than an iPhone's, so caption and shot are centred together on the canvas.
    lines = wrap(draw, caption, face, size[0] - MARGIN * 2)
    text = len(lines) * int(face.size * 1.2) + MARGIN
    room = (size[0] - MARGIN * 2, size[1] - text - MARGIN * 4)
    scale = min(room[0] / shot.width, room[1] / shot.height)
    shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS)

    y = (size[1] - text - shot.height) // 2
    for line in lines:
        draw.text((size[0] / 2, y), line, font=face, fill=CHALK, anchor="mt")
        y += int(face.size * 1.2)
    y += MARGIN
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *shot.size), RADIUS, fill=255)
    canvas.paste(shot, ((size[0] - shot.width) // 2, y), mask)
    return canvas


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    shots, captions = Path(sys.argv[1]), Path(sys.argv[2])
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    for n, row in enumerate(l for l in captions.read_text().splitlines() if l.strip()):
        name, caption = row.split("\t", 1)
        out = OUT / f"{n + 1:02d}_{Path(name).stem}.png"
        frame(shots / name, caption.strip()).save(out)
        print(out.relative_to(OUT.parent.parent.parent))


if __name__ == "__main__":
    main()
