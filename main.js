// Letter Legends one-pager. No libraries.
(() => {
  // ── Stores ─────────────────────────────────────────────────────────────────────────────────────
  // The ONE launch switch. While a store is false its badge shows "Coming soon" and links nowhere
  // (neither listing is public yet; both URLs 404 today). Flip each to true the day it goes public.
  // 404.html (the /i/<code> invite page) has its own APP_STORE_LIVE for the same day.
  const STORES = {
    ios: { live: false, url: 'https://apps.apple.com/app/id6785250916' },
    android: { live: false, url: 'https://play.google.com/store/apps/details?id=com.glitchyard.letterlegends' },
  };
  document.querySelectorAll('[data-stores]').forEach((group) => {
    let anyLive = false;
    group.querySelectorAll('[data-store]').forEach((a) => {
      const s = STORES[a.dataset.store];
      if (s?.live) { a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; anyLive = true; }
      else { a.setAttribute('aria-disabled', 'true'); a.title = 'Coming soon'; }
    });
    group.classList.toggle('is-soon', !Object.values(STORES).every((s) => s.live));
    const soon = group.querySelector('[data-soon]');
    if (soon && anyLive) soon.textContent = STORES.ios.live ? 'Coming soon to Android' : 'Coming soon to iPhone';
  });
  // the top-bar CTA scrolls to the badges either way
  if (Object.values(STORES).some((s) => s.live)) document.querySelector('.bar__cta').textContent = 'Download free';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  document.documentElement.classList.add('js');

  // ── Arrival fade ───────────────────────────────────────────────────────────────────────────────
  // Every piece of content (never the floating props) fades in as it arrives: from below while
  // scrolling down, from above while scrolling back up. It resets once fully off screen so it plays
  // on every arrival. Pieces in one group stagger.
  let lastY = scrollY, dir = 1;
  addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; } }, { passive: true });
  const groups = [
    ['.hero__tag', '.rack--hero', '.hero .stores'],
    ['.plays .rack--small', '.plays .h2', ...[...document.querySelectorAll('.step')]],
    ['.legends .kicker', '.legends .h2', '.legends .lede', ...document.querySelectorAll('.legend')],
    ['.feats .kicker', '.feats .h2', ...document.querySelectorAll('.card'), '.langs'],
    ['.get .h2', '.get .lede', '.get .stores'],
    ['.foot__brand', '.foot__links', '.foot__note'],
  ].map((g) => g.map((q) => (typeof q === 'string' ? document.querySelector(q) : q)).filter(Boolean));
  // a vertical offset never pushes a piece out of view sideways, and rootMargin absorbs the 40px it adds
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const el = e.target;
    if (e.isIntersecting && !el.classList.contains('is-in')) {
      el.style.setProperty('--fx-y', `${dir > 0 ? 40 : -40}px`);
      void el.offsetWidth; // commit the start side before the transition begins (once per arrival)
      el.classList.add('is-in');
    } else if (!e.isIntersecting) el.classList.remove('is-in');
  }), { rootMargin: '-6% 0px -6% 0px' });
  groups.forEach((g) => {
    // pieces sharing a row stagger left to right; a new row restarts the count
    let row = -1, rowTop = null;
    g.forEach((el) => {
      const t = el.offsetTop;
      if (rowTop === null || Math.abs(t - rowTop) > 30) { rowTop = t; row = 0; } else row++;
      el.classList.add('fx');
      el.style.setProperty('--fx-d', `${Math.min(row * 0.08, 0.32).toFixed(2)}s`);
      io.observe(el);
    });
  });

  // ── Parallax props ─────────────────────────────────────────────────────────────────────────────
  // Each floating prop drifts against the scroll by its data-d. One transform per visible prop, and
  // the rAF only runs while the page is moving.
  const props = [...document.querySelectorAll('.fl')].map((el) => ({ el, d: parseFloat(el.dataset.d || '0'), sec: el.closest('section'), top: 0, h: 0 }));
  let VH = innerHeight, raf = 0;
  const measure = () => {
    VH = innerHeight;
    props.forEach((p) => { p.top = p.sec.offsetTop; p.h = p.sec.offsetHeight; });
    frame();
  };
  const frame = () => {
    raf = 0;
    const y = scrollY;
    for (const p of props) {
      const rel = y + VH / 2 - (p.top + p.h / 2); // 0 when the section's middle is mid-screen
      if (Math.abs(rel) > p.h / 2 + VH) continue;
      p.el.style.transform = `translate3d(0,${(rel * p.d).toFixed(1)}px,0)`;
    }
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); });
  addEventListener('load', measure);
  measure();
})();
