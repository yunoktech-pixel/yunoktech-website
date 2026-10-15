"""Build the Android & AI blog.

Sources (not published: Jekyll skips folders that start with "_"):
  _android/roadmap.txt          categories, topics, slugs and AI clusters
  _android/articles/<slug>.html one fragment per article: a <!--meta {json} --> header + body HTML

Outputs:
  android/<slug>/index.html     standalone article pages
  android/index.html            hub listing every roadmap topic
  sitemap.xml, llms.txt         the block between the ANDROID markers is regenerated

Run from anywhere:  python _android/build.py
"""
import html
import json
import re
import textwrap
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '_android'
OUT = ROOT / 'android'
SITE = 'https://yunoktech.com'
COURSE = 'course.html'
LATEST_COUNT = 6      # cards shown in the hub's "Latest articles" section
CAT_PREVIEW = 6       # topics shown per category before "Show all"

LEVELS = {'B': ('Beginner', 'lvl-b'), 'I': ('Intermediate', 'lvl-i'), 'A': ('Advanced', 'lvl-a')}

# Order from the roadmap's "Suggested first 15 articles".
START_HERE = [
    'android-developer-roadmap-beginners', 'kotlin-vs-java-android', 'jetpack-compose-vs-xml',
    'mvi-vs-mvvm-android', 'kotlin-coroutines-flow-android', 'ai-in-android-development',
    'choose-ai-model-android-app', 'cloud-ai-vs-on-device-ai-android', 'gemini-api-android-kotlin',
    'gemini-nano-ml-kit-genai-android', 'ai-chatbot-jetpack-compose', 'gemini-in-android-studio',
    'clean-architecture-android', 'android-app-performance-optimization', 'become-android-developer-2026',
]

CTA_LINES = {
    'beginner': 'Reading a roadmap is the easy part. The real progress happens when you build a foundation step by step, with someone reviewing your code and answering the questions that come up along the way.',
    'kotlin': 'Kotlin fluency makes everything else in Android easier, from coroutines and Flow to Compose and clean architecture. The fastest way to build that fluency is to write real Kotlin every day and get feedback on it.',
    'compose': 'Jetpack Compose clicks once you build real screens with real state. Practise modern Android UI development on projects that go beyond toy examples.',
    'architecture': 'Architecture makes the most sense when you apply it to a real project and see why each boundary exists. Learn how maintainable Android applications are designed by building one.',
    'ai': 'Every AI feature still runs inside an Android app that has to be fast, reliable and well structured. Strengthen the Kotlin, Jetpack Compose and architecture skills that AI integrations depend on, then apply these AI concepts with confidence.',
    'performance': 'Performance work starts with understanding how Android apps are built and how they behave at runtime. Strengthen those fundamentals and the profiling tools start to make sense.',
    'data': 'Networking, persistence and offline sync are where real apps get complicated. Practise building a data layer that handles slow networks, failures and caching, not just the happy path.',
    'security': 'Security is easiest to get right when it is part of how you build from the first screen. Strengthen the Android fundamentals that secure, privacy-respecting apps are built on.',
    'publishing': 'Shipping is a skill of its own. Learn to take an app from a working build to a polished, signed release that real users can install from Google Play.',
    'career': 'Interviews reward developers who can explain why, not just how. Build the Kotlin, Compose and architecture depth that lets you discuss real trade-offs with confidence.',
    'tools':'AI coding tools multiply what you already know. The stronger your Kotlin, Compose and architecture foundation, the better you can judge, fix and ship what these tools suggest.',
}


# --------------------------------------------------------------------------
# Roadmap
# --------------------------------------------------------------------------
def load_roadmap():
    cats, clusters, topics = [], [], {}
    cur = None
    for raw in (SRC / 'roadmap.txt').read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('# '):
            continue
        if line.startswith('## '):
            cid, name, icon, desc = [p.strip() for p in line[3:].split('|')]
            cur = {'id': cid, 'name': name, 'icon': icon, 'desc': desc, 'topics': []}
            cats.append(cur)
        elif line.startswith('@@ '):
            cur = {'name': line[3:].strip(), 'items': []}
            clusters.append(cur)
        elif 'topics' in (cur or {}):
            lvl, title, slug = [p.strip() for p in line.split('|')]
            t = {'title': title, 'slug': slug, 'level': lvl, 'cat': cur}
            cur['topics'].append(t)
            topics[slug] = t
        else:
            title, slug = [p.strip() for p in line.split('|')]
            cur['items'].append({'title': title, 'slug': slug})
    return cats, clusters, topics


