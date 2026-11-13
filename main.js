// Letter Legends one-pager. No libraries.
(() => {
  // ── Stores ─────────────────────────────────────────────────────────────────────────────────────
  // The ONE launch switch. While a store is false its button reads as "Coming soon" and links nowhere
  // (neither listing is public yet; both URLs 404 today). Flip each to true the day it goes public.
  // 404.html (the /i/<code> invite page) has its own APP_STORE_LIVE for the same day.
  const STORES = {
    ios: { live: false, url: 'https://apps.apple.com/app/id6785250916' },
    android: { live: false, url: 'https://play.google.com/store/apps/details?id=com.glitchyard.letterlegends' },
  };
  const live = Object.values(STORES).filter((s) => s.live).length;
  document.querySelectorAll('[data-stores]').forEach((group) => {
    group.querySelectorAll('[data-store]').forEach((a) => {
      const s = STORES[a.dataset.store];
      if (s?.live) { a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; }
      else { a.setAttribute('aria-disabled', 'true'); a.title = 'Coming soon'; }
    });
    group.classList.toggle('is-soon', live < 2);
  });
  document.querySelectorAll('[data-soon]').forEach((p) => {
    if (live === 2) p.hidden = true;
    else if (live === 1) p.textContent = STORES.ios.live ? 'Coming soon to Android' : 'Coming soon to iPhone';
  });

  // ── Menu ───────────────────────────────────────────────────────────────────────────────────────
  const btn = document.querySelector('.rail__menu'), menu = document.getElementById('menu');
  const setMenu = (open) => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu'); };
  btn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
  addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setMenu(false); });

  // ── Mission words: split once so each word can light up ─────────────────────────────────────────
  const mission = document.querySelector('[data-words]');
  const words = [];
  if (mission) {
    const text = mission.textContent.trim();
    mission.textContent = '';
    const gold = text.lastIndexOf('Every letter counts.');
    let at = 0;
    text.split(/(\s+)/).forEach((t) => {
      if (/^\s+$/.test(t)) { mission.append(t); at += t.length; return; }
      const s = document.createElement('span');
      s.className = 'w' + (at >= gold ? ' is-gold' : ''); s.textContent = t;
      mission.append(s); words.push(s); at += t.length;
    });
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── More to play: spring-physics loops, running only while a card is on screen ──────────────────
  // Nothing here is a tween: every moving part is a damped spring (stiffness k, damping c) and every
  // change of state is a KICK (a new target and/or an impulse), so things hop, overshoot, wobble and
  // settle the way real objects do. One rAF drives every visible card at a fixed 240 Hz substep.
  (() => {
    const cards = [...document.querySelectorAll('[data-loop]')];
    if (!cards.length) return;
    const S = (x, k = 220, c = 16) => ({ x, v: 0, t: x, k, c });
    const stepS = (s, dt) => { s.v += (-s.k * (s.x - s.t) - s.c * s.v) * dt; s.x += s.v * dt; };
    const setText = (b, text) => { b.textContent = text; };

    // 1. Word of the Day: each tile hops to its slot (x spring + a jump under gravity + spin), lands with a squash
    const wotd = document.querySelector('.wotd');
    const tiles = wotd ? [...wotd.querySelectorAll('img')].map((el) => ({ el, dx: +el.style.getPropertyValue('--dx'), x: S(0, 170, 15), y: 0, vy: 0, air: false, rot: S(0, 260, 12), sq: S(0, 520, 18) })) : [];
    tiles.forEach((t) => { t.x.x = t.x.t = t.dx; t.el.style.translate = 'none'; });
    let solved = false;
    const hop = (t, to, delay) => setTimeout(() => {
      t.x.t = to; t.vy = -(560 + Math.random() * 160); t.air = true;
      t.rot.v += (to - t.x.x) * -90 + (Math.random() - .5) * 120; t.sq.v -= 3;   // push-off stretch
    }, delay);
    const shuffleWotd = () => { solved = !solved; tiles.forEach((t, i) => hop(t, solved ? 0 : t.dx, i * 70 + Math.random() * 40)); };

    // 2 + 6. pills that get flicked: a scale + lift spring kicked on every change; the backing cards lag behind
    const pill = (root) => root && { el: root.querySelector('.lang__pill, .turns__pill'), b: root.querySelector('b'), s: S(1, 380, 14), y: S(0, 300, 13), r: S(0, 300, 11) };
    const lang = document.querySelector('.lang'), langs = lang ? lang.dataset.langs.split('|') : [];
    const lp = pill(lang), back = lang ? { s: S(0, 200, 12) } : null;
    const turns = document.querySelector('.turns'), turnList = turns ? turns.dataset.turns.split('|') : [];
    const tp = pill(turns);
    const flick = (p, text, side = 1) => { setText(p.b, text); p.s.v += 2.6; p.y.v -= 260; p.r.v += 70 * side; };

    // 3. leagues ring: the bolt count is a spring chasing its target (overshoots a hair, settles); each
    // bolt "earned" thumps the icon
    // ...and when the ring fills you are PROMOTED: the trophy is knocked away and the next tier drops in
    // under gravity, lands with a squash and wobbles upright (bronze -> silver -> ... -> the star cup)
    const ring = document.querySelector('.ring'), league = document.querySelector('.league');
    const ringB = league?.querySelector('.bolts b'), ringIco = league?.querySelector('.bolts img');
    const ringTo = +(ringB?.dataset.countTo || 0), val = S(0, 26, 7.5), ico = S(1, 420, 12);
    const cups = [...(ring?.querySelectorAll('.trophy') || [])].map((el) => ({ el, s: S(0, 300, 14), y: 0, vy: 0, air: false, sq: S(0, 480, 16), rot: S(0, 240, 9), out: false }));
    let lastShown = 0, tier = 0, promoted = false;
    if (cups[0]) { cups[0].s.x = cups[0].s.t = 1; }
    const promote = () => {
      const old = cups[tier]; old.out = true; old.s.t = 0; old.s.v += 2.5; old.vy = -520; old.air = true; old.rot.v += 260;
      tier = (tier + 1) % cups.length;
      const c = cups[tier]; c.out = false; c.s.x = c.s.t = 1; c.s.v = 0; c.y = -150; c.vy = 0; c.air = true; c.rot.x = (Math.random() - .5) * 24; c.rot.t = 0;
      ico.v += 4;
    };

    // 4. letter pass: the fill is a spring stepping between reward stops; each reward pops when reached
    const passFill = document.querySelector('.pass__bar i'), passIcons = [...document.querySelectorAll('.pass img')];
    const stops = passIcons.map((i) => +i.style.getPropertyValue('--at'));
    const fill = S(0, 60, 11), pops = passIcons.map(() => ({ s: S(.72, 360, 11), hit: false }));
    let stop = -1;

    // 5. frames: the worn one springs up (with a wobble), the others settle back down
    const frames = [...document.querySelectorAll('.frames4 img')].map((el, i) => ({ el, s: S(i ? .85 : 1.18, 300, 13), r: S(0, 260, 9) }));
    let worn = 0;
    frames.forEach((f) => { f.el.classList.remove('is-worn'); f.el.style.transition = 'none'; });

    // ── the clock: beats fire per card on their own rhythm while visible ──
    const visible = new Set();
    const on = (el) => el && visible.has(el.closest('[data-loop]'));
    let clock = 0;
    const beats = [
      { el: wotd, every: 2.6, fn: shuffleWotd },
      { el: lang, every: 1.5, fn: () => { flick(lp, langs[(langs.indexOf(lp.b.textContent) + 1) % langs.length]); back.s.v += 1.6; } },
      { el: ring, every: 3.6, fn: () => { if (val.t) { val.t = 0; val.k = 40; promoted = false; } else { val.t = ringTo; val.k = 26; } } },
      { el: passFill, every: 1.1, fn: () => { stop++; if (stop > stops.length) { stop = -1; fill.t = 0; pops.forEach((p) => { p.hit = false; p.s.t = .72; }); } else fill.t = stop < stops.length ? stops[stop] + .02 : 1; } },
      { el: frames[0]?.el, every: 1.4, fn: () => { worn = (worn + 1) % frames.length; frames.forEach((f, i) => { f.s.t = i === worn ? 1.18 : .85; if (i === worn) { f.s.v += 2.2; f.r.v += (Math.random() < .5 ? -1 : 1) * 140; } }); } },
      { el: turns, every: 1.8, fn: () => { const s = turnList[(turnList.indexOf(tp.b.textContent) + 1) % turnList.length]; flick(tp, s, -1); tp.el.classList.toggle('is-wait', /^Waiting/.test(s)); } },
    ].filter((b) => b.el).map((b) => ({ ...b, next: .6 }));

    const integrate = (dt) => {
      if (on(wotd)) tiles.forEach((t) => {
        stepS(t.x, dt); stepS(t.rot, dt); stepS(t.sq, dt);
        if (t.air) { t.vy += 2600 * dt; t.y += t.vy * dt; if (t.y >= 0 && t.vy > 0) { t.y = 0; t.air = false; t.sq.v += t.vy * .006; t.rot.t = 0; } }
      });
      if (on(lang)) { stepS(lp.s, dt); stepS(lp.y, dt); stepS(lp.r, dt); stepS(back.s, dt); }
      if (on(turns)) { stepS(tp.s, dt); stepS(tp.y, dt); stepS(tp.r, dt); }
      if (on(ring)) {
        stepS(val, dt); stepS(ico, dt);
        if (val.t && !promoted && val.x >= ringTo * .985) { promoted = true; promote(); }
        cups.forEach((c) => {
          stepS(c.s, dt); stepS(c.sq, dt); stepS(c.rot, dt);
          if (c.air) { c.vy += 2600 * dt; c.y += c.vy * dt;
            if (!c.out && c.y >= 0 && c.vy > 0) { c.y = 0; c.air = false; c.sq.v += c.vy * .007; c.rot.v += (Math.random() - .5) * 200; }
            if (c.out && c.s.x < .02) { c.air = false; c.y = 0; c.vy = 0; } }
        });
      }
      if (on(passFill)) { stepS(fill, dt); pops.forEach((p, i) => { if (!p.hit && fill.x >= stops[i]) { p.hit = true; p.s.t = 1; p.s.v += 9; } stepS(p.s, dt); }); }
      if (on(frames[0]?.el)) frames.forEach((f) => { stepS(f.s, dt); stepS(f.r, dt); });
    };
    const render = () => {
      if (on(wotd)) tiles.forEach((t) => {
        const q = Math.max(-.25, Math.min(.25, t.sq.x));
        t.el.style.transform = `translate(calc(${t.x.x.toFixed(3)} * var(--t) * 1.1), ${t.y.toFixed(1)}px) rotate(${t.rot.x.toFixed(2)}deg) scale(${(1 + q * .6).toFixed(3)}, ${(1 - q).toFixed(3)})`;
      });
      for (const p of [lp, tp]) if (p && on(p.el)) p.el.style.transform = `translateY(${p.y.x.toFixed(1)}px) rotate(${p.r.x.toFixed(2)}deg) scale(${p.s.x.toFixed(4)})`;
      if (lang && on(lang)) lang.style.setProperty('--lag', back.s.x.toFixed(3));
      if (on(ring)) {
        const n = Math.max(0, Math.round(val.x));
        if (n !== lastShown) { if (n > lastShown) ico.v += 2.2; lastShown = n; ringB.textContent = n; }
        ring.style.setProperty('--p', Math.max(0, Math.min(100, val.x / ringTo * 100)).toFixed(2));
        ringIco.style.transform = `scale(${ico.x.toFixed(3)})`;
        cups.forEach((c) => { const q = Math.max(-.25, Math.min(.25, c.sq.x)), s = Math.max(0, c.s.x);
          c.el.style.opacity = s > .02 ? 1 : 0;
          c.el.style.transform = `translateY(${c.y.toFixed(1)}px) rotate(${c.rot.x.toFixed(2)}deg) scale(${(s * (1 + q * .6)).toFixed(3)}, ${(s * (1 - q)).toFixed(3)})`; });
      }
      if (on(passFill)) { passFill.style.transform = `scaleX(${Math.max(0, fill.x).toFixed(4)})`; passIcons.forEach((im, i) => { const s = pops[i].s.x; im.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`; im.style.opacity = pops[i].hit ? 1 : .55; }); }
      if (on(frames[0]?.el)) frames.forEach((f, i) => { f.el.style.transform = `scale(${f.s.x.toFixed(4)}) rotate(${f.r.x.toFixed(2)}deg)`; f.el.style.opacity = i === worn ? 1 : .55; });
    };

    if (reduced) { // finished states, no motion
      tiles.forEach((t) => { t.el.style.transform = 'none'; });
      if (ringB) { ringB.textContent = ringTo; ring.style.setProperty('--p', 100); }
      cups.forEach((c, i) => { c.el.style.opacity = i === cups.length - 1 ? 1 : 0; });
      if (passFill) passFill.style.transform = 'scaleX(1)';
      passIcons.forEach((im) => { im.style.transform = 'translate(-50%, -50%)'; im.style.opacity = 1; });
      frames.forEach((f, i) => { f.el.style.transform = `scale(${i ? .85 : 1.18})`; f.el.style.opacity = i ? .55 : 1; });
      return;
    }
    render();
    let raf = 0, last = 0, acc = 0;
    const DT = 1 / 240;
    const loop = (now) => {
      raf = 0;
      if (!visible.size) { last = 0; return; }
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      clock += dt;
      for (const b of beats) if (on(b.el) && clock >= b.next) { b.fn(); b.next = clock + b.every; }
      acc += dt; while (acc >= DT) { integrate(DT); acc -= DT; }
      render();
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { e.target.classList.toggle('is-on', e.isIntersecting); e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      if (visible.size && !raf) raf = requestAnimationFrame(loop);
    }, { threshold: 0.2 });
    cards.forEach((c) => io.observe(c));
  })();
  if (reduced) { document.querySelector('.fab').classList.add('is-on'); words.forEach((w) => w.classList.add('is-lit')); document.querySelector('.fan3')?.style.setProperty('--open', 1); return; }
  document.documentElement.classList.add('js');

  // ── Arrival fade: from below while scrolling down, from above while scrolling up ────────────────
  // Resets once fully off screen so it plays on every arrival; siblings stagger.
  let lastY = scrollY, dir = 1;
  addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; } }, { passive: true });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const el = e.target;
    if (e.isIntersecting && !el.classList.contains('is-in')) {
      el.style.setProperty('--fx-y', `${dir > 0 ? 40 : -40}px`);
      void el.offsetWidth; // commit the start side before the transition begins
      el.classList.add('is-in');
    } else if (!e.isIntersecting) el.classList.remove('is-in');
  }), { rootMargin: '-5% 0px -5% 0px' });
  document.querySelectorAll('[data-fx]').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-fx'));
    el.style.setProperty('--fx-d', `${Math.min(sibs.indexOf(el) * 0.08, 0.32).toFixed(2)}s`);
    io.observe(el);
  });

  // ── Scroll-driven pieces (posed from the scroll position only, one rAF per scroll frame) ────────
  const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const io3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const floats = [...document.querySelectorAll('[data-d]')].map((el) => ({ el, d: parseFloat(el.dataset.d), sec: el.closest('section') }));
  const shots = [...document.querySelectorAll('.stack__shot')], rows = [...document.querySelectorAll('.row')];
  const fan3 = document.querySelector('.fan3');
  const fab = document.querySelector('.fab'), missionSec = mission?.closest('section');
  let raf = 0, litN = -1;
  const frame = () => {
    raf = 0;
    const VH = innerHeight;
    fab.classList.toggle('is-on', scrollY > VH * 0.7); // back-to-top appears once the hero is behind you
    // mission: words light up as the paragraph travels up the screen
    if (mission) {
      const r = missionSec.getBoundingClientRect(); // the text is pinned: progress = scroll through its section
      if (r.bottom > -VH && r.top < VH * 2) {
        const n = Math.round(words.length * cl((VH * 0.35 - r.top) / (r.height - VH * 0.9)));
        if (n !== litN) { words.forEach((w, i) => w.classList.toggle('is-lit', i < n)); litN = n; }
      }
    }
    // cast: placeholders drift against the scroll
    for (const f of floats) {
      const r = f.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > VH + 200) continue;
      f.el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - VH / 2) * f.d).toFixed(1)}px, 0)`;
    }
    // the sheet: the pinned phone's screen switches to each row's screen as that row reaches the middle
    if (shots.length && getComputedStyle(shots[0].closest('.stack')).display !== 'none') {
      const k = rows.map((row, i) => (i === 0 ? 1 : io3(cl((VH * 0.78 - row.getBoundingClientRect().top) / (VH * 0.32)))));
      shots.forEach((s, i) => {
        const next = k[i + 1] || 0;
        s.style.opacity = i === 0 ? 1 : k[i].toFixed(3);
        s.style.transform = `translate3d(0, ${((1 - k[i]) * 6).toFixed(2)}%, 0) scale(${(1 + (1 - k[i]) * 0.04 - next * 0.03).toFixed(4)})`;
      });
    }
    // card packs: the fan spreads as the section comes up the screen (closed stack -> open fan)
    if (fan3) {
      const r = fan3.getBoundingClientRect();
      if (r.bottom > -200 && r.top < VH + 200) fan3.style.setProperty('--open', io3(cl((VH * 0.95 - r.top) / (VH * 0.55))).toFixed(4));
    }
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(frame); });
  frame();
})();
