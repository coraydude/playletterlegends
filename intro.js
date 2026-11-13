// Intro: the logo slams onto the sky, then rises into the hero and the page fades in.
// Every motion comes from a small physics sim baked into Web Animations keyframes:
//   1. FALL   the logo comes at the screen from the camera: depth closes under gravity, so the
//             perspective scale (1 / (1 - depth)) accelerates exactly like a thrown object.
//   2. SLAM   on contact: a damped spring squashes and wobbles it (scaleY down, scaleX up, volume kept),
//             the tilt springs to level, the screen shakes, a shockwave ring and a burst of coins,
//             gems and tiles fly out under gravity, and its shadow lands.
//   3. RISE   a short anticipation dip, then it glides into the hero logo's exact box (FLIP) while
//             the sky layer fades, and the hero content follows it in.
// Skippable (tap / click / key / scroll). If anything goes wrong the page is simply revealed.
(() => {
  const root = document.documentElement;
  const intro = document.querySelector('.intro');
  if (!root.classList.contains('is-intro') || !intro) { intro?.remove(); return; }

  const logo = intro.querySelector('.intro__logo');
  const shake = intro.querySelector('.intro__shake');
  const ring = intro.querySelector('.intro__ring');
  const shadow = intro.querySelector('.intro__shadow');
  const bits = intro.querySelector('.intro__bits');
  const bg = intro.querySelector('.intro__bg');
  const target = document.querySelector('.hero__logo img');
  let done = false, rising = false;
  const live = [];
  const anim = (el, frames, opts) => { const a = el.animate(frames, { fill: 'forwards', ...opts }); live.push(a); return a; };

  // ── the reveal (also the failsafe path) ──
  const reveal = () => {
    if (done) return;
    done = true;
    root.classList.add('intro-done');
    root.classList.remove('intro-flying');
    root.classList.remove('is-intro');
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    intro.remove();
  };

  // ── 1 + 2: fall and slam ──
  const FALL = 440;                      // ms from launch to contact
  const fallFrames = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const depth = 0.7 * (1 - t * t);     // distance from the screen; gravity: closes as t²
    const s = 1 / (1 - depth);           // perspective scale (3.3x at launch)
    fallFrames.push({
      offset: t,
      transform: `translateY(${(-6 * depth).toFixed(2)}%) rotate(${(-11 * (1 - t * t)).toFixed(2)}deg) scale(${s.toFixed(4)})`,
      opacity: Math.min(1, t * 4),
      filter: `drop-shadow(0 14px 22px rgba(10,50,140,.3)) blur(${(depth * 7).toFixed(2)}px)`,
    });
  }

  // impact spring: squash amount q (scaleY = 1 - q, scaleX = 1 + .7q) and the last of the tilt
  const slamFrames = [];
  {
    const k = 430, c = 13.5, dt = 1 / 240;
    let q = 0, v = 4.4, r = -3.2, rv = 0;  // contact velocity; residual tilt
    const SLAM = 0.9;                       // seconds
    for (let i = 0, n = Math.round(SLAM / dt); i <= n; i++) {
      if (i % 4 === 0) slamFrames.push({
        offset: i / n,
        transform: `translateY(${(q * 6).toFixed(2)}%) rotate(${r.toFixed(3)}deg) scale(${(1 + 0.7 * q).toFixed(4)}, ${(1 - q).toFixed(4)})`,
      });
      v += (-k * q - c * v) * dt; q += v * dt;
      rv += (-260 * r - 16 * rv) * dt; r += rv * dt;
    }
    slamFrames[slamFrames.length - 1].transform = 'none';
  }

  // screen shake: damped sine, two axes
  const shakeFrames = [];
  for (let i = 0; i <= 30; i++) {
    const t = (i / 30) * 0.42, a = Math.exp(-t / 0.11);
    shakeFrames.push({ offset: i / 30, transform: `translate(${(13 * a * Math.sin(2 * Math.PI * 23 * t)).toFixed(2)}px, ${(9 * a * Math.sin(2 * Math.PI * 31 * t + 1)).toFixed(2)}px)` });
  }

  // burst: coins, gems and live tiles launched up and out from the contact line, under gravity
  const SRC = ['art/coin', 'art/gem', 'tiles/dog-w', 'art/coin', 'tiles/fox-k', 'art/gem', 'tiles/sunflower-g', 'art/coin',
    'tiles/cotton-candy-e', 'art/gem', 'tiles/hedgehog-n', 'art/coin', 'tiles/smore-s', 'art/gem', 'tiles/rubberduck-z', 'art/coin'];
  const pieces = SRC.map((s, i) => {
    const im = new Image(); im.src = `assets/${s}.webp`; im.alt = ''; im.decoding = 'async';
    bits.appendChild(im);
    const side = i % 2 ? 1 : -1, spread = (i >> 1) / (SRC.length / 2 - 1);  // 0..1 along each side
    const ang = -Math.PI / 2 + side * (0.25 + spread * 1.05);                // up, fanning out to the sides
    const h = (n) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;          // stable per-piece jitter
    return { im, ang: ang + Math.abs(h(1)) * 0.5 - 0.25, speed: 560 + Math.abs(h(2)) * 760, x0: side * (0.08 + Math.abs(h(3)) * 0.32),
      spin: side * (180 + Math.abs(h(4)) * 420), size: s.startsWith('tiles') ? 80 + Math.abs(h(5)) * 26 : 52 + Math.abs(h(5)) * 22 };
  });
  const burst = (unit) => pieces.forEach((p) => {
    p.im.style.width = `${(p.size * unit).toFixed(1)}px`;
    const frames = [], T = 1.15, g = 2600 * unit;
    let x = p.x0 * 600 * unit, y = 0, vx = Math.cos(p.ang) * p.speed * unit, vy = Math.sin(p.ang) * p.speed * unit;
    for (let i = 0; i <= 36; i++) {
      const t = (i / 36) * T;
      frames.push({ offset: i / 36, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(p.spin * t).toFixed(1)}deg) scale(${(0.5 + Math.min(1, t * 6) * 0.5).toFixed(3)})`,
        opacity: t < 0.05 ? t / 0.05 : t > T * 0.62 ? Math.max(0, 1 - (t - T * 0.62) / (T * 0.38)) : 1 });
      const dt = T / 36; vy += g * dt; vx *= 0.985; x += vx * dt; y += vy * dt;
    }
    anim(p.im, frames, { duration: T * 1000, easing: 'linear' });
  });

  // ── 3: rise into the hero ──
  const rise = (fast) => {
    if (rising || done) return;
    rising = true;
    root.classList.add('intro-flying');
    live.forEach((a) => a.finish());
    logo.getAnimations().forEach((a) => a.cancel());
    logo.style.opacity = '1';
    shake.getAnimations().forEach((a) => a.cancel());
    const from = logo.getBoundingClientRect(), to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = to.width / from.width;
    const D = fast ? 420 : 900;
    const go = logo.animate([
      { transform: 'none', offset: 0 },
      { transform: 'translateY(2.5%) scale(1.03, .97)', offset: fast ? 0.01 : 0.14 },   // anticipation
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, offset: 1 },
    ], { duration: D, easing: 'cubic-bezier(.55,0,.15,1)', fill: 'forwards' });
    shadow.animate([{ opacity: getComputedStyle(shadow).opacity }, { opacity: 0 }], { duration: D * 0.4, fill: 'forwards' });
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.7, delay: D * 0.3, easing: 'ease-out', fill: 'forwards' });
    // the hero content starts arriving while the logo is still travelling
    setTimeout(() => { root.classList.add('intro-done'); root.classList.remove('is-intro'); intro.style.pointerEvents = 'none'; }, D * 0.55);
    go.finished.then(reveal, reveal);
  };

  const skip = () => { if (!rising) rise(true); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((e) => addEventListener(e, skip, { once: true, passive: true }));

  // start once the logo is decoded (never wait more than 1.5 s for it)
  scrollTo(0, 0);
  Promise.race([logo.decode(), new Promise((r) => setTimeout(r, 1500))]).then(() => {
    if (done || rising) return;
    if (!logo.complete || !logo.naturalWidth) { reveal(); return; }
    const unit = logo.getBoundingClientRect().width / 600;
    anim(logo, fallFrames, { duration: FALL, easing: 'linear' });
    setTimeout(() => {
      if (rising || done) return;
      logo.style.opacity = '1';
      anim(logo, slamFrames, { duration: 900, easing: 'linear' });
      anim(shake, shakeFrames, { duration: 420, easing: 'linear' });
      anim(ring, [{ transform: 'scale(.35)', opacity: 0.95 }, { transform: 'scale(2.1)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.1,.7,.3,1)' });
      anim(shadow, [{ opacity: 0, transform: 'scaleX(.6)' }, { opacity: 1, transform: 'scaleX(1.12)', offset: 0.18 }, { opacity: 0.85, transform: 'none' }], { duration: 700, easing: 'ease-out' });
      burst(unit);
      setTimeout(() => rise(false), 1250);
    }, FALL);
  }, reveal);
  setTimeout(reveal, 5500); // failsafe
})();
