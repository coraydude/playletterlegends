#!/usr/bin/env python3
"""Bake playletterlegends.com's art straight from the Letter Legends Unity project.

Tiles are rendered the way the game renders them (TileGlyphLayout + TileSkinCatalog): the skin PNG,
the letter in Goji Display SemiBold centred on the skin's cream rect at 134.8/220 of the tile, and the
English point value centred on the wax seal at 43.3/220. Rect fractions are Unity sprite space (y up).
Everything is written as WebP into assets/. Re-run after art changes:

    python3 scripts/bake_art.py [path/to/LetterRumble]
"""
import json, os, re, shutil, sys
from PIL import Image, ImageDraw, ImageFont

GAME = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/LetterRumble')
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(SITE, 'assets')
UI = os.path.join(GAME, 'Assets/Art/UI')
FONT = os.path.join(GAME, 'Assets/Art/Fonts/GojiDisplay-SemiBold.otf')
CATALOG = open(os.path.join(GAME, 'Assets/_Project/Scripts/Cosmetics/TileSkinCatalog.cs')).read()
VALUES = json.load(open(os.path.join(GAME, 'langdata/languages.json')))['en']['values']

BROWN, CREAM = (0x4E, 0x21, 0x08), (0xFD, 0xE2, 0xAE)
WHITE_LETTER = set(re.findall(r'Skin\("([\w-]+)".*letterColor: white', CATALOG))
V = r'new Vector2\(([\d.]+)f, ([\d.]+)f\)'
CREAM_RECTS = {k: tuple(map(float, v)) for k, *v in re.findall(r'\["([\w-]+)"\] = \(' + V + ', ' + V + r'\)', CATALOG.split('_scoreCentersBySkinId')[0])}
SCORES = {k: (float(x), float(y)) for k, x, y in re.findall(r'\["([\w-]+)"\]\s*= ' + V, CATALOG.split('_scoreCentersBySkinId')[1].split('_panelRectsBySkinId')[0])}
DEFAULT_CREAM = (0.188, 0.203, 0.805, 0.772)

TILES = [
    # hero: the classic tile spells PLAY
    ('default', 'P'), ('default', 'L'), ('default', 'A'), ('default', 'Y'),
    # how it plays: S P E L L on the classic tile
    ('default', 'S'), ('default', 'E'),
    # collect: LEGENDS across seven themes
    ('cat', 'L'), ('sushi', 'E'), ('donut', 'G'), ('penguin', 'E'), ('panda', 'N'), ('popsicle', 'D'), ('strawberry', 'S'),
    # floating around the page
    ('monster', 'Q'), ('chick', 'Z'), ('koala', 'K'), ('watermelon', 'X'), ('bunny', 'J'), ('cheeseburger', 'R'),
    ('cookie', 'O'), ('dog', 'W'), ('fries', 'F'), ('pig', 'M'), ('cactus', 'B'),
]


def glyph(text, px, color, scale_x):
    """Ink-cropped glyph, squashed on x the way the canonical 220 root's non-uniform scale does."""
    f = ImageFont.truetype(FONT, max(1, round(px)))
    l, t, r, b = f.getbbox(text)
    im = Image.new('RGBA', (r - l + 4, b - t + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - l, 2 - t), text, font=f, fill=color + (255,))
    im = im.crop(im.getbbox())
    return im.resize((max(1, round(im.width * scale_x)), im.height), Image.LANCZOS)


def bake_tile(skin, letter, width=300):
    src = os.path.join(UI, 'Tiles/Resources', 'default-tile.png' if skin == 'default' else f'TileSkins/{skin}-tile.png')
    art = Image.open(src).convert('RGBA')
    W, H = art.size
    if skin == 'default':
        cream, score_c, score_col, letter_col = (0.10, 0.185, 0.90, 0.865), (0.806, 0.180), BROWN, BROWN
    else:
        cream, score_c, score_col = CREAM_RECTS.get(skin, DEFAULT_CREAM), SCORES[skin], CREAM
        letter_col = (255, 255, 255) if skin in WHITE_LETTER else BROWN
    sx = W / H
    g = glyph(letter, 134.8 / 220 * H, letter_col, sx)
    cx, cy = (cream[0] + cream[2]) / 2 * W, (1 - (cream[1] + cream[3]) / 2) * H
    art.alpha_composite(g, (round(cx - g.width / 2), round(cy - g.height / 2)))
    s = str(VALUES[letter])
    sp = 43.3 / 220 * H * (0.7 if len(s) > 1 else 1) + (2 / 220 * H if len(s) > 1 else 0)
    g = glyph(s, sp, score_col, sx)
    art.alpha_composite(g, (round(score_c[0] * W - g.width / 2), round((1 - score_c[1]) * H - g.height / 2)))
    art = art.resize((width, round(H * width / W)), Image.LANCZOS)
    art.save(os.path.join(OUT, 'tiles', f'{skin}-{letter.lower()}.webp'), quality=88, method=6)


