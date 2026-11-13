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

  // ── More to play: each card's art loops only while that card is on screen ────────────────────
  // CSS loops run off .is-on; the text loops (languages, bolts, frames, turns) step on one shared
  // timer that only ticks while at least one card is visible.
  (() => {
    const cards = [...document.querySelectorAll('[data-loop]')];
    if (!cards.length) return;
    const lang = document.querySelector('.lang'), langs = lang ? lang.dataset.langs.split('|') : [];
    const langPill = lang?.querySelector('.lang__pill'), langB = langPill?.querySelector('b');
    const ring = document.querySelector('.ring'), ringB = ring?.querySelector('[data-count-to]'), ringTo = +(ringB?.dataset.countTo || 0);
    const frames = [...document.querySelectorAll('.frames4 img')];
    const turns = document.querySelector('.turns'), turnList = turns ? turns.dataset.turns.split('|') : [];
    const turnPill = turns?.querySelector('.turns__pill'), turnB = turnPill?.querySelector('b');
    const flip = (pill, b, text) => { b.textContent = text; pill.classList.remove('is-flip'); void pill.offsetWidth; pill.classList.add('is-flip'); };
    if (reduced) { if (ringB) { ringB.textContent = ringTo; ring.style.setProperty('--p', 100); } frames[0]?.classList.add('is-worn'); return; }
    const visible = new Set();
    let timer = 0, tick = 0;
    const step = () => {
      tick++;
      const on = (el) => el && visible.has(el.closest('[data-loop]'));
      if (on(lang) && tick % 14 === 0) flip(langPill, langB, langs[(tick / 14) % langs.length]);
      if (on(ring)) { // 0 -> 48 bolts over ~2.6 s, hold, restart
        const t = tick % 44, k = Math.min(1, t / 26), e = 1 - (1 - k) ** 3;
        ringB.textContent = Math.round(ringTo * e); ring.style.setProperty('--p', (e * 100).toFixed(1));
      }
      if (on(frames[0]) && tick % 12 === 0) frames.forEach((f, i) => f.classList.toggle('is-worn', i === (tick / 12) % frames.length));
      if (on(turns) && tick % 16 === 0) {
        const s = turnList[(tick / 16) % turnList.length];
        flip(turnPill, turnB, s); turnPill.classList.toggle('is-wait', /^Waiting/.test(s));
      }
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { e.target.classList.toggle('is-on', e.isIntersecting); e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      if (visible.size && !timer) timer = setInterval(step, 100);
      else if (!visible.size && timer) { clearInterval(timer); timer = 0; }
    }, { threshold: 0.25 });
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
