/* =============================================
   YUNOK TECH — MAIN JS
   Version 1.0 | Production Ready
   ============================================= */

'use strict';

// ---- Navbar Scroll Effect ----
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ---- Mobile Nav Toggle ----
(function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (!hamburger || !mobileNav) return;
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });
})();

// ---- Particle Generator ----
(function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const span = document.createElement('span');
    span.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * 6}s;
    `;
    container.appendChild(span);
  }
})();

// ---- Scroll Reveal ----
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
  els.forEach(el => obs.observe(el));
})();

// ---- Animated Counters ----
(function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => obs.observe(el));
})();

// ---- FAQ Accordion ----
(function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
})();

// ---- Screenshot Slider ----
function initSlider(sliderEl) {
  if (!sliderEl) return;
  const wrap = sliderEl.closest('.screenshot-slider-wrap');
  const slides = sliderEl.querySelectorAll('.screenshot-slide');
  const dotsWrap = wrap ? wrap.parentElement.querySelector('.slider-dots') : null;
  const prevBtn = wrap ? wrap.parentElement.querySelector('.slider-prev') : null;
  const nextBtn = wrap ? wrap.parentElement.querySelector('.slider-next') : null;
  let current = 0;
  let autoTimer;
  const total = slides.length;
  const visibleCount = () => window.innerWidth < 600 ? 1 : (window.innerWidth < 900 ? 2 : 3);

  // Build dots
  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
  }

  const goTo = (idx) => {
    current = (idx + total) % total;
    const slideWidth = slides[0].offsetWidth + 16;
    sliderEl.style.transform = `translateX(-${current * slideWidth}px)`;
    if (dotsWrap) {
      dotsWrap.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }
  };

  if (prevBtn) prevBtn.addEventListener('click', () => { clearInterval(autoTimer); goTo(current - 1); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { clearInterval(autoTimer); goTo(current + 1); startAuto(); });

  const startAuto = () => {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 3500);
  };
  startAuto();

  // Lightbox on click
  slides.forEach(slide => {
    const img = slide.querySelector('img');
    if (!img) return;
    img.addEventListener('click', () => openLightbox(img.src));
  });
}

// Init all sliders on page
document.querySelectorAll('.screenshot-slider').forEach(el => initSlider(el));

// ---- Lightbox ----
function openLightbox(src) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <img class="lightbox-img" src="" alt="Screenshot">
      <button class="lightbox-close" aria-label="Close">✕</button>
    `;
    document.body.appendChild(lb);
    lb.querySelector('.lightbox-close').addEventListener('click', () => lb.classList.remove('open'));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('open'); });
  }
  lb.querySelector('.lightbox-img').src = src;
  lb.classList.add('open');
}

// ---- Back to Top ----
(function initBackTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ---- Contact Form Handler ----
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Message Sent!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.background = '';
      btn.disabled = false;
      form.reset();
    }, 3500);
  });
})();

// ---- Blog Search ----
(function initBlogSearch() {
  const input = document.querySelector('.blog-search-input');
  const cards = document.querySelectorAll('.blog-card[data-title]');
  if (!input || !cards.length) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    cards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const cat = (card.dataset.cat || '').toLowerCase();
      card.style.display = (title.includes(q) || cat.includes(q)) ? '' : 'none';
    });
  });
})();

// ---- Blog Filter Tabs ----
(function initBlogTabs() {
  const tabs = document.querySelectorAll('.blog-filter-tab');
  const cards = document.querySelectorAll('.blog-card[data-cat]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.cat;
      cards.forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
      });
    });
  });
})();

// ---- Active Nav Link ----
(function setActiveLink() {
  const links = document.querySelectorAll('.nav-links a, .mobile-nav a');
  const path = window.location.pathname.replace(/\/$/, '').split('/').pop() || 'index.html';
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const hrefFile = href.split('/').pop();
    if (hrefFile === path || (path === '' && hrefFile === 'index.html')) {
      link.classList.add('active');
    }
  });
})();