def load_articles(topics):
    arts = {}
    for f in sorted((SRC / 'articles').glob('*.html')):
        text = f.read_text(encoding='utf-8')
        m = re.match(r'\s*<!--meta\s*(\{.*?\})\s*-->\s*', text, re.S)
        if not m:
            raise SystemExit(f'{f.name}: missing <!--meta {{...}} --> header')
        meta = json.loads(m.group(1))
        slug = f.stem
        topic = topics.get(slug)
        if not topic:
            raise SystemExit(f'{f.name}: slug not in roadmap.txt')
        meta.setdefault('title', topic['title'])
        meta['slug'] = slug
        meta['topic'] = topic
        meta['body_src'] = text[m.end():]
        arts[slug] = meta
    return arts


# --------------------------------------------------------------------------
# Syntax highlighting (build time, no JS shipped)
# --------------------------------------------------------------------------
KEYWORDS = {
    'kotlin': 'package import class interface object fun val var if else when for while do return in is as by get set this super null true false try catch finally throw private public internal protected override open abstract sealed data enum companion inline reified suspend operator infix lateinit const typealias init constructor out vararg annotation inner value where crossinline noinline tailrec actual expect break continue',
    'java': 'package import class interface extends implements new public private protected static final void if else for while do return switch case default break continue try catch finally throw throws this super null true false int long boolean double float char byte short var record',
    'python': 'def class return if elif else for while in not and or is None True False import from as with try except finally raise async await lambda pass yield',
    'js': 'const let var function return if else for while of in new class extends import export from async await try catch throw null undefined true false this',
    'yaml': 'true false null',
    'json': 'true false null',
}
LANG_NAMES = {'kotlin': 'Kotlin', 'kts': 'Gradle KTS', 'java': 'Java', 'xml': 'XML', 'json': 'JSON', 'bash': 'Shell',
              'python': 'Python', 'js': 'JavaScript', 'yaml': 'YAML', 'toml': 'TOML', 'text': 'Text', 'properties': 'Properties'}

C_LIKE = re.compile(r'(?P<c>//[^\n]*|/\*.*?\*/)|(?P<s>"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\')'
                    r'|(?P<a>@[A-Za-z_][\w.]*)|(?P<n>\b\d[\d_]*(?:\.\d+)?[fFLu]*\b)|(?P<w>\b[A-Za-z_]\w*\b)', re.S)
HASH_LIKE = re.compile(r'(?P<c>#[^\n]*)|(?P<s>"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\')'
                       r'|(?P<n>\b\d[\d_.]*\b)|(?P<w>\b[A-Za-z_][\w-]*\b)', re.S)
XML_RE = re.compile(r'(?P<c><!--.*?-->)|(?P<tag></?[\w:.-]+|/?>)|(?P<at>[\w:.-]+(?==))|(?P<s>"[^"]*")', re.S)


def highlight(code, lang):
    esc = lambda s: html.escape(s, quote=False)
    if lang == 'xml':
        rx, kw = XML_RE, set()
    elif lang in ('kotlin', 'kts', 'java', 'js', 'json'):
        rx, kw = C_LIKE, set(KEYWORDS.get('kotlin' if lang == 'kts' else lang, '').split())
    elif lang in ('python', 'bash', 'yaml', 'toml', 'properties'):
        rx, kw = HASH_LIKE, set(KEYWORDS.get(lang, '').split())
    else:
        return esc(code)
    out, pos = [], 0
    for m in rx.finditer(code):
        out.append(esc(code[pos:m.start()]))
        kind, tok = m.lastgroup, m.group(0)
        if kind == 'w':
            if tok in kw:
                out.append(f'<span class="tk-k">{esc(tok)}</span>')
            elif lang in ('kotlin', 'kts', 'java') and tok[0].isupper():
                out.append(f'<span class="tk-t">{esc(tok)}</span>')
            else:
                out.append(esc(tok))
        else:
            out.append(f'<span class="tk-{kind}">{esc(tok)}</span>')
        pos = m.end()
    out.append(esc(code[pos:]))
    return ''.join(out)