def fit(src, dst, width, crop=False, q=86):
    im = Image.open(src if os.path.isabs(src) else os.path.join(UI, src))
    im = im.convert('RGBA')
    if crop:
        im = im.crop(im.getbbox())
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if dst.endswith('.png'):
        im.save(os.path.join(OUT, dst), optimize=True)
    else:
        im.save(os.path.join(OUT, dst), quality=q, method=6)


if __name__ == '__main__':
    for d in ('tiles', 'shots', 'art'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    for skin, letter in TILES:
        bake_tile(skin, letter)

    fit(os.path.join(SITE, 'art-src/letter-legends-logo.png'), 'logo.webp', 1200, crop=True)
    fit('Branding/app-icon-1024.png', 'app-icon.png', 512)
    fit('Branding/app-icon-1024.png', 'favicon.png', 96)
    art = {
        'mascot': ('HomeScreen/Redesign/mascot.png', 640),
        'crew': ('RateUs/Resources/RateUs/rate-heading.png', 1400),
        'hex-trio': ('HomeScreen/Resources/HomeScreen/home-hex-trio.png', 900),
        'clouds': ('HomeScreen/Resources/HomeScreen/home-clouds.png', 2200),
        'coin': ('HomeScreen/Redesign/coin.png', 200),
        'gem': ('HomeScreen/Redesign/gem.png', 200),
        'bolt': ('Leagues/Resources/LeaguesV2/bolt.png', 200),
        'chest': ('WordRally/Resources/WordRally/wr-chest-big-1.png', 320),
        'trophy': ('Leagues/Resources/LeaguesV2/league-trophy-1.png', 300),
        'legend-bo': ('Avatars/Resources/legend_bo.png', 360),
        'legend-fen': ('Avatars/Resources/legend_fen.png', 360),
        'legend-vera': ('Avatars/Resources/legend_vera.png', 360),
        'legend-lex': ('Avatars/Resources/legend_lex.png', 360),
        'logo-dig': ('TreasureDig/Resources/TreasureDig/td-logo.png', 520),
        'logo-rally': ('WordRally/Resources/WordRally/wr-logo.png', 520),
        'logo-bounce': ('PegDrop/Resources/PegDrop/pd-logo.png', 520),
        'logo-wotd': ('Wotd/Resources/Wotd/wotd-badge-7b67e5.png', 560),
        'logo-pass': ('SeasonPass/Resources/SeasonPassV2/sp2-logo.png', 560),
        'frame-hearts': ('Resources/Frames/frame-candy-hearts.png', 260),
        'frame-panda': ('Resources/Frames/frame-panda.png', 260),
        'frame-strawberry': ('Resources/Frames/frame-strawberry.png', 260),
        'frame-default': ('Resources/Frames/default-frame.png', 260),
    }
    for name, (src, w) in art.items():
        fit(src, f'art/{name}.webp', w, crop=name.startswith('logo-'))
    caps = ['words', 'friends', 'themes', 'events', 'minigames', 'yours', 'season']
    for i, name in enumerate(caps, 1):
        im = Image.open(os.path.join(GAME, f'scripts/play-listing/screens/en-US/phone/{i:02d}.jpg')).convert('RGB')
        im = im.resize((560, round(im.height * 560 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, 'shots', f'{name}.webp'), quality=82, method=6)
    # link-preview card: the game's sky, the logo, the crew resting on the bottom edge
    og = Image.new('RGBA', (1200, 630))
    top, bot = (0x17, 0x92, 0xFC), (0x9A, 0xB6, 0xF9)
    for y in range(630):
        t = y / 629
        ImageDraw.Draw(og).line([(0, y), (1200, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bot)) + (255,))
    logo = Image.open(os.path.join(SITE, 'art-src/letter-legends-logo.png')).convert('RGBA')
    logo = logo.crop(logo.getbbox()); logo.thumbnail((760, 330), Image.LANCZOS)
    og.alpha_composite(logo, ((1200 - logo.width) // 2, 40))
    crew = Image.open(os.path.join(UI, 'RateUs/Resources/RateUs/rate-heading.png')).convert('RGBA')
    crew = crew.resize((760, round(crew.height * 760 / crew.width)), Image.LANCZOS)
    og.alpha_composite(crew, ((1200 - crew.width) // 2, 630 - round(crew.height * 0.924)))
    og.convert('RGB').save(os.path.join(OUT, 'og.png'), optimize=True)
    print('baked', len(TILES), 'tiles +', len(art), 'art + 7 shots into', OUT)
