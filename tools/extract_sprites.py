"""Extract individual sprites from the reference sheet.

Usage:  python tools/extract_sprites.py [--preview out.png]

The sheet is a composite with a dark gradient background and soft glows, but
its alpha channel is a usable matte: sprite pixels are ~245, background and
glows 20-200. Each sprite is cut from a hand-measured cell (labels and
neighbours excluded), thresholded on alpha, and cleaned with a connected-
component pass: the main body is always kept, small specks and dark panel
smears are dropped. Colour is never used to decide transparency, so dark
details (vest, shorts, sunglasses, black equipment) are untouched.

The outline gets a 1px feather taken from the matte, so sprites stay clean when
the canvas scales them down at device resolution.

Outputs: public/assets/sprites/<category>/<name>.png (native resolution) and
public/assets/sprites/manifest.json.
The source sheet is only read, never modified.
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public/assets/sprite-sheet-reference.png.png'
OUT = ROOT / 'public/assets/sprites'

ALPHA_MIN = 225      # the sheet carries a soft alpha matte: sprites ~245, background 20-200
MIN_COMPONENT = 24   # drop specks smaller than this (px)
DARK_SMEAR_LUM = 45  # secondary components darker than this are panel smears, not art
EDGE_RAMP = (160, 235)  # 1px feather: matte alpha in this range maps to 0..255 on the outline ring

# (category, name, cell box x0,y0,x1,y1 — excludes labels and neighbours, intended use)
# In-game sizes live in src/config.js (SPRITE_SIZES); sprites ship at native resolution and the
# canvas downsamples them at device resolution.
SPRITES = [
    ('runner', 'idle', (8, 50, 118, 270), 'title screen idle pose'),
    ('runner', 'run1', (118, 50, 226, 270), 'run cycle frame 1'),
    ('runner', 'run2', (226, 50, 338, 270), 'run cycle frame 2'),
    ('runner', 'run3', (338, 50, 456, 270), 'run cycle frame 3'),
    ('runner', 'run4', (456, 50, 585, 270), 'run cycle frame 4'),
    ('runner', 'jump', (585, 50, 718, 248), 'airborne'),
    ('runner', 'slide', (675, 125, 822, 270), 'sliding'),
    ('runner', 'hit', (815, 80, 968, 270), 'collision feedback'),
    ('runner', 'lv1', (978, 55, 1090, 268), 'progression LV1 Beginner'),
    ('runner', 'lv2', (1090, 55, 1192, 268), 'progression LV2 Amateur'),
    ('runner', 'lv3', (1192, 55, 1296, 268), 'progression LV3 Dedicated'),
    ('runner', 'lv4', (1296, 55, 1402, 268), 'progression LV4 Hybrid'),
    ('runner', 'lv5', (1402, 55, 1530, 268), 'progression LV5 Legend'),

    ('shoes', 'daily', (22, 360, 130, 447), 'shoes pickup'),
    ('shoes', 'tempo', (130, 360, 240, 447), 'shoes pickup'),
    ('shoes', 'race', (240, 360, 346, 447), 'shoes pickup'),
    ('shoes', 'trail', (346, 360, 455, 447), 'shoes pickup'),
    ('shoes', 'super', (455, 360, 572, 447), 'shoes pickup'),

    ('nutrition', 'gel', (596, 352, 692, 456), 'gel pickup'),
    ('nutrition', 'bar', (692, 352, 790, 456), 'gel pickup variant'),
    ('nutrition', 'iso', (790, 352, 886, 456), 'hydration pickup variant'),
    ('nutrition', 'caffeine', (886, 352, 984, 456), 'gel pickup variant'),
    ('nutrition', 'salts', (984, 352, 1080, 456), 'hydration pickup variant'),

    ('hydration', 'softflask', (1108, 352, 1210, 456), 'water pickup'),
    ('hydration', 'bottle', (1210, 352, 1316, 456), 'water pickup'),
    ('hydration', 'thermos', (1316, 352, 1418, 456), 'water pickup'),
    ('hydration', 'cup', (1418, 352, 1520, 450), 'water pickup'),

    ('equipment', 'vest', (22, 545, 135, 644), 'catalogue only'),
    ('equipment', 'cap', (135, 545, 240, 644), 'catalogue only'),
    ('equipment', 'sunglasses', (240, 545, 338, 644), 'catalogue only'),
    ('equipment', 'headlamp', (338, 545, 430, 644), 'catalogue only'),
    ('equipment', 'gpswatch', (430, 545, 522, 644), 'catalogue only'),
    ('equipment', 'sleeves', (522, 545, 625, 644), 'catalogue only'),
    ('equipment', 'belt', (625, 545, 730, 644), 'catalogue only'),
    ('equipment', 'poles', (730, 532, 840, 634), 'catalogue only'),

    ('bibs', '5k', (898, 545, 1015, 644), 'race bib pickup'),
    ('bibs', '10k', (1015, 545, 1136, 644), 'race bib pickup'),
    ('bibs', '21k', (1136, 545, 1260, 644), 'race bib pickup'),
    ('bibs', '42k', (1260, 545, 1386, 644), 'race bib pickup'),
    ('bibs', 'ultra', (1386, 545, 1515, 644), 'race bib pickup'),

    ('collectibles', 'coin', (22, 718, 120, 808), 'kudos pickup'),
    ('collectibles', 'exp', (120, 718, 212, 808), 'EXP pickup'),
    ('collectibles', 'health', (212, 718, 300, 808), 'extra life pickup'),
    ('collectibles', 'boost', (300, 718, 392, 808), 'boost pickup'),
    ('collectibles', 'speed', (392, 718, 485, 808), 'boost pickup variant'),
    ('collectibles', 'strength', (485, 718, 580, 808), 'HYROX token'),
    ('collectibles', 'brainrot', (580, 718, 685, 808), 'brainrot pickup'),
    ('collectibles', 'streak', (685, 718, 790, 808), 'streak pickup'),

    ('medals', '5k', (828, 715, 926, 822), 'medal pickup'),
    ('medals', '10k', (926, 715, 1022, 822), 'medal pickup'),
    ('medals', '21k', (1022, 715, 1117, 822), 'medal pickup'),
    ('medals', '42k', (1117, 715, 1214, 822), 'medal pickup'),
    ('medals', 'ultra', (1214, 715, 1310, 822), 'medal pickup'),
    ('medals', 'hyrox', (1310, 715, 1406, 822), 'medal pickup'),
    ('medals', 'finisher', (1406, 715, 1508, 822), 'medal pickup / finish'),

    ('obstacles', 'dog', (18, 892, 120, 976), 'ground enemy, jump'),
    ('obstacles', 'pigeon', (120, 892, 215, 976), 'flying enemy, slide'),
    ('obstacles', 'bee', (215, 892, 315, 976), 'flying enemy, slide'),
    ('obstacles', 'poop', (315, 892, 410, 976), 'ground hazard, jump'),
    ('obstacles', 'cone', (410, 880, 500, 976), 'ground hazard, jump'),
    ('obstacles', 'barrier', (500, 892, 610, 976), 'ground hazard, jump'),
    ('obstacles', 'puddle', (610, 892, 735, 976), 'ground hazard, jump'),
    ('obstacles', 'stairs', (735, 892, 840, 976), 'ground hazard, jump'),
    ('obstacles', 'brainwall', (840, 885, 937, 964), 'ground hazard (late game), jump'),
    ('obstacles', 'notification', (937, 875, 1040, 966), 'floating enemy, slide'),

    ('ui', 'health', (1070, 895, 1150, 975), 'HUD lives'),
    ('ui', 'energy', (1150, 895, 1240, 975), 'HUD boost'),
    ('ui', 'speed', (1240, 895, 1320, 975), 'HUD pace'),
    ('ui', 'hydration', (1320, 895, 1425, 975), 'HUD stamina'),
    ('ui', 'brainrot', (1425, 895, 1530, 975), 'HUD brainrot'),
]


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def components(fg):
    h, w = len(fg), len(fg[0])
    seen = [[False] * w for _ in range(h)]
    comps = []
    for sy in range(h):
        for sx in range(w):
            if not fg[sy][sx] or seen[sy][sx]:
                continue
            comp, q = [], deque([(sx, sy)])
            seen[sy][sx] = True
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and fg[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            comps.append(comp)
    return comps


def foreground_mask(crop, largest_only=False):
    """True = sprite pixel: opaque in the sheet's alpha matte, minus specks and dark panel smears."""
    w, h = crop.size
    px = crop.load()
    fg = [[px[x, y][3] >= ALPHA_MIN for x in range(w)] for y in range(h)]
    comps = components(fg)
    if not comps:
        return fg
    largest = max(len(c) for c in comps)
    for comp in comps:
        mean_lum = sum(lum(px[x, y]) for x, y in comp) / len(comp)
        keep = len(comp) == largest or (
            not largest_only and len(comp) >= MIN_COMPONENT and mean_lum >= DARK_SMEAR_LUM)
        if not keep:
            for x, y in comp:
                fg[y][x] = False
    return fg


