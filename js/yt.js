/* ==========================================================================
   Yunok Tech — shared interactions for Home, Apps, Services & Course
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---- Entrance animations ----
  const animEls = $$('[data-anim], .yt-steps');
  if (hasIO && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    animEls.forEach((el) => io.observe(el));
  } else animEls.forEach((el) => el.classList.add('in'));

  // ---- Videos play only while visible ----
  const small = () => window.innerWidth < 640;
  if (hasIO) {
    const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting && !reduceMotion && !(v.dataset.auto === 'desktop' && small())) v.play().catch(() => {});
      else v.pause();
    }), { threshold: 0.2 });
    $$('video[data-auto]').forEach((v) => vio.observe(v));
  }

  // ---- Rotating word in hero headline ----
  $$('.yt-rotate').forEach((rot) => {
    const words = $$('span', rot);
    let i = 0;
    const fit = () => { rot.style.width = `${words[i].offsetWidth}px`; };
    words[0].classList.add('on');
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts) document.fonts.ready.then(fit);
    if (reduceMotion || words.length < 2) return;
    setInterval(() => {
      const cur = words[i];
      cur.classList.remove('on'); cur.classList.add('out');
      setTimeout(() => cur.classList.remove('out'), 700);
      i = (i + 1) % words.length;
      words[i].classList.add('on');
      fit();
    }, 2600);
  });

  // ---- Hero phones follow the cursor; cards get a spotlight + tilt ----
  if (finePointer && !reduceMotion) {
    const stage = $('.yt-stage-in');
    if (stage) {
      window.addEventListener('pointermove', (e) => {
        if (window.scrollY > window.innerHeight) return;
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        stage.style.transform = `rotateY(${x * 14}deg) rotateX(${y * -10}deg)`;
      }, { passive: true });
    }
    $$('.yt-card, .yt-path, .yt-app').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        el.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // ---- Scroll: progress bar + sticky CTA ----
  const bar = $('.yt-progress');
  const sticky = $('.yt-sticky');
  const hero = $('.yt-hero');
  const finalCta = $('.yt-final');
  const footer = $('#footer');
  function onScroll() {
    const h = document.documentElement;
    const vh = window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
    if (sticky && hero) {
      const past = hero.getBoundingClientRect().bottom < 80;
      const end = (finalCta && finalCta.getBoundingClientRect().top < vh * 0.9) || (footer && footer.getBoundingClientRect().top < vh);
      sticky.classList.toggle('show', past && !end);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Apps page: category filter ----
  const filter = $('.yt-filter');
  if (filter) {
    $$('button', filter).forEach((b) => b.addEventListener('click', () => {
      $$('button', filter).forEach((x) => x.classList.toggle('on', x === b));
      const cat = b.dataset.cat;
      $$('.yt-showcase').forEach((s) => s.classList.toggle('hide', cat !== 'all' && s.dataset.cat !== cat));
    }));
  }

  // ---- Course: Kotlin typed into the editor, then the phone preview "runs" it ----
  const typedCode = $('[data-typecode]');
  if (typedCode) {
    const src = $(typedCode.dataset.typecode);
    const html = src.innerHTML;
    const screen = $('.yt-mini-screen');
    const btn = screen && $('button', screen);
    let clicks = 0;
    if (btn) btn.addEventListener('click', () => { btn.textContent = `Clicked ${++clicks} time${clicks === 1 ? '' : 's'}`; });
    const done = () => { typedCode.innerHTML = html; if (screen) screen.classList.add('ready'); };
    if (reduceMotion || !hasIO) done();
    else {
      // Type the code character by character, keeping the syntax-highlight spans intact
      const tokens = html.match(/<[^>]+>|&[a-z]+;|[\s\S]/g);
      let i = 0, out = '';
      const step = () => {
        let n = 0;
        while (i < tokens.length && n < 3) {
          const t = tokens[i++];
          out += t;
          if (t[0] !== '<') n++;
        }
        typedCode.innerHTML = `${out}<span class="yt-caret"></span>`;
        if (i < tokens.length) setTimeout(step, 18);
        else setTimeout(done, 300);
      };
      const co = new IntersectionObserver(([e]) => { if (e.isIntersecting) { co.disconnect(); step(); } }, { threshold: 0.3 });
      typedCode.textContent = '';
      co.observe(typedCode);
    }
  }

  // ---- Services: app planner → WhatsApp message ----
  const planner = $('.yt-planner');
  if (planner) {
    const out = {
      type: $('[data-out="type"]'), feats: $('[data-out="feats"]'), plat: $('[data-out="plat"]'),
      scope: $('[data-out="scope"]'), bar: $('.yt-scope-bar i'),
    };
    const wa = $('[data-wa]');
    const mail = $('[data-mail]');
    const values = (name) => $$(`input[name="${name}"]:checked`, planner).map((i) => i.value);

    function update() {
      const type = values('type')[0] || 'Not chosen yet';
      const feats = values('feat');
      const plat = values('plat')[0] || 'Android app';
      const extra = (plat.includes('Website') ? 2 : 0) + (plat.includes('Android +') || plat.includes('iOS app') ? 1 : 0) + (plat.includes('Android + iOS') ? 1 : 0);
      const pts = feats.length + extra;
      const scope = pts <= 3 ? 'Starter' : pts <= 6 ? 'Standard' : 'Advanced';
      out.type.textContent = type;
      out.feats.textContent = feats.length ? feats.join(', ') : 'Pick a few features';
      out.plat.textContent = plat;
      out.scope.textContent = scope;
      out.bar.style.width = `${Math.min(100, 12 + pts * 9)}%`;
      const msg = `Hi Yunok Tech, I want to build an app.\n\nBusiness: ${type}\nPlatform: ${plat}\nFeatures: ${feats.join(', ') || 'Not sure yet'}\n\nPlease share the next steps.`;
      wa.href = `https://wa.me/919988200178?text=${encodeURIComponent(msg)}`;
      mail.href = `mailto:yunoktech@gmail.com?subject=${encodeURIComponent(`App enquiry: ${type}`)}&body=${encodeURIComponent(msg)}`;
    }
    planner.addEventListener('change', update);
    update();
  }

  // ---- Home hero: show one app at a time, switching every couple of seconds ----
  const show = $('.yt-show');
  if (show) {
    const MS = 2400;
    show.style.setProperty('--yt-show-ms', `${MS}ms`);
    const screens = $$('.yt-show-screen', show);
    const items = $$('.yt-show-item', show);
    const dots = $$('.yt-show-dots button', show);
    let cur = 0, timer = 0;
    const go = (n) => {
      const prev = cur;
      cur = (n + screens.length) % screens.length;
      if (prev !== cur) {
        screens[prev].classList.remove('on'); screens[prev].classList.add('out'); screens[prev].tabIndex = -1;
        setTimeout(() => screens[prev].classList.remove('out'), 800);
      }
      screens[cur].classList.add('on'); screens[cur].tabIndex = 0;
      items.forEach((it, i) => it.classList.toggle('on', i === cur));
      dots.forEach((d, i) => {
        d.classList.remove('on');
        d.classList.toggle('done', i < cur);
        if (i === cur) { void d.offsetWidth; d.classList.add('on'); }
      });
      show.style.setProperty('--ac', screens[cur].dataset.ac);
    };
    const start = () => { if (!timer && !reduceMotion) timer = setInterval(() => go(cur + 1), MS); };
    const stop = () => { clearInterval(timer); timer = 0; };
    dots.forEach((d, i) => d.addEventListener('click', () => { stop(); go(i); start(); }));
    go(0);
    if (hasIO) new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(show);
    else start();
  }

  // ---- Blog list: live search + topic filter ----
  const blogSearch = $('[data-blog-search]');
  if (blogSearch) {
    const posts = $$('[data-post]');
    const none = $('.yt-noresult');
    let cat = 'all';
    const apply = () => {
      const q = blogSearch.value.trim().toLowerCase();
      let shown = 0;
      posts.forEach((p) => {
        const hit = (cat === 'all' || p.dataset.cat === cat) && (!q || p.dataset.title.includes(q) || p.textContent.toLowerCase().includes(q));
        p.classList.toggle('gone', !hit);
        if (hit) shown++;
      });
      if (none) none.hidden = shown > 0;
    };
    blogSearch.addEventListener('input', apply);
    $$('[data-blog-cat]').forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.blogCat;
      $$('[data-blog-cat]').forEach((x) => x.classList.toggle('on', x === b));
      apply();
    }));
  }

  // ---- Screenshot lightbox (site helper from main.js) ----
  if (typeof window.openLightbox === 'function') {
    $$('[data-zoom] img').forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => window.openLightbox(img.src));
    });
  }
})();
