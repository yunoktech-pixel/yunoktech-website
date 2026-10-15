/* ==========================================================================
   Android & AI blog: copy buttons, active TOC link, in-view diagram
   animation (skipped under reduced motion) and hub search.
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Copy buttons on code blocks ----
  document.querySelectorAll('.code .copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code').querySelector('code');
      const done = (label) => { btn.textContent = label; setTimeout(() => { btn.textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code.innerText).then(() => done('Copied'), () => done('Press Ctrl+C'));
      else done('Press Ctrl+C');
    });
  });

  // ---- Highlight the current section in the sidebar TOC ----
  const tocLinks = Array.from(document.querySelectorAll('.ad-toc a'));
  if (tocLinks.length) {
    const heads = tocLinks.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    let ticking = false;
    const update = () => {
      ticking = false;
      let cur = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < 130) cur = i; });
      tocLinks.forEach((a, i) => a.classList.toggle('on', i === cur));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ---- Diagrams: play once when scrolled into view, with a replay button ----
  const animated = document.querySelectorAll('.diagram[data-animate]');
  if (animated.length && !reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('play'); io.unobserve(e.target); }
    }), { threshold: 0.35 });
    animated.forEach((fig) => {
      fig.classList.add('anim-ready');
      io.observe(fig);
      const cap = fig.querySelector('figcaption');
      if (cap) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'replay';
        btn.textContent = '↻ Replay';
        btn.setAttribute('aria-label', 'Replay diagram animation');
        btn.addEventListener('click', () => { fig.classList.remove('play'); void fig.offsetWidth; fig.classList.add('play'); });
        cap.appendChild(btn);
      }
    });
  }

  // ---- Share ----
  document.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.share;
      const url = location.href;
      const title = document.title;
      if (kind === 'copy') {
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { btn.textContent = 'Link copied'; });
      } else if (kind === 'native' && navigator.share) {
        navigator.share({ title, url }).catch(() => {});
      }
    });
  });

  // ---- Hub: collapse long category lists behind a "Show all" button ----
  const lists = Array.from(document.querySelectorAll('.hub-list[data-preview]'));
  lists.forEach((ul) => {
    const total = ul.children.length;
    const limit = parseInt(ul.dataset.preview, 10) || 6;
    if (total <= limit) return;
    Array.from(ul.children).forEach((li, i) => { if (i >= limit) li.classList.add('extra'); });
    ul.classList.add('collapsed');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hub-more';
    btn.setAttribute('aria-expanded', 'false');
    const label = () => {
      const open = !ul.classList.contains('collapsed');
      btn.textContent = open ? 'Show fewer ↑' : `Show all ${total} articles ↓`;
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => { ul.classList.toggle('collapsed'); label(); });
    label();
    ul.after(btn);
  });

  // ---- Hub search ----
  const search = document.querySelector('[data-hub-search]');
  if (search) {
    const items = Array.from(document.querySelectorAll('[data-topic]'));
    const empty = document.querySelector('.hub-empty');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      // While searching, show every match (ignore the collapsed previews)
      document.body.classList.toggle('hub-searching', !!q);
      let shown = 0;
      items.forEach((li) => {
        const hit = !q || li.dataset.topic.includes(q);
        li.hidden = !hit;
        if (hit) shown++;
      });
      document.querySelectorAll('.hub-sec[data-cat]').forEach((sec) => {
        sec.hidden = !!q && !sec.querySelector('[data-topic]:not([hidden])');
      });
      if (empty) empty.style.display = shown ? 'none' : 'block';
    });
  }
})();
