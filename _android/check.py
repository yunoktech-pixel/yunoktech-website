"""Sanity-check generated Android pages: one h1, TOC anchors, JSON-LD, local links, tag nesting."""
import html.parser, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOID = {'meta', 'link', 'img', 'br', 'input', 'hr', 'path', 'circle', 'rect', 'stop', 'source', 'line', 'polygon', 'ellipse', 'polyline'}


class Nest(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.err = []
    def handle_starttag(self, t, a):
        if t not in VOID: self.stack.append(t)
    def handle_endtag(self, t):
        if t in VOID: return
        if self.stack and self.stack[-1] == t: self.stack.pop()
        else: self.err.append((t, self.stack[-3:], self.getpos()))


problems = 0
for f in sorted((ROOT / 'android').rglob('index.html')):
    s = f.read_text(encoding='utf-8')
    issues = []
    if s.count('<h1') != 1: issues.append(f'{s.count("<h1")} h1 tags')
    ids = set(re.findall(r'id="([^"]+)"', s))
    missing = set(re.findall(r'href="#([^"]+)"', s)) - ids
    if missing: issues.append(f'missing anchors {missing}')
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S): json.loads(m)
    for h in re.findall(r'(?:href|src)="([^"#:?]+)"', s):
        if not (f.parent / h).resolve().exists(): issues.append(f'missing file {h}')
    p = Nest(); p.feed(s)
    if p.err or p.stack: issues.append(f'nesting {p.err[:3]} unclosed {p.stack}')
    if issues:
        problems += 1
        print(f.relative_to(ROOT).as_posix()); [print('  ', i) for i in issues]
print('OK' if not problems else f'{problems} page(s) with issues')