def render_code_blocks(body):
    def repl(m):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        lang = attrs.get('lang', 'text')
        code = textwrap.dedent(m.group(2).replace('\t', '    ')).strip('\n')
        file_label = attrs.get('file', '')
        cap = f'<span class="file">{html.escape(file_label)}</span>' if file_label else ''
        return (f'<figure class="code">'
                f'<figcaption>{cap}<span class="lang">{LANG_NAMES.get(lang, lang)}</span>'
                f'<button class="copy" type="button" aria-label="Copy code">Copy</button></figcaption>'
                f'<pre tabindex="0"><code class="lang-{lang}">{highlight(code, lang)}</code></pre></figure>')
    return re.sub(r'<code-block([^>]*)>\n?(.*?)</code-block>', repl, body, flags=re.S)


# --------------------------------------------------------------------------
# Shared chrome
# --------------------------------------------------------------------------
def nav(p):
    return f'''<nav id="navbar" role="navigation" aria-label="Main Navigation">
  <div class="container">
    <div class="nav-inner">
      <a href="{p}index.html" class="nav-logo" aria-label="Yunok Tech Home">
        <img src="{p}assets/logo.png" alt="Yunok Tech Logo" width="40" height="40">
        <span class="nav-logo-text">Yunok<span>Tech</span></span>
      </a>
      <ul class="nav-links" role="list"><li><a href="{p}index.html">Home</a></li><li><a href="{p}apps.html">Apps</a></li><li><a href="{p}services.html">Services</a></li><li><a href="{p}course.html">Course</a></li><li><a href="{p}android/index.html" class="active" aria-current="page">Android</a></li><li><a href="{p}blog.html">Blog</a></li><li><a href="{p}contact.html">Contact</a></li></ul>
      <div class="nav-cta"><a href="{p}course.html" class="btn btn-primary btn-sm">Android Course</a></div>
      <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile Navigation">
  <a href="{p}index.html">🏠 Home</a><a href="{p}apps.html">📱 Apps</a><a href="{p}services.html">💼 App for Your Business</a><a href="{p}course.html">🎓 Android Course</a><a href="{p}android/index.html">🤖 Android Dev Blog</a><a href="{p}blog.html">📝 Blog</a><a href="{p}contact.html">✉️ Contact</a>
</nav>'''


def footer(p):
    return f'''<footer id="footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="{p}index.html" class="nav-logo"><img src="{p}assets/logo.png" alt="Yunok Tech" width="40" height="40" loading="lazy"><span class="nav-logo-text">Yunok<span>Tech</span></span></a>
        <p>Innovating Today, Inspiring Tomorrow. Android apps, custom websites &amp; Jetpack Compose training from Mohali, India.</p>
        <div class="footer-social" aria-label="Social Links">
          <a href="https://www.linkedin.com/in/kamal-kakkar-13ab2773/" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>
          <a href="https://medium.com/@kamaldeepkakkar" target="_blank" rel="noopener" aria-label="Medium">M</a>
          <a href="https://wa.me/919988200178" target="_blank" rel="noopener" aria-label="WhatsApp">✆</a>
          <a href="https://play.google.com/store/apps/dev?id=5044394667021493760" target="_blank" rel="noopener" aria-label="Google Play">▶</a>
          <a href="mailto:yunoktech@gmail.com" aria-label="Email">✉</a>
        </div>
      </div>
      <div class="footer-col"><h4>Android Blog</h4><ul><li><a href="{p}android/index.html">All Android Topics</a></li><li><a href="{p}android/index.html#beginners">Beginners</a></li><li><a href="{p}android/index.html#compose">Jetpack Compose</a></li><li><a href="{p}android/index.html#ai">Android AI</a></li></ul></div>
      <div class="footer-col"><h4>Company</h4><ul><li><a href="{p}services.html">App for Your Business</a></li><li><a href="{p}course.html">Android Course</a></li><li><a href="{p}android-training-chandigarh-mohali.html">Android Training Chandigarh</a></li><li><a href="{p}blog.html">Blog</a></li><li><a href="{p}privacy-policy.html">Privacy Policy</a></li></ul></div>
      <div class="footer-col"><h4>Contact</h4><ul><li><a href="tel:+919988200178">+91 99882 00178</a></li><li><a href="mailto:yunoktech@gmail.com">yunoktech@gmail.com</a></li><li><a href="https://maps.google.com/?q=Anand+Villas+Kharar+Mohali" target="_blank" rel="noopener">#28 Anand Villas, Kharar, Mohali</a></li><li><a href="{p}contact.html">Submit a Request</a></li></ul></div>
    </div>
    <div class="footer-bottom">
      <span>© {date.today().year} Yunok Tech. All rights reserved.</span>
      <span>Made with ❤️ in India · <a href="{p}privacy-policy.html">Privacy Policy</a></span>
    </div>
  </div>
</footer>
<button id="back-top" aria-label="Back to top">↑</button>
<script src="{p}js/main.js" defer></script>
<script src="{p}js/android-blog.js" defer></script>'''


