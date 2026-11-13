#!/usr/bin/env python3
"""Bake playletterlegends.com's art straight from the Letter Legends Unity project.

Tiles come from the LIVE tile catalog (baked skins + the CDN skins in config_cosmetics, minus the retired
ids) and are rendered the way the game renders them (TileGlyphLayout): the skin art, the letter in Goji
Display SemiBold centred on the skin's cream rect, the English point value centred on its score spot, at
the skin's calibrated sizes (220 canonical). Rect fractions are Unity sprite space (y up). A retired skin
stops the bake.
Everything is written as WebP into assets/. Re-run after art changes:

    python3 scripts/bake_art.py [path/to/LetterRumble]
"""
import json, os, re, sys, tempfile, urllib.request
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
BAKED = set(re.findall(r'Skin\("([\w-]+)"', CATALOG)) | {'default'}

# The LIVE catalog = baked skins + config_cosmetics.tileSkins (CDN art; replaces a baked skin of the
# same id) - config_cosmetics.removedTileSkinIds. scripts/cosmetics-config.json is the repo mirror of
# that Title Data key (refresh it with `python3 scripts/title-data-seeds.py --pull` in the game repo).
_cfg = json.load(open(os.path.join(GAME, 'scripts/cosmetics-config.json')))
_cfg = json.loads(_cfg) if isinstance(_cfg, str) else _cfg
REMOTE = {d['id']: d for d in _cfg.get('tileSkins') or [] if d.get('id') and d.get('artUrl')}
RETIRED = set(_cfg.get('removedTileSkinIds') or []) - {'default'}
CACHE = os.path.join(tempfile.gettempdir(), 'll-tile-art')

TILES = [
    # hero: the classic tile spells PLAY
    ('default', 'P'), ('default', 'L'), ('default', 'A'), ('default', 'Y'),
    # how it plays: S P E L L on the classic tile
    ('default', 'S'), ('default', 'E'),
    # Word of the Day card: L E G E N D S on the classic tile
    ('default', 'G'), ('default', 'N'), ('default', 'D'),
    # collect: LEGENDS across seven themes
    ('cat', 'L'), ('cotton-candy', 'E'), ('sunflower', 'G'), ('bowlingball', 'E'), ('hedgehog', 'N'), ('chocolate', 'D'), ('smore', 'S'),
    # floating around the page and in the steps
    ('dog', 'W'), ('gummybear', 'Q'), ('fox', 'K'), ('rubberduck', 'Z'), ('donut', 'O'), ('boxingglove', 'X'),
    ('sheep', 'J'), ('popcorn', 'F'), ('brownie', 'R'), ('ladybug', 'M'),
]


def hex_rgb(h, fallback):
    h = (h or '').lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) if len(h) >= 6 else fallback


def skin_art(skin):
    """The art + glyph geometry the shipping game uses for this skin (Unity sprite space, y up)."""
    if skin == 'default':
        art = Image.open(os.path.join(UI, 'Tiles/Resources/default-tile.png'))
        return art, (0.10, 0.185, 0.90, 0.865), (0.806, 0.180), BROWN, BROWN, 134.8, 43.3
    if skin in RETIRED or (skin not in REMOTE and skin not in BAKED):
        sys.exit(f'{skin!r} is not a live tile skin (retired or unknown) - pick one from the live catalog')
    if skin in REMOTE:
        d = REMOTE[skin]
        os.makedirs(CACHE, exist_ok=True)
        path = os.path.join(CACHE, os.path.basename(d['artUrl']))  # URL names are content-hashed
        if not os.path.exists(path):
            urllib.request.urlretrieve(d['artUrl'], path + '.part'); os.replace(path + '.part', path)
        letter_col = hex_rgb(d.get('letterColor'), (0x3D, 0x29, 0x1A))
        return (Image.open(path), tuple(d.get('creamRect') or DEFAULT_CREAM), tuple(d['scoreCenter']),
                letter_col, hex_rgb(d.get('scoreColor'), CREAM),
                d.get('letterFontSize') or 134.8, d.get('scoreFontSize') or 43.3)
    art = Image.open(os.path.join(UI, f'Tiles/Resources/TileSkins/{skin}-tile.png'))
    letter_col = (255, 255, 255) if skin in WHITE_LETTER else BROWN
    return art, CREAM_RECTS.get(skin, DEFAULT_CREAM), SCORES[skin], letter_col, CREAM, 134.8, 43.3