def extract(sheet, box, largest_only=False):
    crop = sheet.crop(box)
    fg = foreground_mask(crop, largest_only)
    w, h = crop.size
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if fg[y][x]:
                mp[x, y] = 255
    ring = mask.filter(ImageFilter.MaxFilter(3)).load()
    lo, hi = EDGE_RAMP
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    cp, op = crop.load(), out.load()
    for y in range(h):
        for x in range(w):
            if mp[x, y]:
                op[x, y] = cp[x, y][:3] + (255,)
            elif ring[x, y]:
                a = round(max(0, min(1, (cp[x, y][3] - lo) / (hi - lo))) * 255)
                if a:
                    op[x, y] = cp[x, y][:3] + (a,)
    bbox = out.getbbox()
    return out.crop(bbox), (box[0] + bbox[0], box[1] + bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1])


def anchor_x(img):
    """Horizontal centre of the head/torso (top 35% of rows) so run frames don't jitter."""
    w, h = img.size
    a = img.getchannel('A').load()
    xs = [x for y in range(int(h * 0.35)) for x in range(w) if a[x, y] > 128]
    return round(sum(xs) / len(xs) / w, 3) if xs else 0.5


def main():
    sheet = Image.open(SRC).convert('RGBA')
    manifest = {'source': SRC.name, 'sheetSize': sheet.size, 'sprites': {}}
    previews = []
    for cat, name, box, use in SPRITES:
        # Runner cells overlap their neighbours (poses interleave), so keep only the body.
        img, (sx, sy, sw, sh) = extract(sheet, box, largest_only=cat == 'runner')
        (OUT / cat).mkdir(parents=True, exist_ok=True)
        img.save(OUT / cat / f'{name}.png')
        key = f'{cat}/{name}'
        manifest['sprites'][key] = {
            'file': f'{cat}/{name}.png',
            'source': {'x': sx, 'y': sy, 'w': sw, 'h': sh},
            'size': {'w': img.width, 'h': img.height},
            'anchorX': anchor_x(img) if cat == 'runner' else 0.5,
            'use': use,
        }
        previews.append((key, img))
        print(f'{key:28s} src {sx},{sy} {sw}x{sh}  out {img.width}x{img.height}')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))

    if '--preview' in sys.argv:
        path = sys.argv[sys.argv.index('--preview') + 1]
        cols, cw, ch = 10, 150, 160
        rows = (len(previews) + cols - 1) // cols
        sheet_out = Image.new('RGBA', (cols * cw, rows * ch), (255, 0, 255, 255))
        for i, (key, img) in enumerate(previews):
            x, y = (i % cols) * cw, (i // cols) * ch
            t = img.copy()
            t.thumbnail((cw - 6, ch - 6), Image.LANCZOS)
            sheet_out.alpha_composite(t, (x + 3, y + 3))
        sheet_out.save(path)


if __name__ == '__main__':
    main()