def head(p, title, desc, canonical, keywords, og_type, extra=''):
    a = html.escape
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{a(title)}</title>
  <meta name="description" content="{a(desc)}">
  <meta name="keywords" content="{a(keywords)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:site_name" content="Yunok Tech">
  <meta property="og:image" content="{SITE}/assets/logo.png">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#050b18">
{extra}  <link rel="icon" type="image/png" href="{p}assets/logo.png">
  <link rel="apple-touch-icon" href="{p}assets/logo.png">
  <link rel="stylesheet" href="{p}css/style.css">
  <link rel="stylesheet" href="{p}css/android-blog.css">
</head>'''


def strip_tags(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def nice_date(d):
    d = date.fromisoformat(d)
    return f'{d:%b} {d.day}, {d.year}'


# --------------------------------------------------------------------------
# Article page
# --------------------------------------------------------------------------
APPS = {
    'walzi': ('Walzi', '4K wallpapers for lock and home screen', 'assets/walzi-icon.jpg',
              'com.yunok.walzi', 'apps/walzi.html'),
    'notivault': ('NotiVault', 'Notification history: recover dismissed notifications', 'assets/notivault-icon.jpg',
                  'com.yunoktech.notificationhistory', 'apps/notivault.html'),
}
NOTIVAULT_FIRST = re.compile(r'notification|fcm|foreground|workmanager|background|permission|privacy|security|keystore|token|biometric')


def apps_box(p, slug, where):
    """'Apps built by Yunok Tech' box; the most relevant app is listed first."""
    order = ['notivault', 'walzi'] if NOTIVAULT_FIRST.search(slug) else ['walzi', 'notivault']
    items = ''
    for key in order:
        name, tagline, icon, pkg, page = APPS[key]
        play = (f'https://play.google.com/store/apps/details?id={pkg}&amp;referrer='
                f'utm_source%3Dyunoktech%26utm_medium%3Dandroid-blog%26utm_content%3D{slug}-{where}')
        items += (f'<li><a class="app-info" href="{p}{page}"><img src="{p}{icon}" alt="" width="44" height="44" loading="lazy">'
                  f'<span><b>{name}</b><small>{tagline}</small></span></a>'
                  f'<a class="app-get" href="{play}" target="_blank" rel="noopener" aria-label="Get {name} on Google Play">Get it ▸</a></li>')
    return (f'<section class="ad-apps ad-apps-{where}" aria-label="Apps built by Yunok Tech">'
            f'<h2>📱 Apps built by Yunok Tech</h2><p>Real Android apps on Google Play, free to download.</p>'
            f'<ul>{items}</ul><a class="ad-apps-all" href="{p}apps.html">See all our apps →</a></section>')


def build_article(a, arts, topics):
    p = '../../'
    slug, topic = a['slug'], a['topic']
    cat = topic['cat']
    url = f'{SITE}/android/{slug}/'
    body = render_code_blocks(a['body_src'])

    heads = re.findall(r'<h2 id="([^"]+)"[^>]*>(.*?)</h2>', body, re.S)
    ids = [h[0] for h in heads]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise SystemExit(f'{slug}: duplicate h2 ids {dupes}')
    toc_items = ''.join(f'<li><a href="#{i}">{html.escape(strip_tags(t))}</a></li>' for i, t in heads)

    words = len(strip_tags(re.sub(r'<figure class="code">.*?</figure>', ' ', body, flags=re.S)).split())
    read_min = max(3, round(words / 210))
    level_name, level_cls = LEVELS[topic['level']]
    published, updated = a['date'], a.get('updated', a['date'])

    # References
    refs = ''
    if a.get('refs'):
        refs = '<section class="ad-refs" aria-labelledby="references"><h2 id="references">Official references</h2><ul>' + ''.join(
            f'<li><a href="{html.escape(u)}" target="_blank" rel="noopener">{html.escape(t)}</a></li>' for t, u in a['refs']) + '</ul></section>'

    # CTA
    cta_line = CTA_LINES[a.get('cta', 'beginner')]
    cta = f'''<section class="ad-cta" aria-labelledby="course-cta">
  <h2 id="course-cta">Ready to build real Android applications?</h2>
  <p>{cta_line}</p>
  <p>Move beyond theory and strengthen your Android development skills with Yunoktech's Android course. Learn core concepts, practical implementation, modern Android development techniques, and the reasoning behind building maintainable applications.</p>
  <p>Explore the Android course and take your next step as an Android developer.</p>
  <div class="btn-row"><a class="ad-btn primary" href="{p}{COURSE}">Explore Android Course →</a><a class="ad-btn ghost" href="{p}android/index.html">Browse all Android topics</a></div>
