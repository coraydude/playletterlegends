// Scroll stories: card packs, Treasure Dig, Bonus Bounce.
// Each .story is a tall section with a sticky stage. Its progress p (0..1) is purely the scroll position
// through the section, and every piece is posed from p alone: no timers, no transitions. Scroll and it
// plays (forwards or backwards), stop and it holds. One rAF per scroll frame; stories off screen are skipped.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (p, a, b) => cl((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const oc = (t) => 1 - (1 - t) ** 3;                                   // ease-out cubic
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);  // ease-in-out cubic
  const ob = (t) => { const c = 1.70158, c3 = c + 1; return t <= 0 ? 0 : 1 + c3 * (t - 1) ** 3 + c * (t - 1) ** 2; }; // ease-out back
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent.appendChild(e); return e; };
  const img = (src, cls, parent) => { const i = el('img', cls, parent); i.src = src; i.alt = ''; i.decoding = 'async'; return i; };
  const set = (e, t, o) => { e.style.transform = t; if (o !== undefined) e.style.opacity = o; };
  const beats = (root, idx) => root.querySelectorAll('.beats li').forEach((li, i) => li.classList.toggle('is-on', i === idx));
  // a ring of reward particles flying out of a point, posed from b (0..1)
  // arc = [from, to] radians (y down); a fountain uses the upper half only
  const burst = (host, srcs, n, arc = [0, Math.PI * 2]) => Array.from({ length: n }, (_, k) => ({ e: img(srcs[k % srcs.length], '', host), a: arc[0] + ((k + 0.5) / n) * (arc[1] - arc[0]) + (k % 2) * 0.12, d: 0.6 + ((k * 37) % 10) / 25 }));
  const poseBurst = (parts, cx, cy, R, b) => parts.forEach((q) => {
    const t = oc(b), x = cx + Math.cos(q.a) * R * q.d * t, y = cy + Math.sin(q.a) * R * q.d * t * 0.8 + b * b * R * 0.9;
    set(q.e, `translate(${x}cqw, ${y}cqw) translate(-50%, -50%) scale(${0.4 + 0.6 * oc(seg(b, 0, 0.3))}) rotate(${q.a * 60 * b}deg)`, b > 0 ? 1 - seg(b, 0.65, 1) : 0);
  });

  // ── Card packs ──────────────────────────────────────────────────────────────────────────────────
  // The pack rips, four part cards deal out and flip, each part's progress bar fills, the tile unlocks.
  // Parts and copies are the game's: the dog tile's Paw/Fur/Tail/Ear, one Common, two Rare, one Epic
  // (TileCardCatalog.UniversalPartSpread), needing 10/25/25/25 copies (config_tile_cards.partCopies*).
  function packs(root) {
    const vis = root.querySelector('.pk'), host = vis.querySelector('.pk-parts');
    const top = vis.querySelector('.pk-top'), body = vis.querySelector('.pk-body'), pack = vis.querySelector('.pk-pack');
    const glow = vis.querySelector('.pk-glow'), flash = vis.querySelector('.pk-flash');
    const rays = vis.querySelector('.pk-rays'), tile = vis.querySelector('.pk-tile'), label = vis.querySelector('.pk-label');
    const parts = [
      { n: 'Paw', r: 'common', d: 1, need: 10, have: 4 },
      { n: 'Fur', r: 'rare', d: 2, need: 25, have: 11 },
      { n: 'Tail', r: 'rare', d: 2, need: 25, have: 8 },
      { n: 'Ear', r: 'epic', d: 3, need: 25, have: 5 },
    ];
    const X = [2.5, 26.833, 51.167, 75.5]; // card lefts (%), 21.5 wide, even gaps
    parts.forEach((q, i) => {
      q.card = el('div', 'pk-card', host); q.card.style.left = X[i] + '%';
      q.inner = el('div', 'pk-inner', q.card);
      img('assets/story/card-back.webp', '', el('div', 'pk-face pk-back', q.inner));
      const front = el('div', 'pk-face pk-front', q.inner);
      img(`assets/story/card-front-${q.r}.webp`, '', front);
      img('assets/story/dog-art.webp', 'pk-art', front);
      el('div', 'pk-dia', front, '◆'.repeat(q.d));
      el('div', 'pk-name', front, q.n);
      q.bar = el('div', 'pk-bar', host); q.bar.style.left = X[i] + '%';
      q.fill = el('div', 'pk-fill', q.bar);
      q.count = el('div', 'pk-count', q.bar);
      q.check = el('div', 'pk-check', host, '✓'); q.check.style.left = `calc(${X[i] + 21.5}% - 4.2cqw)`;
    });
    let lastFull = [];
    return (p) => {
      beats(root, p < 0.17 ? 0 : p < 0.42 ? 1 : p < 0.82 ? 2 : 3);
      // the pack arrives, wobbles, rips
      const a = oc(seg(p, 0, 0.1)), w = seg(p, 0.06, 0.17), r = seg(p, 0.16, 0.3);
      const wob = Math.sin(w * Math.PI * 7) * 5 * w * (1 - r);
      set(pack, `scale(${0.7 + 0.3 * a}) rotate(${wob}deg)`, a);
      set(top, `translate(${oc(r) * 34}cqw, ${-oc(r) * 60}cqw) rotate(${oc(r) * 38}deg)`, 1 - seg(p, 0.22, 0.3));
      set(body, `translate(0, ${io(r) * 40}cqw) scale(${1 - 0.15 * r})`, 1 - seg(p, 0.2, 0.3));
      glow.style.opacity = (a * 0.7 + Math.sin(seg(p, 0.14, 0.32) * Math.PI) * 0.5) * (1 - seg(p, 0.8, 0.88));
      flash.style.opacity = Math.sin(seg(p, 0.16, 0.27) * Math.PI);
      // cards: out of the pack (centre), into their slots, then flip one by one
      const conv = io(seg(p, 0.82, 0.9));
      parts.forEach((q, i) => {
        const e = ob(seg(p, 0.2 + i * 0.025, 0.34 + i * 0.025));
        const fromX = 50 - (X[i] + 10.75), fromY = 4; // cqw from slot to the pack mouth
        const toX = (50 - (X[i] + 10.75)) * conv, toY = 9 * conv;
        const x = lerp(fromX, 0, e) + toX, y = lerp(fromY, 0, e) + toY;
        const s = lerp(0.35, 1, e) * (1 - 0.65 * conv);
        set(q.card, `translate(${x}cqw, ${y}cqw) scale(${s}) rotate(${(1 - e) * (i - 1.5) * 14}deg)`, seg(p, 0.2 + i * 0.025, 0.23 + i * 0.025) * (1 - seg(p, 0.86, 0.9)));
        q.inner.style.transform = `rotateY(${io(seg(p, 0.33 + i * 0.03, 0.42 + i * 0.03)) * 180}deg)`;
        // progress: from what the player had to a full part, counting up
        const f = io(seg(p, 0.46 + i * 0.07, 0.6 + i * 0.07)), have = Math.round(lerp(q.have, q.need, f));
        q.fill.style.transform = `scaleX(${have / q.need})`;
        q.count.textContent = `${have}/${q.need}`;
        const full = have === q.need;
        if (lastFull[i] !== full) { q.bar.classList.toggle('is-full', full); lastFull[i] = full; }
        set(q.bar, `translate(${toX}cqw, ${toY}cqw) scale(${1 - 0.65 * conv})`, seg(p, 0.42, 0.46) * (1 - seg(p, 0.84, 0.88)));
        q.check.style.scale = ob(seg(p, 0.6 + i * 0.07, 0.64 + i * 0.07)) * (1 - seg(p, 0.82, 0.86));
      });
      // the tile unlocks
      const u = seg(p, 0.86, 0.95);
      rays.style.opacity = seg(p, 0.86, 0.92);
      rays.style.transform = `rotate(${(p - 0.86) * 520}deg)`;
      set(tile, `scale(${0.2 + 0.8 * ob(u)}) rotate(${(1 - oc(u)) * -12}deg)`, seg(p, 0.86, 0.89));
      set(label, `translateY(${(1 - oc(seg(p, 0.91, 0.97))) * 6}cqw)`, seg(p, 0.91, 0.97));
    };
  }

  // ── Treasure Dig ────────────────────────────────────────────────────────────────────────────────
  // The game's 5 x 6 board on its own dirt (TreasureDigModal grid geometry, in the crop's units). The
  // pickaxe digs every cell in turn; each block shatters into four chunks and shows what was under it.
  // Board 1's real hidden haul: 10 coin cells and 7 gem cells (config_treasure_dig). Then the chest.
  function dig(root) {
    const vis = root.querySelector('.dg'), grid = vis.querySelector('.dg-grid');
    const pick = vis.querySelector('.dg-pick'), dim = vis.querySelector('.dg-dim'), chest = vis.querySelector('.dg-chest');
    const closed = vis.querySelector('.dg-closed'), open = vis.querySelector('.dg-open'), label = vis.querySelector('.dg-label');
    const CW = 1200, CH = 1330, X0 = -60, Y0 = 880; // crop window (stage units)
    const HW = 1108 / 1000; // the board image's height / width: % of height → cqw
    const loot = 'cg c gc gcc  gc  c g gc c g c '.split(''); // 10 c + 7 g across 30 cells
    const cells = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
      const x = 86.78 + c * (166.7 + 16.68) - X0, y = 1045.91 + r * (150.08 + 16.92) - Y0;
      const box = el('div', 'dg-cell', grid);
      Object.assign(box.style, { left: (x / CW) * 100 + '%', top: (y / CH) * 100 + '%', width: (166.7 / CW) * 100 + '%', height: (150.08 / CH) * 100 + '%' });
      img('assets/story/dug.webp', '', box);
      const k = loot[r * 5 + c], prize = k === ' ' ? null : img(k === 'c' ? 'assets/story/td-coin.webp' : 'assets/story/td-gem.webp', 'dg-loot', box);
      const shards = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => {
        const s = el('div', 'dg-shard', box);
        s.style.clipPath = `inset(${dy < 0 ? 0 : 50}% ${dx > 0 ? 0 : 50}% ${dy > 0 ? 0 : 50}% ${dx < 0 ? 0 : 50}%)`;
        return { s, dx, dy };
      });
      // serpentine order so the pickaxe travels one cell at a time
      const order = r * 5 + (r % 2 ? 4 - c : c);
      cells[order] = { box, prize, shards, cx: (x + 83.35) / CW * 100, cy: (y + 75) / CH * 100 };
    }
    const T0 = 0.07, DT = 0.022, END = T0 + 30 * DT; // dig window; the chest after it
    const at = (i) => T0 + i * DT;
    const parts = burst(vis.querySelector('.dg-burst'), ['assets/story/td-coin.webp', 'assets/story/td-gem.webp'], 14);
    return (p) => {
      beats(root, p < T0 ? 0 : p < END + 0.02 ? 1 : 2);
      cells.forEach((q, i) => {
        const t = at(i), k = seg(p, t, t + 0.03);
        const shake = p > t - 0.012 && p < t ? Math.sin((p - t) * 2600) * 3 : 0;
        q.shards.forEach(({ s, dx, dy }) => set(s, k > 0
          ? `translate(${dx * oc(k) * 55}%, ${dy * oc(k) * 30 + k * k * 170}%) rotate(${dx * k * 70}deg) scale(${1 - 0.3 * k})`
          : `rotate(${shake}deg)`, 1 - seg(p, t + 0.016, t + 0.03)));
        if (q.prize) {
          q.prize.style.transform = `translateY(${-oc(seg(p, t + 0.01, t + 0.05)) * 8}%)`;
          q.prize.style.scale = ob(seg(p, t + 0.008, t + 0.04));
        }
      });
      // pickaxe: rides from cell to cell, raised mid-way, striking as each interval begins
      let x, y, ang;
      if (p < T0) { const e = oc(seg(p, 0, T0)); x = lerp(110, cells[0].cx, e); y = lerp(-20, cells[0].cy, e); ang = lerp(-60, -30, e); }
      else {
        const f = (p - T0) / DT, j = Math.min(29, Math.floor(f)), ph = Math.min(1, f - j), nx = cells[Math.min(29, j + 1)];
        const m = io(seg(ph, 0.25, 0.85));
        x = lerp(cells[j].cx, nx.cx, j < 29 ? m : 0); y = lerp(cells[j].cy, nx.cy, j < 29 ? m : 0);
        ang = 18 - 58 * Math.sin(Math.min(1, ph) * Math.PI); // down on the hit, raised between
        if (p > END) { const o = oc(seg(p, END, END + 0.05)); x = lerp(x, 115, o); y = lerp(y, -25, o); }
      }
      set(pick, `translate(${x - 4}cqw, ${y * HW - 15}cqw) rotate(${ang}deg)`, 1 - seg(p, END + 0.02, END + 0.05));
      // the chest: rises over the dimmed board, shakes, bursts open
      const c = seg(p, END + 0.02, END + 0.1), sh = seg(p, END + 0.1, END + 0.15), o = seg(p, END + 0.15, END + 0.17);
      dim.style.opacity = c * 0.9;
      set(chest, `translate(-50%, ${lerp(60, -45, oc(c))}%) scale(${0.5 + 0.5 * ob(c) + o * 0.08}) rotate(${Math.sin(sh * Math.PI * 8) * 7 * (1 - o)}deg)`, seg(p, END + 0.02, END + 0.05));
      closed.style.opacity = 1 - o; open.style.opacity = o;
      poseBurst(parts, 50, 46 * HW, 40, seg(p, END + 0.15, 0.99));
      set(label, `translateY(${(1 - oc(seg(p, END + 0.17, END + 0.22))) * 6}cqw)`, seg(p, END + 0.17, END + 0.22));
    };
  }

  // ── Bonus Bounce ────────────────────────────────────────────────────────────────────────────────
  // The game's cabinet with its own pegs and bumpers; the ball follows a drop simulated with the game's
  // physics (scripts/bounce_sim.py → bounce.json) into the 600 coin cup. Prizes are the server's board:
  // pack / 600 coins / x5 Gold Tiles / 200 coins / pack (cloudscript PEGDROP_SLOTS).
  function bounce(root) {
    const vis = root.querySelector('.bb'), field = vis.querySelector('.bb-field'), label = vis.querySelector('.bb-label');
    let D = null, ball, pegs = [], win, prizes = [], parts = [];
    const BW = 1155, BH = 2156;
    const px = (bx) => ((D.win[0] + bx) / BW) * 100, py = (by) => ((D.win[1] - by) / BH) * 100;
    const ready = fetch('assets/story/bounce.json').then((r) => r.json()).then((d) => {
      D = d;
      const PRIZES = [['cup-pack', 'x1'], ['cup-coin', '600'], ['cup-tile', 'x5'], ['cup-coin', '200'], ['cup-pack', 'x1']];
      win = el('div', 'bb-win', field);
      D.cups.forEach((cx, i) => {
        const e = el('div', 'bb-prize' + (i === 2 ? ' bb-prize--jack' : ''), field);
        img(`assets/story/${PRIZES[i][0]}.webp`, '', e); el('b', '', e, PRIZES[i][1]);
        e.style.left = px(cx) + '%'; e.style.top = ((1551.38 + 60) / BH) * 100 + '%';
        prizes.push(e);
      });
      win.style.left = px(D.cups[D.cup]) + '%'; win.style.top = ((1551.38 + 50) / BH) * 100 + '%';
      D.pegs.forEach(([x, y, d]) => {
        const big = d > 100;
        const e = el('div', big ? 'bb-bump' : 'bb-peg', field);
        if (big) { img('assets/story/bumper.webp', '', e); e.style.width = ((163.23 * 1520 / 1324) / BW) * 100 + '%'; }
        e.style.left = px(x) + '%'; e.style.top = py(y) + '%';
        pegs.push({ e, glow: el('i', '', e), big });
      });
      ball = el('div', 'bb-ball', field); img('assets/story/ball.webp', '', ball);
      parts = burst(vis.querySelector('.bb-burst'), ['assets/story/cup-coin.webp'], 12, [-Math.PI * 0.92, -Math.PI * 0.08]);
    });
    let pend = null;
    const draw = (p) => {
      beats(root, p < 0.06 ? 0 : p < 0.86 ? 1 : 2);
      const N = D.frames.length - 1, T = seg(p, 0.06, 0.86) * N, i = Math.min(N - 1, Math.floor(T)), f = T - i;
      const [ax, ay] = D.frames[i], [bx, by] = D.frames[i + 1];
      const x = px(lerp(ax, bx, f)), y = py(lerp(ay, by, f));
      const vy = (by - ay) * 60, squash = Math.min(0.14, Math.abs(vy) / 9000);
      ball.style.opacity = seg(T, 0, 10);
      ball.style.transform = `translate(calc(${x}cqw - 50%), calc(${y * BH / BW}cqw - 50%)) scale(${1 - squash}, ${1 + squash})`;
      // glow every peg the ball has touched, fading over 14 frames (a pure function of T: scrub-safe)
      const g = new Float32Array(pegs.length);
      for (const [k, fr] of D.hits) if (fr <= T) g[k] = Math.max(g[k], 1 - (T - fr) / 14);
      pegs.forEach((q, k) => { const v = cl(g[k]); q.glow.style.opacity = v; if (q.big) q.e.style.scale = 1 + 0.12 * v; });
      // the landing
      const l = seg(p, 0.86, 0.92);
      win.style.opacity = l;
      prizes.forEach((e, k) => { e.style.scale = k === D.cup ? 1 + 0.35 * ob(l) : 1; });
      poseBurst(parts, px(D.cups[D.cup]), (1492.31 / BW) * 100, 30, seg(p, 0.88, 0.99));
      set(label, `translateY(${(1 - oc(seg(p, 0.9, 0.96))) * 6}cqw)`, seg(p, 0.9, 0.96));
    };
    ready.then(() => { if (pend !== null) draw(pend); });
    return (p) => { if (D) draw(p); else pend = p; };
  }

  const kinds = { packs, dig, bounce };
  const stories = [...document.querySelectorAll('[data-story]')].map((root) => ({ root, draw: kinds[root.dataset.story](root), top: 0, h: 0, p: -1 }));
  if (!stories.length) return;
  if (reduced) { stories.forEach((s) => s.draw(1)); return; }
  let VH = innerHeight, raf = 0;
  const frame = () => {
    raf = 0;
    const y = scrollY;
    for (const s of stories) {
      if (y + VH < s.top - VH * 0.2 || y > s.top + s.h) continue; // off screen: nothing to pose
      const p = cl((y - s.top) / Math.max(1, s.h - VH));
      if (p !== s.p) { s.p = p; s.draw(p); }
    }
  };
  const measure = () => {
    VH = innerHeight;
    stories.forEach((s) => { s.top = s.root.getBoundingClientRect().top + scrollY; s.h = s.root.offsetHeight; s.p = -1; });
    frame();
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); });
  addEventListener('load', measure);
  stories.forEach((s) => s.draw(0));
  measure();
})();
