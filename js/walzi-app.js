/* ==========================================================================
   Walzi — app landing page interactions (apps/walzi.html)
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---- Entrance animations ----
  const animEls = $$('[data-anim], .wz-steps');
  if (hasIO && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    animEls.forEach((el) => io.observe(el));
  } else {
    animEls.forEach((el) => el.classList.add('in'));
  }

  // ---- Videos: play only while on screen (saves data + battery) ----
  const small = () => window.innerWidth < 640;
  const videos = $$('video[data-auto]');
  if (hasIO) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting && !reduceMotion && !(v.dataset.auto === 'desktop' && small())) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    videos.forEach((v) => vio.observe(v));
  }

  // ---- Hero headline: rotating audience ----
  const rot = $('.wz-rotate');
  if (rot) {
    const words = $$('span', rot);
    let i = 0;
    // Words are stacked absolutely, so the wrapper takes the current word's width
    const fit = () => { rot.style.width = `${words[i].offsetWidth}px`; };
    words[0].classList.add('on');
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts) document.fonts.ready.then(fit);
    if (!reduceMotion) {
      setInterval(() => {
        const cur = words[i];
        cur.classList.remove('on'); cur.classList.add('out');
        setTimeout(() => cur.classList.remove('out'), 700);
        i = (i + 1) % words.length;
        words[i].classList.add('on');
        fit();
      }, 2600);
    }
  }

  // ---- Hero phones follow the cursor ----
  const stage = $('.wz-stage-inner');
  if (stage && finePointer && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      if (window.scrollY > window.innerHeight) return;
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      stage.style.transform = `rotateY(${x * 14}deg) rotateX(${y * -10}deg)`;
    }, { passive: true });
  }

  // ---- Promo player: grows as it scrolls into view, progress bar, play/pause ----
  const promoWrap = $('.wz-promo-wrap');
  const promo = $('.wz-promo video');
  const promoBtn = $('.wz-promo-btn');
  const promoBar = $('.wz-promo-bar');
  if (promo) {
    promo.addEventListener('timeupdate', () => {
      if (promoBar && promo.duration) promoBar.style.transform = `scaleX(${promo.currentTime / promo.duration})`;
    });
    const sync = () => { if (promoBtn) promoBtn.innerHTML = promo.paused ? '▶&nbsp; Play' : '❚❚&nbsp; Pause'; };
    promo.addEventListener('play', sync);
    promo.addEventListener('pause', sync);
    const toggle = () => { promo.paused ? promo.play().catch(() => {}) : promo.pause(); };
    if (promoBtn) promoBtn.addEventListener('click', toggle);
    promo.addEventListener('click', toggle);
  }
  $$('[data-watch]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = $('#wz-promo');
    sec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    if (promo) { promo.currentTime = 0; promo.play().catch(() => {}); }
  }));

  // ---- Scroll-linked effects ----
  const bar = $('.wz-progress');
  const sticky = $('.wz-sticky');
  const hero = $('.wz-hero');
  const finalCta = $('.wz-final');
  const footer = $('#footer');

  function onScroll() {
    const h = document.documentElement;
    const y = window.scrollY;
    const vh = window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;

    if (promoWrap && !reduceMotion) {
      const r = promoWrap.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      promoWrap.style.transform = `perspective(1400px) rotateX(${(1 - p) * 22}deg) scale(${0.82 + p * 0.18})`;
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

  // ---- Feature cards + reels: subtle 3D tilt ----
  if (finePointer && !reduceMotion) {
    $$('.wz-reel, .wz-feat').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${y * -10}deg) translateY(-8px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // ---- Screenshot wall: tap to open in the site lightbox ----
  if (typeof window.openLightbox === 'function') {
    $$('.wz-row img').forEach((img) => img.addEventListener('click', () => window.openLightbox(img.src)));
  }
})();