</section>'''

    # Related (only pages that exist, so no broken links)
    rel = [s for s in a.get('related', []) if s in arts and s != slug]
    for s, other in arts.items():
        if len(rel) >= 4:
            break
        if s != slug and s not in rel and other['topic']['cat'] is cat:
            rel.append(s)
    for s in START_HERE:
        if len(rel) >= 4:
            break
        if s in arts and s != slug and s not in rel:
            rel.append(s)
    related = ''
    if rel:
        related = '<nav class="ad-related" aria-labelledby="related-heading"><h2 id="related-heading">Keep learning</h2><ul>' + ''.join(
            f'<li><a href="{p}android/{s}/index.html"><small>{html.escape(arts[s]["topic"]["cat"]["name"])}</small>{html.escape(arts[s]["title"])}</a></li>'
            for s in rel[:4]) + '</ul></nav>'

    article_ld = {
        '@context': 'https://schema.org', '@type': 'TechArticle',
        'headline': a['title'], 'description': a['description'],
        'datePublished': published, 'dateModified': updated,
        'inLanguage': 'en', 'proficiencyLevel': level_name,
        'articleSection': cat['name'], 'keywords': ', '.join(a.get('keywords', [])),
        'image': f'{SITE}/assets/logo.png',
        'author': {'@type': 'Organization', 'name': 'Yunok Tech', 'url': SITE + '/'},
        'publisher': {'@type': 'Organization', 'name': 'Yunok Tech', 'logo': {'@type': 'ImageObject', 'url': f'{SITE}/assets/logo.png'}},
        'mainEntityOfPage': {'@type': 'WebPage', '@id': url},
    }
    crumbs_ld = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Android', 'item': f'{SITE}/android/'},
            {'@type': 'ListItem', 'position': 3, 'name': a['title'], 'item': url},
        ]}
    og_title = a.get('og_title', a['seo_title'])
    og_desc = a.get('og_description', a['description'])
    e = html.escape
    extra = (f'  <meta property="og:title" content="{e(og_title)}">\n'
             f'  <meta property="og:description" content="{e(og_desc)}">\n'
             f'  <meta property="og:image:alt" content="Yunok Tech logo">\n'
             f'  <meta property="article:published_time" content="{published}">\n'
             f'  <meta property="article:modified_time" content="{updated}">\n'
             f'  <meta property="article:section" content="{e(cat["name"])}">\n'
             f'  <meta name="twitter:title" content="{e(og_title)}">\n'
             f'  <meta name="twitter:description" content="{e(og_desc)}">\n'
             f'  <script type="application/ld+json">{json.dumps(article_ld, ensure_ascii=False)}</script>\n'
             f'  <script type="application/ld+json">{json.dumps(crumbs_ld, ensure_ascii=False)}</script>\n')

    page = f'''{head(p, a['seo_title'] + ' | Yunok Tech', a['description'], url, ', '.join([a.get('primary_keyword', '')] + a.get('keywords', [])), 'article', extra)}
