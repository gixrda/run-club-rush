"""Web copy of the official logo: trims the empty dark margin and downsizes for fast loading.

The original public/assets/logo_runclubrush.png is never modified; the title screen falls back
to it if the web copy is missing.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public/assets/logo_runclubrush.png'
OUT = ROOT / 'public/assets/logo_runclubrush-web.jpg'
MAX_W = 1100
PAD = 12

img = Image.open(SRC).convert('RGB')
# Content = anything clearly brighter than the flat near-black background.
mask = img.convert('L').point(lambda v: 255 if v > 40 else 0)
x0, y0, x1, y1 = mask.getbbox()
img = img.crop((max(0, x0 - PAD), max(0, y0 - PAD), min(img.width, x1 + PAD), min(img.height, y1 + PAD)))
if img.width > MAX_W:
    img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
img.save(OUT, quality=90, optimize=True)  # flat dark background, no alpha needed
print(f'{OUT.name}: {img.size}, bg {img.getpixel((2, 2))}')
