/* ==========================================================================
   NotiVault — app landing page interactions (apps/notivault.html)
   All notifications below are made-up samples for the demos.
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const POOL = [
    { ic: '💬', c: 'chat', app: 'ChatNova', t: 'Michelle', x: 'Can we reschedule our meeting?' },
    { ic: '🏦', c: 'bank', app: 'Bankly', t: 'Your OTP is 482913', x: 'Valid for 10 minutes. Do not share.' },
    { ic: '✉️', c: 'mail', app: 'QuickMail', t: 'Project Update', x: 'New updates available for your project' },
    { ic: '📦', c: 'shop', app: 'ShopEasy', t: 'Order Delivered', x: 'Your package has been delivered' },
    { ic: '✅', c: 'task', app: 'TaskMaster', t: 'Task Due Today', x: 'Submit your report before deadline' },
    { ic: '❤️', c: 'social', app: 'SocialSync', t: 'John liked your photo', x: 'Nice picture!' },
    { ic: '🏃', c: 'fit', app: 'FitnessApp', t: 'Goal reached!', x: 'You walked 12,000 steps today' },
    { ic: '🏷️', c: 'deal', app: 'Deals Hub', t: 'Flash Sale', x: 'Get 30% off today only!' },
    { ic: '💬', c: 'chat', app: 'WorkChat', t: 'Meeting Reminder', x: 'Team meeting starts at 10:00 AM' },
    { ic: '🏦', c: 'bank', app: 'Bankly', t: 'Payment Alert', x: '₹2,500 debited successfully' },
  ];
  const TIMES = ['now', '1m ago', '3m ago', '5m ago', '12m ago', '20m ago', '45m ago', '1h ago', '2h ago', 'Yesterday'];

  function noteEl(n, time, extra) {
    const el = document.createElement('div');
    el.className = 'nv-note';
    el.innerHTML = `<span class="ic ic-${n.c}">${n.ic}</span><div class="bd"><div class="ap"><span>${n.app}</span><span>${time}</span></div><div class="tt">${n.t}</div><div class="tx">${n.x}</div></div>${extra || ''}`;
    return el;
  }

  // ---- Entrance animations ----
  const animEls = $$('[data-anim]');
  if (hasIO && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    animEls.forEach((el) => io.observe(el));
  } else animEls.forEach((el) => el.classList.add('in'));

  // Run fn while el is on screen; stop it when off screen
  function whileVisible(el, start, stop) {
    if (!el) return;
    if (!hasIO) { start(); return; }
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(el);
  }

  // ---- Hero: typed line ----
  const typed = $('.nv-typed');
  if (typed) {
    const lines = JSON.parse(typed.dataset.lines);
    if (reduceMotion) typed.textContent = lines[0];
    else {
      let li = 0, ci = 0, del = false;
      (function tick() {
        const full = lines[li];
        ci += del ? -1 : 1;
        typed.textContent = full.slice(0, ci);
        let wait = del ? 28 : 55;
        if (!del && ci === full.length) { del = true; wait = 1800; }
        else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 300; }
        setTimeout(tick, wait);
      })();
    }
  }

  // ---- Hero phone: live feed ----
  const feed = $('.nv-feed');
  if (feed) {
    const heads = $('.nv-headsup');
    const bell = $('.nv-apphead .bell');
    const countEl = $('.nv-count b');
    const pill = $('.nv-saved-pill');
    let k = 0, total = 45, timer = 0, cycle = 0;
    for (let i = 3; i >= 0; i--) feed.appendChild(noteEl(POOL[i], TIMES[i + 1]));
    k = 4;
    function step() {
      const n = POOL[k++ % POOL.length];
      heads.innerHTML = '';
      heads.appendChild(noteEl(n, 'now'));
      heads.classList.add('show');
      bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring');
      setTimeout(() => {
        heads.classList.remove('show');
        const el = noteEl(n, 'now');
        el.classList.add('new');
        feed.prepend(el);
        $$('.nv-note', feed).slice(1).forEach((x, i) => { x.classList.remove('new'); x.querySelector('.ap span:last-child').textContent = TIMES[i + 1]; });
        while (feed.children.length > 7) feed.lastChild.remove();
        countEl.textContent = ++total;
        if (++cycle % 3 === 0 && pill) { pill.classList.add('show'); setTimeout(() => pill.classList.remove('show'), 2200); }
      }, 1500);
    }
    if (!reduceMotion) whileVisible(feed, () => { if (!timer) timer = setInterval(step, 3200); }, () => { clearInterval(timer); timer = 0; });
  }

  // ---- Swipe demo: dismiss → saved in the vault ----
  const shade = $('.nv-shade');
  if (shade) {
    const vault = $('.nv-vault-list');
    const vaultEmpty = $('.nv-vault-empty');
    const badge = $('[data-recovered]');
    const empty = $('.nv-empty');
    const hand = $('.nv-hand');
    let src = 0, saved = 0;

    function fill() {
      empty.classList.remove('show');
      for (let i = 0; i < 4; i++) {
        const n = POOL[src++ % POOL.length];
        const el = noteEl(n, TIMES[i], '<button type="button" class="nv-x" aria-label="Dismiss notification">✕</button>');
        el._n = n;
        shade.appendChild(el);
        bind(el);
      }
    }
    function dismiss(el) {
      if (el.classList.contains('gone')) return;
      if (hand) hand.remove();
      const r = el.getBoundingClientRect();
      const target = vault.getBoundingClientRect();
      el.classList.add('gone');
      if (!reduceMotion) {
        const fly = document.createElement('div');
        fly.className = 'nv-fly';
        fly.textContent = '🔒 Saved';
        fly.style.left = `${r.left + r.width / 2 - 40}px`;
        fly.style.top = `${r.top + r.height / 2 - 14}px`;
        document.body.appendChild(fly);
        requestAnimationFrame(() => {
          fly.style.transform = `translate(${target.left + 40 - r.left - r.width / 2}px, ${target.top + 10 - r.top - r.height / 2}px) scale(.8)`;
          fly.style.opacity = '0.2';
        });
        setTimeout(() => fly.remove(), 820);
      }
      setTimeout(() => {
        el.remove();
        vaultEmpty.style.display = 'none';
        vault.prepend(noteEl(el._n, 'saved', '<span class="rec">✓ Recovered</span>'));
        while (vault.children.length > 4) vault.lastChild.remove();
        badge.textContent = `${++saved} recovered`;
        if (!shade.querySelector('.nv-note')) empty.classList.add('show');
      }, reduceMotion ? 0 : 450);
    }
    function bind(el) {
      el.querySelector('.nv-x').addEventListener('click', () => dismiss(el));
      let x0 = null, dx = 0;
      el.addEventListener('pointerdown', (e) => { if (e.target.closest('.nv-x')) return; x0 = e.clientX; dx = 0; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
      el.addEventListener('pointermove', (e) => { if (x0 === null) return; dx = e.clientX - x0; el.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`; el.style.opacity = String(1 - Math.min(Math.abs(dx) / 300, 0.6)); });
      const end = () => {
        if (x0 === null) return;
        x0 = null; el.style.transition = ''; el.style.opacity = '';
        if (Math.abs(dx) > 80) dismiss(el); else el.style.transform = '';
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
    $('.nv-empty button').addEventListener('click', fill);
    fill();
  }

  // ---- Search demo ----
  const results = $('.nv-results');
  if (results) {
    const input = $('.nv-input input');
    const count = $('.nv-input span:last-child');
    const none = $('.nv-noresult');
    const items = POOL.map((n, i) => { const el = noteEl(n, TIMES[i]); el._n = n; results.appendChild(el); return el; });
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let touched = false;

    function run() {
      const q = input.value.trim();
      const re = q ? new RegExp(`(${esc(q)})`, 'ig') : null;
      let shown = 0;
      items.forEach((el) => {
        const n = el._n;
        const hit = !re || [n.app, n.t, n.x].some((s) => s.toLowerCase().includes(q.toLowerCase()));
        el.classList.toggle('hide', !hit);
        if (hit) shown++;
        const mk = (s) => (re ? s.replace(re, '<mark>$1</mark>') : s);
        el.querySelector('.ap span').innerHTML = mk(n.app);
        el.querySelector('.tt').innerHTML = mk(n.t);
        el.querySelector('.tx').innerHTML = mk(n.x);
      });
      count.textContent = `${shown} found`;
      none.style.display = shown ? 'none' : 'block';
      $$('.nv-chips button').forEach((b) => b.classList.toggle('on', b.textContent.toLowerCase() === q.toLowerCase()));
    }
    input.addEventListener('input', () => { touched = true; run(); });
    $$('.nv-chips button').forEach((b) => b.addEventListener('click', () => { touched = true; input.value = b.textContent; run(); }));
    run();

    // Type a sample query once, the first time the demo is seen
    if (hasIO && !reduceMotion) {
      const so = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        so.disconnect();
        const word = 'OTP';
        let i = 0;
        const t = setInterval(() => {
          if (touched) return clearInterval(t);
          input.value = word.slice(0, ++i); run();
          if (i === word.length) clearInterval(t);
        }, 260);
      }, { threshold: 0.6 });
      so.observe(results);
    }
  }

  // ---- Feature cards ----
  $$('.nv-toggle').forEach((b) => b.addEventListener('click', () => {
    const card = b.closest('.nv-card');
    card.classList.toggle('light');
    b.setAttribute('aria-pressed', String(card.classList.contains('light')));
  }));
  function cycle(sel, ms) {
    const wrap = $(sel);
    if (!wrap) return;
    const kids = $$('span', wrap);
    let i = 0;
    kids[0].classList.add('on');
    if (reduceMotion) return;
    let t = 0;
    whileVisible(wrap, () => { if (!t) t = setInterval(() => { kids[i].classList.remove('on'); i = (i + 1) % kids.length; kids[i].classList.add('on'); }, ms); }, () => { clearInterval(t); t = 0; });
  }
  cycle('.nv-days', 1400);
  cycle('.nv-lang', 1500);

  // ---- Scroll: progress, screenshot fan, sticky CTA ----
  const bar = $('.nv-progress');
  const fan = $('.nv-fan');
  const fanImgs = fan ? $$('img', fan) : [];
  const sticky = $('.nv-sticky');
  const hero = $('.nv-hero');
  const finalCta = $('.nv-final');
  const footer = $('#footer');

  function onScroll() {
    const h = document.documentElement;
    const vh = window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;

    if (fan && window.innerWidth > 900) {
      const r = fan.getBoundingClientRect();
      const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.8)));
      const mid = (fanImgs.length - 1) / 2;
      fanImgs.forEach((img, i) => {
        const d = i - mid;
        img.style.transform = `translateX(${d * p * 215}px) translateY(${Math.abs(d) * p * 34}px) rotate(${d * p * 7}deg)`;
        img.style.zIndex = String(10 - Math.abs(d));
      });
    }

    if (sticky && hero) {
      const pastHero = hero.getBoundingClientRect().bottom < 80;
      const nearEnd = (finalCta && finalCta.getBoundingClientRect().top < vh * 0.9) ||
                      (footer && footer.getBoundingClientRect().top < vh);
      sticky.classList.toggle('show', pastHero && !nearEnd);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (typeof window.openLightbox === 'function') {
    fanImgs.forEach((img) => img.addEventListener('click', () => window.openLightbox(img.src)));
  }
})();