<body class="ad-page">
{nav(p)}

<header class="ad-hero">
  <div class="ad-hero-in">
    <nav class="ad-crumbs" aria-label="Breadcrumb"><a href="{p}index.html">Home</a><span aria-hidden="true">/</span><a href="{p}android/index.html">Android</a><span aria-hidden="true">/</span><a href="{p}android/index.html#{cat['id']}">{e(cat['name'])}</a></nav>
    <span class="ad-chip">{cat['icon']} {e(cat['name'])}</span>
    <h1>{e(a['title'])}</h1>
    <p class="ad-lede">{html.escape(a['lede'], quote=False)}</p>
    <div class="ad-meta">
      <span>✍️ <b>Yunok Tech</b></span>
      <span>📅 Updated <b><time datetime="{updated}">{nice_date(updated)}</time></b></span>
      <span>⏱ <b>{read_min} min</b> read</span>
      <span>🎯 <b>{level_name}</b></span>
    </div>
  </div>
</header>

<main class="ad-main" id="main">
  <div class="ad-layout">
    <article class="ad-article" aria-labelledby="article-title">
      <details class="ad-toc-inline"><summary>On this page</summary><ol>{toc_items}</ol></details>
      <div class="ad-body">
{body.strip()}
      </div>
      {refs}
      {apps_box(p, slug, 'inline')}
      {cta}
      {related}
      <div class="ad-share" aria-label="Share this article"><span>Share:</span>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url={url}" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://twitter.com/intent/tweet?url={url}&amp;text={html.escape(a['title'])}" target="_blank" rel="noopener">X / Twitter</a>
        <a href="https://wa.me/?text={url}" target="_blank" rel="noopener">WhatsApp</a>
        <button type="button" data-share="copy">Copy link</button>
      </div>
    </article>
    <aside class="ad-aside" aria-label="Table of contents">
      <nav class="ad-toc"><h2>On this page</h2><ol>{toc_items}</ol></nav>
      {apps_box(p, slug, 'side')}
    </aside>
  </div>
</main>

