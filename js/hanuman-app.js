/* ==========================================================================
   Hanuman Dham — app landing page interactions (apps/hanuman-chalisa.html)
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---- Scroll progress bar ----
  const bar = $('.hd-progress');
  // ---- Parallax targets ----
  const heroMedia = $('.hd-hero-media');
  const ctaBg = $('.hd-cta-bg');
  let mouseX = 0, mouseY = 0;

  function onScroll() {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (reduceMotion) return;
    const y = window.scrollY;
    if (heroMedia && y < window.innerHeight * 1.2) {
      heroMedia.style.transform = `translate3d(${mouseX * -14}px, ${y * 0.3 + mouseY * -10}px, 0)`;
    }
    if (ctaBg) {
      const r = ctaBg.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        ctaBg.style.transform = `translate3d(0, ${(r.top - window.innerHeight / 2) * -0.15}px, 0)`;
      }
    }
    litDoha();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- Cursor aura + hero mouse parallax ----
  if (finePointer && !reduceMotion) {
    const aura = $('.hd-aura');
    window.addEventListener('pointermove', (e) => {
      if (aura) {
        aura.classList.add('on');
        aura.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
      if (window.scrollY < window.innerHeight) onScroll();
    }, { passive: true });
  }

  // ---- Varied entrance animations ----
  const animEls = $$('[data-anim]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    // A fully clipped element never reports as intersecting, so "wipe" items are
    // watched through their parent and revealed together.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const t = e.target;
        if (t.dataset.anim) t.classList.add('in');
        else $$(':scope > [data-anim="wipe"]', t).forEach((c) => c.classList.add('in'));
        io.unobserve(t);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    const watched = new Set();
    animEls.forEach((el) => {
      const t = el.dataset.anim === 'wipe' ? el.parentElement : el;
      if (!watched.has(t)) { watched.add(t); io.observe(t); }
    });
  } else {
    animEls.forEach((el) => el.classList.add('in'));
  }

  // ---- Hero title: split into letters, then settle into a gold shimmer ----
  $$('.hd-h1 [data-split]').forEach((line) => {
    const text = line.textContent;
    if (reduceMotion) { if (line.classList.contains('l1')) line.classList.add('hd-gold-text'); return; }
    line.textContent = '';
    let i = 0;
    text.split(' ').forEach((word, wi) => {
      if (wi) line.appendChild(document.createTextNode(' '));
      const wd = document.createElement('span');
      wd.className = 'wd';
      [...word].forEach((c) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--i', i++);
        s.textContent = c;
        wd.appendChild(s);
      });
      line.appendChild(wd);
    });
    if (line.classList.contains('l1')) {
      setTimeout(() => { line.textContent = text; line.classList.add('hd-gold-text'); }, 350 + text.length * 55 + 1000);
    }
  });

  // ---- Hero verse rotator ----
  const rot = $('.hd-verse-rotator');
  if (rot) {
    const lines = $$('span', rot);
    let idx = 0;
    lines[0].classList.add('on');
    if (!reduceMotion && lines.length > 1) {
      setInterval(() => {
        const cur = lines[idx];
        cur.classList.remove('on'); cur.classList.add('out');
        setTimeout(() => cur.classList.remove('out'), 1000);
        idx = (idx + 1) % lines.length;
        lines[idx].classList.add('on');
      }, 3800);
    }
  }

  // ---- Hero video: sound toggle + pause when off-screen ----
  const video = $('.hd-hero-media video');
  const soundBtn = $('.hd-sound');
  if (video) {
    if (reduceMotion) video.removeAttribute('autoplay'), video.pause();
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const on = video.muted;
        video.muted = !on;
        if (on) { video.volume = 0.6; video.play().catch(() => {}); }
        soundBtn.setAttribute('aria-pressed', String(on));
        soundBtn.querySelector('.hd-sound-label').textContent = on ? 'Sound on' : 'Sound off';
      });
    }
    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
      }, { threshold: 0.05 }).observe(video);
    }
  }

  // ---- Particle canvas helper (embers rise, petals fall) ----
  function particles(canvas, opts) {
    if (!canvas || reduceMotion) return null;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, list = [], running = false, raf = 0;
    const colors = opts.colors;

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function make(initial) {
      const petal = opts.type === 'petal';
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : (petal ? -20 : h + 10),
        r: petal ? 5 + Math.random() * 6 : 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * (petal ? 0.6 : 0.3),
        vy: petal ? 0.6 + Math.random() * 1.1 : -(0.25 + Math.random() * 0.8),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.05,
        sway: Math.random() * Math.PI * 2,
        life: Math.random(),
        c: colors[(Math.random() * colors.length) | 0],
      };
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      if (opts.type === 'ember') ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.sway += 0.02;
        p.x += p.vx + Math.sin(p.sway) * (opts.type === 'petal' ? 0.6 : 0.25);
        p.y += p.vy;
        p.rot += p.vr;
        if (opts.type === 'ember') {
          p.life += 0.01;
          const a = 0.35 + Math.abs(Math.sin(p.life * 3)) * 0.65;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `rgba(${p.c},${a})`);
          g.addColorStop(1, `rgba(${p.c},0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
          if (p.y < -20) list[i] = make(false);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.scale(1, 0.55 + Math.abs(Math.sin(p.sway)) * 0.45);
          ctx.fillStyle = `rgb(${p.c})`;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.25)';
          ctx.beginPath(); ctx.ellipse(-p.r * 0.3, -p.r * 0.15, p.r * 0.35, p.r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          if (p.y > h + 20) {
            if (opts.once) { list.splice(i, 1); i--; } else list[i] = make(false);
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (opts.once && !list.length) { running = false; ctx.clearRect(0, 0, w, h); return; }
      if (running) raf = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    if (!opts.once) for (let i = 0; i < opts.count; i++) list.push(make(true));
    const api = {
      start() { if (!running) { running = true; raf = requestAnimationFrame(draw); } },
      stop() { running = false; cancelAnimationFrame(raf); },
      burst(n) {
        for (let i = 0; i < n; i++) {
          const p = make(false);
          p.y = -20 - Math.random() * h * 0.6;
          p.vy = 1.2 + Math.random() * 2;
          list.push(p);
        }
        api.start();
      },
    };
    if (!opts.once && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? api.start() : api.stop())).observe(canvas);
    }
    return api;
  }

  const smallScreen = window.innerWidth < 640;
  particles($('.hd-embers'), { type: 'ember', count: smallScreen ? 26 : 55, colors: ['255,180,80', '255,140,40', '255,220,150'] });
  particles($('.hd-cta canvas'), { type: 'petal', count: smallScreen ? 18 : 34, colors: ['255,140,20', '255,170,30', '250,200,60', '230,90,20'] });
  const burst = particles($('.hd-burst'), { type: 'petal', once: true, colors: ['255,140,20', '255,170,30', '250,200,60', '230,90,20', '255,235,200'] });

  // ---- Scroll-lit doha (words glow as you scroll) ----
  const doha = $('.hd-doha');
  let dohaWords = [];
  if (doha) {
    const html = doha.innerHTML.split('<br>');
    doha.innerHTML = html.map((ln) => ln.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ')).join('<br>');
    dohaWords = $$('.w', doha);
    if (reduceMotion) dohaWords.forEach((w) => w.classList.add('lit'));
  }
  function litDoha() {
    if (!dohaWords.length) return;
    const r = doha.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.5)));
    const n = Math.round(p * dohaWords.length);
    dohaWords.forEach((w, i) => w.classList.toggle('lit', i < n));
  }

  // ---- 3D coverflow showcase ----
  const flow = $('.hd-flow');
  if (flow) {
    const items = $$('.hd-flow-item', flow);
    const cap = $('.hd-flow-cap');
    const dotsWrap = $('.hd-flow-dots');
    const n = items.length;
    let cur = 0, timer = 0;
    items.forEach(() => dotsWrap && dotsWrap.appendChild(document.createElement('i')));
    const dots = dotsWrap ? $$('i', dotsWrap) : [];

    function layout() {
      const narrow = window.innerWidth < 640;
      const step = narrow ? 120 : 190;
      items.forEach((el, i) => {
        let d = i - cur;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        const ad = Math.abs(d);
        el.style.transform = `translateX(${d * step}px) translateZ(${-ad * 160}px) rotateY(${d * -38}deg) scale(${ad === 0 ? 1.06 : 1})`;
        el.style.opacity = ad > 2 ? 0 : 1 - ad * 0.22;
        el.style.filter = ad === 0 ? 'none' : `brightness(${1 - ad * 0.25}) saturate(.85)`;
        el.style.zIndex = String(10 - ad);
        el.classList.toggle('center', ad === 0);
      });
      dots.forEach((d, i) => d.classList.toggle('on', i === cur));
      if (cap) cap.textContent = items[cur].dataset.cap || '';
    }
    function go(i) { cur = (i + n) % n; layout(); }
    function auto() { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => go(cur + 1), 3200); }

    $('.hd-flow-prev').addEventListener('click', () => { go(cur - 1); auto(); });
    $('.hd-flow-next').addEventListener('click', () => { go(cur + 1); auto(); });
    items.forEach((el, i) => el.addEventListener('click', () => { if (i !== cur) { go(i); auto(); } }));
    flow.addEventListener('mouseenter', () => clearInterval(timer));
    flow.addEventListener('mouseleave', auto);

    let sx = null;
    flow.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    window.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); auto(); }
    });
    window.addEventListener('resize', layout);
    layout(); auto();
  }

  // ---- Feature cards: cursor spotlight + 3D tilt ----
  if (finePointer && !reduceMotion) {
    $$('.hd-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    // Magnetic primary buttons
    $$('.hd-btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  // ---- Interactive Mantra Jaap mala (108 beads) ----
  const mala = $('.hd-mala');
  if (mala) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const g = $('.hd-beads', mala);
    const beads = [];
    const R = 172, C = 200;
    for (let i = 0; i < 108; i++) {
      const a = (i / 108) * Math.PI * 2 - Math.PI / 2 + (Math.PI * 2) / 216;
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', (C + R * Math.cos(a)).toFixed(2));
      c.setAttribute('cy', (C + R * Math.sin(a)).toFixed(2));
      c.setAttribute('r', '4.3');
      c.setAttribute('class', 'hd-bead');
      c.style.transformOrigin = `${c.getAttribute('cx')}px ${c.getAttribute('cy')}px`;
      g.appendChild(c);
      beads.push(c);
    }
    const progress = $('.hd-mala-progress', mala);
    const len = 2 * Math.PI * 150;
    progress.style.strokeDasharray = len;
    progress.style.strokeDashoffset = len;

    const tap = $('.hd-tap', mala);
    const word = $('.hd-tap-word', mala);
    const countEl = $('.hd-tap-count', mala);
    const done = $('.hd-complete', mala);
    const malasEl = $('[data-malas]');
    const totalEl = $('[data-total]');
    const soundToggle = $('[data-bell]');
    let count = 0, malas = 0, total = 0, bellOn = true, actx = null;

    function bell() {
      if (!bellOn) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const t = actx.currentTime;
        const out = actx.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        out.connect(actx.destination);
        [[880, 1], [1320, 0.5], [2211, 0.25], [2960, 0.12]].forEach(([f, v]) => {
          const o = actx.createOscillator(), gg = actx.createGain();
          o.type = 'sine'; o.frequency.value = f; gg.gain.value = v;
          o.connect(gg); gg.connect(out); o.start(t); o.stop(t + 1.7);
        });
      } catch (e) { /* audio not available */ }
    }

    function render() {
      beads.forEach((b, i) => {
        b.classList.toggle('done', i < count);
        b.classList.remove('now');
      });
      if (count > 0) { const b = beads[count - 1]; void b.getBoundingClientRect(); b.classList.add('now'); }
      progress.style.strokeDashoffset = len * (1 - count / 108);
      countEl.textContent = count;
      if (malasEl) malasEl.textContent = malas;
      if (totalEl) totalEl.textContent = total;
    }

    tap.addEventListener('click', (e) => {
      count++; total++;
      const r = tap.getBoundingClientRect();
      const rip = document.createElement('span');
      rip.className = 'hd-ripple';
      rip.style.left = `${(e.clientX || r.left + r.width / 2) - r.left}px`;
      rip.style.top = `${(e.clientY || r.top + r.height / 2) - r.top}px`;
      tap.appendChild(rip);
      setTimeout(() => rip.remove(), 800);

      const fw = document.createElement('span');
      fw.className = 'hd-float-word';
      fw.textContent = word.textContent;
      fw.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
      mala.appendChild(fw);
      setTimeout(() => fw.remove(), 1400);

      if (navigator.vibrate) navigator.vibrate(12);
      bell();
      if (count >= 108) {
        malas++;
        render();
        done.classList.add('show');
        if (burst) burst.burst(smallScreen ? 70 : 140);
        setTimeout(() => { count = 0; render(); }, 1200);
        setTimeout(() => done.classList.remove('show'), 4200);
        return;
      }
      render();
    });

    $$('.hd-mantras button').forEach((b) => {
      b.addEventListener('click', () => {
        $$('.hd-mantras button').forEach((x) => x.classList.toggle('on', x === b));
        word.textContent = b.dataset.word;
      });
    });
    const reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', () => { count = 0; render(); });
    if (soundToggle) soundToggle.addEventListener('click', () => {
      bellOn = !bellOn;
      soundToggle.textContent = bellOn ? '🔔 Bell on' : '🔕 Bell off';
    });
    render();
  }

  onScroll();
})();