def glyph(text, px, color, scale_x):
    """Ink-cropped glyph, squashed on x the way the canonical 220 root's non-uniform scale does."""
    f = ImageFont.truetype(FONT, max(1, round(px)))
    l, t, r, b = f.getbbox(text)
    im = Image.new('RGBA', (r - l + 4, b - t + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - l, 2 - t), text, font=f, fill=color + (255,))
    im = im.crop(im.getbbox())
    return im.resize((max(1, round(im.width * scale_x)), im.height), Image.LANCZOS)


def bake_tile(skin, letter, width=300):
    art, cream, score_c, letter_col, score_col, letter_px, score_px = skin_art(skin)
    art = art.convert('RGBA')
    W, H = art.size
    sx = W / H
    g = glyph(letter, letter_px / 220 * H, letter_col, sx)
    cx, cy = (cream[0] + cream[2]) / 2 * W, (1 - (cream[1] + cream[3]) / 2) * H
    art.alpha_composite(g, (round(cx - g.width / 2), round(cy - g.height / 2)))
    s = str(VALUES[letter])
    sp = score_px / 220 * H * (0.7 if len(s) > 1 else 1) + (2 / 220 * H if len(s) > 1 else 0)
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
        'crew': ('RateUs/Resources/RateUs/rate-heading.png', 1400),
        'hex-trio': ('HomeScreen/Resources/HomeScreen/home-hex-trio.png', 900),
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
            }
    for name, (src, w) in art.items():
        fit(src, f'art/{name}.webp', w, crop=name.startswith('logo-'))
    # avatar frames: live CDN frames from config_cosmetics.frames (never a retired one)
    frames = {f['id']: f for f in _cfg.get('frames') or [] if f.get('artUrl')}
    for fid in ('legendary', 'spacey', 'carnival', 'queen_bee'):
        if fid not in frames or fid in (_cfg.get('removedFrameIds') or []):
            sys.exit(f'{fid!r} is not a live avatar frame')
        path = os.path.join(CACHE, os.path.basename(frames[fid]['artUrl']))
        if not os.path.exists(path):
            urllib.request.urlretrieve(frames[fid]['artUrl'], path + '.part'); os.replace(path + '.part', path)
        fit(path, f'art/frame-{fid.replace("_", "-")}.webp', 260)
    # the sheet's pinned phone: one real capture per feature row (Device Simulator, iPhone 16 Pro). The
    # bottom 44 px carry the dev build stamp (e.g. '002955db1 · dev · 10-29 22:20'), so they are cropped off.
    # Captured with Letter Legends/QA/Capture Website Screens (iPhone 16 Pro). 'spell' is not re-baked: its last
    # capture caught the rack empty, so the committed screen-spell.webp (rack ZSOFMAD) stays.
    for cap, name in (('home', 'path'), ('challenge-friends', 'battle'), ('albums-tiles', 'themes'),
                      ('site-treasure-dig', 'events'), ('site-match-end', 'won')):
        im = Image.open(os.path.join(GAME, f'Screenshots/devices/iphone-16-pro/{cap}.png')).convert('RGB')
        im = im.crop((0, 0, im.width, im.height - 44))
        im = im.resize((620, round(im.height * 620 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, 'shots', f'screen-{name}.webp'), quality=84, method=6)
    # hero phones: real in-game captures (Device Simulator, iPhone 16 Pro, 2026-11-11): the board + the VS intro
    for cap, name in (('match-board', 'board'), ('match-vs-intro', 'vs')):
        im = Image.open(os.path.join(GAME, f'Screenshots/devices/iphone-16-pro/{cap}.png')).convert('RGB')
        im = im.resize((660, round(im.height * 660 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, 'shots', f'ui-{name}.webp'), quality=86, method=6)
    # ── scroll stories: card packs, Treasure Dig, Bonus Bounce (all game art) ──
    os.makedirs(os.path.join(OUT, 'story'), exist_ok=True)
    story = {
        'pack-common': ('Store/Resources/StoreV2/pack-common.png', 440),
        'pack-rare': ('Store/Resources/StoreV2/pack-rare.png', 440),
        'pack-epic': ('Store/Resources/StoreV2/pack-epic.png', 440),
        'card-back': ('Cards/Resources/Cards/card-back-common.png', 280),
        'card-front-common': ('Cards/Resources/Cards/card-front-common.png', 280),
        'card-front-rare': ('Cards/Resources/Cards/card-front-rare.png', 280),
        'card-front-epic': ('Cards/Resources/Cards/card-front-epic.png', 280),
        'undug': ('TreasureDig/Resources/TreasureDig/td-undug.png', 190),
        'dug': ('TreasureDig/Resources/TreasureDig/td-dug.png', 190),
        'td-coin': ('TreasureDig/Resources/TreasureDig/td-coin.png', 120),
        'td-gem': ('TreasureDig/Resources/TreasureDig/td-gem.png', 120),
        'pickaxe': ('TreasureDig/Resources/TreasureDig/td-pickaxe.png', 300),
        'chest-closed': ('TreasureDig/Resources/TreasureDig/td-chest-purple-closed.png', 380),
        'chest-open': ('TreasureDig/Resources/TreasureDig/td-chest-purple-open.png', 380),
        'pd-board': ('PegDrop/Resources/PegDrop/pd-board.png', 760),
        'bumper': ('PegDrop/Resources/PegDrop/pd-multiplier-peg.png', 170),
        'ball': ('PegDrop/Resources/PegDrop/pd-ball-orb.png', 96),
        'cup-coin': ('PegDrop/Resources/PegDrop/pd-cup-coin.png', 120),
        'cup-tile': ('PegDrop/Resources/PegDrop/pd-cup-tile.png', 120),
        'cup-pack': ('PegDrop/Resources/PegDrop/pd-cup-pack-common.png', 120),
    }
    for name, (src, w) in story.items():
        fit(src, f'story/{name}.webp', w)
    # the part cards wear the tile's own art (no letter), as the game's card faces do
    dog_art, *_ = skin_art('dog')
    fit(dog_art.filename, 'story/dog-art.webp', 300)
    bake_tile('dog', 'W', width=560)
    os.replace(os.path.join(OUT, 'tiles', 'dog-w.webp'), os.path.join(OUT, 'story', 'dog-w-big.webp'))
    bake_tile('dog', 'W')
    # the dig board: td-bg cropped around the 5 x 6 grid (TreasureDigModal stage units; the art spans the
    # stage's full height, board centred). Crop window in stage units: x -60..1140, y 880..2210.
    bg = Image.open(os.path.join(UI, 'TreasureDig/Resources/TreasureDig/td-bg.png')).convert('RGB')
    k = bg.height / 2401.43; x0 = (bg.width / k - 1080) / 2
    bg = bg.crop((round((x0 - 60) * k), round(880 * k), round((x0 + 1140) * k), round(2210 * k))).resize((1000, 1108), Image.LANCZOS)
    bg.save(os.path.join(OUT, 'story', 'dig-board.webp'), quality=84, method=6)
    # a real Bonus Bounce drop on the game's cabinet geometry + physics
    import bounce_sim
    s = bounce_sim.best()
    _, tube, frames, hits, cup, _t = s
    json.dump({'board': [1155, 2156], 'win': [bounce_sim.WCX, bounce_sim.WCY], 'ball': bounce_sim.BALL_R * 2,
               'cup': cup, 'cups': bounce_sim.CUP_CX, 'pegs': bounce_sim.PEGS, 'frames': frames, 'hits': hits},
              open(os.path.join(OUT, 'story', 'bounce.json'), 'w'), separators=(',', ':'))
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
    print('baked', len(TILES), 'tiles +', len(art), 'art + 2 phone screens into', OUT)
