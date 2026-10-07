/* ==========================================================================
   Blog article enhancements: table of contents, reading progress,
   sidebar app card and gentle reveal-as-you-read.
   ========================================================================== */
(function () {
  'use strict';

  const body = document.querySelector('.article-body');
  const aside = document.querySelector('.art-aside');
  if (!body) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Table of contents from the article's h2 headings ----
  const heads = Array.from(body.querySelectorAll('h2'));
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const links = [];
  if (aside) {
    const list = aside.querySelector('.art-toc ol');
    heads.forEach((h) => {
      if (!h.id) h.id = slug(h.textContent);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
      links.push(a);
    });
    // Sidebar copy of the app promo card
    const promo = document.querySelector('.article-wrap .article-app-promo');
    if (promo) aside.appendChild(promo.cloneNode(true));
  }

  // ---- Reading progress + active heading ----
  const bar = aside && aside.querySelector('.art-progress-ring b');
  const pct = aside && aside.querySelector('.art-progress-ring span');
  function onScroll() {
    const r = body.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight * 0.6)));
    if (bar) bar.style.width = `${p * 100}%`;
    if (pct) pct.textContent = `${Math.round(p * 100)}% read`;
    let cur = -1;
    heads.forEach((h, i) => { if (h.getBoundingClientRect().top < 140) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Reveal blocks as you read ----
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const blocks = body.querySelectorAll(':scope > h2, :scope > .callout-box, :scope > ul, :scope > ol, :scope > .article-table-wrap, :scope > .article-shots, :scope > .article-cta-card, :scope > .notif-pills, :scope > .article-feat-grid');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('art-in'); io.unobserve(e.target); }
    }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    blocks.forEach((b) => {
      if (b.getBoundingClientRect().top > window.innerHeight) { b.classList.add('art-r'); io.observe(b); }
    });
  }

  // ---- Tap screenshots to zoom (site lightbox from main.js) ----
  if (typeof window.openLightbox === 'function') {
    body.querySelectorAll('.article-shots img').forEach((img) => img.addEventListener('click', () => window.openLightbox(img.src)));
  }
})();