{footer(p)}
</body>
</html>
'''
    page = page.replace('<h1>', '<h1 id="article-title">', 1)
    d = OUT / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / 'index.html').write_text(page, encoding='utf-8')
    return read_min


# --------------------------------------------------------------------------
# Hub page
# --------------------------------------------------------------------------
def build_hub(cats, clusters, topics, arts):
    p = '../'
    e = html.escape
    total = sum(len(c['topics']) for c in cats)
    url = f'{SITE}/android/'

    def topic_li(t):
        lname, lcls = LEVELS[t['level']]
        badge = f'<span class="lvl {lcls}" title="{lname}">{lname[0]}</span>'
        key = e((t['title'] + ' ' + t['cat']['name'] + ' ' + lname).lower())
        if t['slug'] in arts:
            return f'<li data-topic="{key}">{badge}<a href="{t["slug"]}/index.html">{e(arts[t["slug"]]["title"])}</a><span class="tag-new">Read</span></li>'
        return f'<li class="soon" data-topic="{key}">{badge}<span>{e(t["title"])}</span><span class="tag-soon">Coming soon</span></li>'

    latest = sorted(arts.values(), key=lambda x: (x.get('updated', x['date']), -START_HERE.index(x['slug']) if x['slug'] in START_HERE else -999), reverse=True)
    latest_html = ''.join(
        f'<a class="hub-card" href="{x["slug"]}/index.html"><small>{x["topic"]["cat"]["icon"]} {e(x["topic"]["cat"]["name"])}</small>'
        f'<h3>{e(x["title"])}</h3><p>{e(x["description"])}</p><span class="more">Read article →</span></a>' for x in latest[:LATEST_COUNT])

    cat_cards = ''.join(
        f'<a class="hub-cat" href="#{c["id"]}"><span class="ico" aria-hidden="true">{c["icon"]}</span>'
        f'<span class="txt"><b>{e(c["name"])}</b><small>{sum(1 for t in c["topics"] if t["slug"] in arts)} articles</small></span></a>'
        for c in cats)

    start = ''.join(
        f'<li><a href="{s}/index.html">{e(arts[s]["title"])}</a></li>' if s in arts else f'<li>{e(topics[s]["title"])} <em>(coming soon)</em></li>'
        for s in START_HERE)

    cluster_html = ''
    for cl in clusters:
        items = ''.join(
            f'<li><a href="{it["slug"]}/index.html">{e(it["title"])}</a></li>' if it['slug'] in arts else f'<li>{e(it["title"])} <em>(soon)</em></li>'
            for it in cl['items'])
        cluster_html += f'<div class="card"><h3>{e(cl["name"])}</h3><ol>{items}</ol></div>'

    sections = ''
    for c in cats:
        done = sum(1 for t in c['topics'] if t['slug'] in arts)
        sections += (f'<section class="hub-sec" id="{c["id"]}" data-cat aria-labelledby="h-{c["id"]}">'
                     f'<h2 id="h-{c["id"]}"><span aria-hidden="true">{c["icon"]}</span>{e(c["name"])}</h2>'
                     f'<p>{e(c["desc"])} <strong>{done} of {len(c["topics"])} published.</strong></p>'
                     f'<ul class="hub-list" data-preview="{CAT_PREVIEW}">{"".join(topic_li(t) for t in c["topics"])}</ul></section>')

    jump = ''.join(f'<a href="#{c["id"]}">{c["icon"]} {e(c["name"].split(" and ")[0].split(",")[0])}</a>' for c in cats)

    items_ld = [{'@type': 'ListItem', 'position': i + 1, 'url': f'{SITE}/android/{x["slug"]}/', 'name': x['title']} for i, x in enumerate(latest)]
    ld = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Android Development & AI Blog', 'url': url,
          'description': 'Android development and Android AI tutorials from Yunok Tech.',
          'isPartOf': {'@type': 'WebSite', 'name': 'Yunok Tech', 'url': SITE + '/'},
          'mainEntity': {'@type': 'ItemList', 'itemListElement': items_ld}}
    crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': 'Android', 'item': url}]}
    title = 'Android Development & AI Blog: Kotlin, Compose, Architecture | Yunok Tech'
    desc = 'Practical Android tutorials from Yunok Tech: Kotlin, Jetpack Compose, MVVM and clean architecture, testing, performance, security and AI in Android apps with Gemini and ML Kit.'
    extra = (f'  <meta property="og:title" content="Android Development &amp; AI Blog | Yunok Tech">\n'
             f'  <meta property="og:description" content="{e(desc)}">\n'
             f'  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n'
             f'  <script type="application/ld+json">{json.dumps(crumbs, ensure_ascii=False)}</script>\n')

    page = f'''{head(p, title, desc, url, 'android development blog, android tutorials, kotlin tutorial, jetpack compose tutorial, android architecture, android ai, gemini api android, ml kit genai, android interview questions', 'website', extra)}
<body class="ad-page">
{nav(p)}

<header class="ad-hero hub-hero">
  <div class="ad-hero-in">
    <nav class="ad-crumbs" aria-label="Breadcrumb"><a href="{p}index.html">Home</a><span aria-hidden="true">/</span><span>Android</span></nav>
    <span class="ad-chip">🤖 Android Development &amp; AI</span>
    <h1>Android Development &amp; AI Blog</h1>
    <p class="ad-lede">Practical, technically grounded guides for Android developers: Kotlin, Jetpack Compose, architecture, data, testing, performance, security, publishing, and how to add AI to Android apps responsibly. Every article explains the trade-offs, not just the code.</p>
    <div class="ad-meta hub-stats"><span>📚 <b>{len(arts)}</b> articles published</span><span>🗺️ <b>{total}</b> topics on the roadmap</span><span>🗂️ <b>{len(cats)}</b> categories</span></div>
    <label class="hub-search"><span aria-hidden="true">🔍</span><input type="search" placeholder="Search Android topics…" aria-label="Search Android topics" data-hub-search></label>
    <div class="hub-jump" aria-label="Jump to category">{jump}</div>
  </div>
</header>

