/* Hanuman Dham pages — reading preferences, lite YouTube embed, daily chaupai */
(function () {
  var body = document.body;
  var KEY = 'hd-reading-prefs';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ }
  }

  var prefs = load();

  // ---- View toggles (Hindi / Roman / Meaning) ----
  document.querySelectorAll('.hd-seg [data-toggle]').forEach(function (btn) {
    var key = btn.getAttribute('data-toggle');
    var on = prefs[key] !== false;
    apply(btn, key, on);
    btn.addEventListener('click', function () {
      var next = btn.getAttribute('aria-pressed') !== 'true';
      // never allow both text layers to be hidden
      if (!next && (key === 'hindi' || key === 'roman')) {
        var other = key === 'hindi' ? 'roman' : 'hindi';
        var otherBtn = document.querySelector('.hd-seg [data-toggle="' + other + '"]');
        if (otherBtn && otherBtn.getAttribute('aria-pressed') !== 'true') return;
        if (!otherBtn) return;
      }
      apply(btn, key, next);
      prefs[key] = next;
      save(prefs);
    });
  });
  function apply(btn, key, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    body.setAttribute('data-show-' + key, on ? 'true' : 'false');
  }

  // ---- Font size ----
  var SIZES = [1.15, 1.3, 1.45, 1.65, 1.85, 2.1];
  var sizeIdx = typeof prefs.size === 'number' ? prefs.size : 2;
  function setSize(i) {
    sizeIdx = Math.max(0, Math.min(SIZES.length - 1, i));
    body.style.setProperty('--lyric-size', SIZES[sizeIdx] + 'rem');
    prefs.size = sizeIdx;
    save(prefs);
  }
  if (typeof prefs.size === 'number') setSize(prefs.size);
  document.querySelectorAll('[data-size]').forEach(function (b) {
    b.addEventListener('click', function () { setSize(sizeIdx + Number(b.getAttribute('data-size'))); });
  });

  // ---- Night reading ----
  if (prefs.theme) body.setAttribute('data-theme', prefs.theme);
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = body.getAttribute('data-theme') ||
        (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      body.setAttribute('data-theme', next);
      prefs.theme = next;
      save(prefs);
    });
  });

  // ---- Lite YouTube embed (loads the player only on click) ----
  document.querySelectorAll('.hd-video[data-yt]').forEach(function (box) {
    var btn = box.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = box.getAttribute('data-title') || 'YouTube video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.allowFullscreen = true;
      box.innerHTML = '';
      box.appendChild(f);
    });
  });

  // ---- Today's chaupai (hub page) ----
  var daily = document.getElementById('hd-daily');
  var dataEl = document.getElementById('hd-daily-data');
  if (daily && dataEl) {
    try {
      var list = JSON.parse(dataEl.textContent);
      var now = new Date();
      var start = new Date(now.getFullYear(), 0, 0);
      var day = Math.floor((now - start) / 86400000);
      var c = list[day % list.length];
      daily.querySelector('.hd-lyric').textContent = c.h;
      daily.querySelector('.hd-roman').textContent = c.r;
      var link = daily.querySelector('a[data-daily-link]');
      if (link) link.href = 'hanuman-chalisa-lyrics.html#' + c.id;
    } catch (e) { /* keep server-rendered fallback */ }
  }
})();
