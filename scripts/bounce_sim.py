#!/usr/bin/env python3
"""A real Bonus Bounce drop for the site, simulated on the game's own cabinet.

Geometry and physics constants are PegDropModal.cs's (pegs, bumpers, walls, tray posts, cups, gravity,
restitution, bumper kick, 480 Hz integration). The search tries start offsets under the tubes and keeps
the liveliest run that lands in TARGET_CUP; the page scrubs it frame by frame with the scroll.
Coordinates are board-local (origin = playfield window centre, y up), as in the game.
"""
import json, math

WIN_X, WIN_Y, WIN_W, WIN_H = 98.26, 260.36, 869.41, 1453.64
WCX, WCY = WIN_X + WIN_W / 2, WIN_Y + WIN_H / 2
TUBE_MOUTH = [(312.6, 385.0), (533.6, 401.1), (753.5, 384.9)]
CUP_X = [143.92, 304.92, 460.92, 621.92, 788.92]
CUP_W, CUP_TOP_Y, CUP_MOUTH_DEPTH = 131.1, 1492.31, 27.0
PEG, BUMPER = 17.0, 154.0
PEGS = [
    (-200.0, 500.0, PEG), (200.0, 500.0, PEG), (280.3, 441.9, PEG), (-273.7, 438.9, PEG),
    (-100.0, 430.0, PEG), (100.0, 430.0, PEG), (0.3, 371.9, PEG),
    (-130.0, 150.0, PEG), (130.0, 150.0, PEG), (340.3, 340.9, PEG), (-333.7, 339.9, PEG),
    (188.3, 311.9, PEG), (-183.7, 310.9, PEG), (44.3, 233.9, PEG), (-75.7, 223.9, PEG),
    (217.3, 56.9, PEG), (-209.7, 55.9, PEG), (342.3, 0.9, PEG), (-339.7, 0.9, PEG),
    (-112.0, -35.0, PEG), (112.0, -35.0, PEG), (51.3, -98.1, PEG), (-46.7, -99.1, PEG),
    (3.3, -177.1, PEG), (-359.7, -210.1, PEG), (365.3, -213.1, PEG),
    (-135.7, -269.1, PEG), (142.3, -270.1, PEG), (312.3, -279.1, PEG), (-308.7, -280.1, PEG),
    (-50.0, -275.0, PEG), (50.0, -275.0, PEG),
    (354.3, -359.1, PEG), (174.3, -360.1, PEG), (4.3, -360.1, PEG), (-166.7, -360.1, PEG), (-341.7, -360.1, PEG),
    (-336.8, 175.9, BUMPER), (-6.8, 65.6, BUMPER), (339.4, 188.4, BUMPER), (231.4, -135.3, BUMPER), (-217.3, -135.3, BUMPER),
]
BALL_R = 28.0
GRAVITY, TERMINAL = -1500.0, 1400.0
PEG_E, WALL_E, FRICTION = 0.5, 0.45, 0.15
BUMPER_E, BUMPER_KICK = 0.92, 420.0
DT = 1 / 480
TRAY_TOP, POST_R = -458.0, 16.0
CUP_CX = [x + CUP_W / 2 - WCX for x in CUP_X]
POSTS = [(a + b) / 2 for a, b in zip(CUP_CX, CUP_CX[1:])]
MOUTH_Y = WCY - (CUP_TOP_Y + CUP_MOUTH_DEPTH)
HALF_W = WIN_W / 2
TARGET_CUP = 1  # 600 coins (cloudscript PEGDROP_SLOTS[1])


def bounce(p, v, cx, cy, rad, e, kick=0.0):
    dx, dy = p[0] - cx, p[1] - cy
    d = math.hypot(dx, dy)
    m = rad + BALL_R
    if d >= m or d == 0:
        return False
    nx, ny = dx / d, dy / d
    p[0], p[1] = cx + nx * m, cy + ny * m
    vn = v[0] * nx + v[1] * ny
    if vn < 0:
        tx, ty = v[0] - vn * nx, v[1] - vn * ny
        v[0] = tx * (1 - FRICTION) - vn * nx * e + nx * kick
        v[1] = ty * (1 - FRICTION) - vn * ny * e + ny * kick
    return True


def run(tube, dx):
    mx, my = TUBE_MOUTH[tube]
    p, v = [mx - WCX + dx, WCY - my + 74.0], [0.0, 0.0]
    frames, hits, last_hit, t, sub = [], [], {}, 0.0, 0
    while t < 9.0:
        v[1] = max(v[1] + GRAVITY * DT, -TERMINAL)
        p[0] += v[0] * DT; p[1] += v[1] * DT
        for i, (px, py, d) in enumerate(PEGS):
            big = d == BUMPER
            if bounce(p, v, px, py, d / 2, BUMPER_E if big else PEG_E, BUMPER_KICK if big else 0.0):
                if t - last_hit.get(i, -1) > 0.12:
                    hits.append([i, len(frames)])
                last_hit[i] = t
        for x in POSTS:  # tray posts: capsules from the post top down past the cup mouths
            if p[1] < TRAY_TOP + POST_R + BALL_R:
                bounce(p, v, x, min(TRAY_TOP, max(p[1], MOUTH_Y - 200)), POST_R, PEG_E)
        if p[0] < -HALF_W + BALL_R: p[0], v[0] = -HALF_W + BALL_R, -v[0] * WALL_E
        if p[0] > HALF_W - BALL_R: p[0], v[0] = HALF_W - BALL_R, -v[0] * WALL_E
        if sub % 8 == 0:
            frames.append([round(p[0], 1), round(p[1], 1)])
        sub += 1; t += DT
        if p[1] <= MOUTH_Y:
            cup = min(range(5), key=lambda k: abs(CUP_CX[k] - p[0]))
            sx, sy = p[0], p[1]
            for k in range(1, 13):  # settle into the cup (CupSink 70)
                a = k / 12
                frames.append([round(sx + (CUP_CX[cup] - sx) * a, 1), round(sy - 70 * a, 1)])
            return frames, hits, cup, t
    return None


def best():
    pick = None
    for tube in (1, 0, 2):
        for i in range(-160, 161):
            r = run(tube, i * 0.25)
            if not r:
                continue
            frames, hits, cup, t = r
            if cup != TARGET_CUP or not 2.6 <= t <= 5.0:
                continue
            bumps = sum(1 for h in hits if PEGS[h[0]][2] == BUMPER)
            score = bumps * 3 + len(hits) - abs(t - 3.8)
            if pick is None or score > pick[0]:
                pick = (score, tube, frames, hits, cup, t)
    return pick


if __name__ == '__main__':
    import sys
    s = best()
    _, tube, frames, hits, cup, t = s
    print(f'tube {tube} cup {cup} {t:.2f}s frames {len(frames)} hits {len(hits)} bumpers {sum(1 for h in hits if PEGS[h[0]][2] == BUMPER)}')
    if len(sys.argv) > 1:
        json.dump({'fps': 60, 'board': [1155, 2156], 'win': [WCX, WCY], 'ball': BALL_R * 2,
                   'tube': [TUBE_MOUTH[tube][0], TUBE_MOUTH[tube][1]], 'cup': cup, 'cups': CUP_CX,
                   'cupIconY': WCY - (1551.38 + 43), 'pegs': PEGS, 'frames': frames, 'hits': hits},
                  open(sys.argv[1], 'w'), separators=(',', ':'))