<main class="ad-main" id="main">
  <div class="hub-wrap">
    <section class="hub-sec" aria-labelledby="cats-h">
      <h2 id="cats-h">🗂️ Browse by category</h2>
      <p>Pick a category to jump straight to its articles.</p>
      <div class="hub-cats">{cat_cards}</div>
    </section>

    <section class="hub-sec" aria-labelledby="latest-h">
      <h2 id="latest-h">🆕 Latest articles</h2>
      <p>The most recently published guides. Browse the categories above for everything else.</p>
      <div class="hub-latest">{latest_html}</div>
    </section>

    <section class="hub-sec" aria-labelledby="start-h">
      <h2 id="start-h">🧭 Start here: a 15-article learning path</h2>
      <p>New to the blog? Read these in order. They move from Android fundamentals to Kotlin, Compose and architecture, then into AI features.</p>
      <div class="hub-path"><div class="card"><ol>{start}</ol></div></div>
    </section>

    {sections}
    <p class="hub-empty">No topics match your search.</p>

    <section class="hub-sec" id="ai-path" aria-labelledby="ai-path-h">
      <h2 id="ai-path-h">🧠 Android AI learning path</h2>
      <p>Android AI is a major pillar of this blog. Follow these clusters from understanding models, through on-device and cloud integration, to complete projects and production concerns.</p>
      <div class="hub-path">{cluster_html}</div>
    </section>

    <section class="ad-cta" aria-labelledby="hub-cta">
      <h2 id="hub-cta">Want guided, hands-on Android training?</h2>
      <p>Move beyond theory and strengthen your Android development skills with Yunoktech's Android course. Learn core concepts, practical implementation, modern Android development techniques, and the reasoning behind building maintainable applications.</p>
      <div class="btn-row"><a class="ad-btn primary" href="{p}{COURSE}">Explore Android Course →</a></div>
    </section>
  </div>
</main>

{footer(p)}
</body>
</html>
'''
    OUT.mkdir(exist_ok=True)
    (OUT / 'index.html').write_text(page, encoding='utf-8')


# --------------------------------------------------------------------------
# sitemap.xml + llms.txt
# --------------------------------------------------------------------------
def replace_block(path, start, end, block, insert_before):
    text = path.read_text(encoding='utf-8')
    new = f'{start}\n{block}{end}'
    if start in text:
        text = re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda m: new, text, flags=re.S)
    else:
        text = text.replace(insert_before, new + '\n' + insert_before, 1) if insert_before else text.rstrip('\n') + '\n\n' + new + '\n'
    path.write_text(text, encoding='utf-8')


def update_sitemap_llms(arts):
    latest = max((a.get('updated', a['date']) for a in arts.values()), default=date.today().isoformat())
    urls = [f'  <url>\n    <loc>{SITE}/android/</loc>\n    <lastmod>{latest}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n']
    for a in sorted(arts.values(), key=lambda x: x['slug']):
        urls.append(f'  <url>\n    <loc>{SITE}/android/{a["slug"]}/</loc>\n    <lastmod>{a.get("updated", a["date"])}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n')
    replace_block(ROOT / 'sitemap.xml', '  <!-- ANDROID:START (generated by _android/build.py) -->', '  <!-- ANDROID:END -->', ''.join(urls), '</urlset>')

    lines = [f'- [Android Development & AI Blog]({SITE}/android/): Hub for all Android and Android AI tutorials.\n']
    lines += [f'- [{a["title"]}]({SITE}/android/{a["slug"]}/): {a["description"]}\n' for a in arts.values()]
    replace_block(ROOT / 'llms.txt', '<!-- ANDROID:START -->\n## Android & AI Developer Blog', '<!-- ANDROID:END -->', ''.join(lines), None)


def main():
    cats, clusters, topics = load_roadmap()
    arts = load_articles(topics)
    for a in arts.values():
        a['read_min'] = build_article(a, arts, topics)
    build_hub(cats, clusters, topics, arts)
    update_sitemap_llms(arts)
    # Internal links to articles that aren't written yet would 404: report them.
    broken = []
    for a in arts.values():
        for target in re.findall(r'href="\.\./([a-z0-9-]+)/index\.html', a['body_src']):
            if target not in arts:
                broken.append(f'{a["slug"]} -> {target}')
    if broken:
        print('WARNING: links to unpublished articles (publish them or remove the link):')
        print('\n'.join('  ' + b for b in broken))
    print(f'{len(topics)} roadmap topics, {len(arts)} articles built:')
    for a in arts.values():
        print(f"  android/{a['slug']}/  ({a['read_min']} min)")


if __name__ == '__main__':
    main()
