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
  if (reduced) { document.querySelector('.fab').classList.add('is-on'); words.forEach((w) => w.classList.add('is-lit')); document.querySelectorAll('.tl__item').forEach((i) => i.classList.add('is-on')); document.querySelector('.tl')?.style.setProperty('--fill', 1); return; }
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
  const cards = [...document.querySelectorAll('.stack__card')], rows = [...document.querySelectorAll('.row')];
  const tl = document.querySelector('.tl'), items = [...document.querySelectorAll('.tl__item')];
  const fab = document.querySelector('.fab');
  let raf = 0, litN = -1;
  const frame = () => {
    raf = 0;
    const VH = innerHeight;
    fab.classList.toggle('is-on', scrollY > VH * 0.7); // back-to-top appears once the hero is behind you
    // mission: words light up as the paragraph travels up the screen
    if (mission) {
      const r = mission.getBoundingClientRect();
      if (r.bottom > -VH && r.top < VH * 2) {
        const n = Math.round(words.length * cl((VH * 0.82 - r.top) / (r.height + VH * 0.35)));
        if (n !== litN) { words.forEach((w, i) => w.classList.toggle('is-lit', i < n)); litN = n; }
      }
    }
    // cast: placeholders drift against the scroll
    for (const f of floats) {
      const r = f.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > VH + 200) continue;
      f.el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - VH / 2) * f.d).toFixed(1)}px, 0)`;
    }
    // the sheet: each row's art card slides up over the last one as that row reaches the middle
    if (cards.length && getComputedStyle(cards[0].parentElement).display !== 'none') {
      const k = rows.map((row, i) => (i === 0 ? 1 : io3(cl((VH * 0.85 - row.getBoundingClientRect().top) / (VH * 0.5)))));
      cards.forEach((c, i) => {
        const next = k[i + 1] || 0;
        c.style.transform = `translate3d(0, ${((1 - k[i]) * 150 - next * 4).toFixed(2)}%, 0) rotate(${((1 - k[i]) * 7).toFixed(2)}deg) scale(${(1 - next * 0.06).toFixed(3)})`;
        c.style.opacity = cl(k[i] * 2.5).toFixed(3); // the next card waits off stage until its row arrives
        c.style.filter = next ? `brightness(${(1 - next * 0.12).toFixed(3)})` : '';
      });
    }
    // rounds: the line fills to the middle of the screen; every round it has reached lights up
    if (tl) {
      const r = tl.getBoundingClientRect();
      if (r.bottom > -VH && r.top < VH * 2) {
        tl.style.setProperty('--fill', cl((VH * 0.6 - r.top) / r.height).toFixed(4));
        items.forEach((it) => { const b = it.getBoundingClientRect(); it.classList.toggle('is-on', b.top + b.height / 2 < VH * 0.62); });
      }
    }
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(frame); });
  frame();
})();
