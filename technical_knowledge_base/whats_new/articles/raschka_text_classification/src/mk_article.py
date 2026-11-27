"""Generate the data-driven parts of an article page from article.json, and expand its link macros.

  python3 mk_article.py          (build.sh runs it first; it writes the three generated parts below)
  import mk_article as M         (build.sh's assembler uses M.expand on the page body)

Writes parts/_gen_card.html (the headline card at the top of Reading, placed at @@CARD@@), parts/_gen_resp.html and
parts/_gen_since.html (the responses list and the dated follow-ups, at @@RESP@@ and @@SINCE@@), parts/_gen_more.html (the Further reading
tab) and parts/_gen_data.js (window.ARTICLE: the card's data and, for this page, the measured Qwen edit from
inputs/real_edit.json). The same file serves every article page; what a new article changes:
  - article.json (every field; the required ones are in page-kinds/article.md, Data);
  - DATA_EXTRA below (page-specific inputs shipped to the page's scripts; set it to {} if there are none);
  - nothing else, unless the card or Further reading needs a new kind of entry.

Link macros (in HTML parts and in article.json url fields):
  {{text|ar:exact words}}  the article at a text fragment (#:~:text=...). The words are 4 to 8 consecutive words copied
                           from inputs/article.txt; they must occur there exactly once, or the build stops. Curly and
                           straight quotes match each other; the URL carries the article's own characters.
  {{text|ah:<id>}}         the article at a real element id (listed in inputs/anchors.txt by extract_article.py).
  {{text|n:<notion id>}}   a knowledge base page (the site build rewrites it to the site page).
  {{text|#t-<tab>}}        another tab of this page.
  {{text|https://...}}     an external link, new tab.
  [[ar:exact words|label]] the "in the article" margin label of a section (same fragment rules; ah:<id> also works).
"""
import html, json, os, re, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'article.json'), encoding='utf-8'))
# The article's full text is someone else's writing: it stays out of the public repo (inputs/article.txt is gitignored;
# extract_article.py rewrites it). What the repo keeps is fragments.json: each fragment's words and the link it resolved to,
# written whenever the full text is present, so a build without it (a fresh clone, the cloud run) gives the same page.
TXT_F, FRAG_F = os.path.join(HERE, 'inputs', 'article.txt'), os.path.join(HERE, 'fragments.json')
TXT = open(TXT_F, encoding='utf-8').read().split('\n', 2)[2] if os.path.exists(TXT_F) else None  # drop the Source header
FRAGS = json.load(open(FRAG_F, encoding='utf-8')) if os.path.exists(FRAG_F) else {}
ANCH = set(open(os.path.join(HERE, 'inputs', 'anchors.txt'), encoding='utf-8').read().split())
DATA_EXTRA = {'recompute': json.load(open(os.path.join(HERE, 'inputs', 'recompute.json'), encoding='utf-8'))}  # the recomputed numbers and the two figures' inputs (written by recompute.py)
USED = []  # every fragment resolved in this build (build.sh prints the count)

A = lambda u, t, c='': '<a href="%s" target="_blank" rel="noopener noreferrer"%s>%s</a>' % (html.escape(u, quote=True), (' class="%s"' % c) if c else '', t)
N = lambda i: 'https://app.notion.com/p/' + i
E = html.escape


def _norm(s):
    """length-preserving: curly quotes to straight, no-break space to space, so indices map back to the original"""
    return s.translate(str.maketrans({'’': "'", '‘': "'", '“': '"', '”': '"', ' ': ' '}))


NT = _norm(TXT) if TXT is not None else None


def frag(words):
    """the article URL with a text fragment for these words; stops the build if they are missing or not unique"""
    w = _norm(re.sub(r'\s+', ' ', words.strip()))
    if NT is None:  # no full text here: the link the last full-text build resolved, or stop
        if w not in FRAGS:
            raise SystemExit('text fragment "%s" is new and inputs/article.txt is missing: run extract_article.py (see its docstring) first' % words)
        USED.append(words)
        return FRAGS[w]
    k = NT.count(w)
    if k != 1:
        raise SystemExit('text fragment %s in inputs/article.txt: "%s"' % ('not found' if k == 0 else 'found %d times (make it unique)' % k, words))
    i = NT.index(w)
    span = TXT[i:i + len(w)]
    USED.append(words)
    enc = urllib.parse.quote(span, safe='').replace('-', '%2D')  # "-" is fragment syntax; "," and "&" are quoted already
    FRAGS[w] = P['url'] + '#:~:text=' + enc
    return FRAGS[w]


def save_frags(prune=False):
    """after a full-text build, add this run's fragments to fragments.json (the generated parts run first and save theirs;
    build.sh saves the body's with prune=True, dropping fragments no part uses any more, by re-reading the generated parts)"""
    if NT is None:
        return
    old = json.load(open(FRAG_F, encoding='utf-8')) if os.path.exists(FRAG_F) else {}
    old.update(FRAGS)
    if prune:
        gen = ''.join(open(os.path.join(HERE, 'parts', g), encoding='utf-8').read() for g in os.listdir(os.path.join(HERE, 'parts')) if g.startswith('_gen_'))
        used = {_norm(re.sub(r'\s+', ' ', x.strip())) for x in USED}
        old = {k: v for k, v in old.items() if k in used or v in gen}
    json.dump(dict(sorted(old.items())), open(FRAG_F, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


def url(u):
    if u.startswith('ar:'): return frag(u[3:])
    if u.startswith('ah:'):
        if u[3:] not in ANCH: raise SystemExit('unknown article anchor ' + u + ' (see inputs/anchors.txt)')
        return P['url'] + '#' + u[3:]
    if u.startswith('n:'): return N(u[2:])
    if u.startswith('http'): return u
    raise SystemExit('bad link target ' + u)


def expand(body):
    def link(m):
        t, u = m.group(1), m.group(2)
        if u.startswith('#t-'): return '<a href="#" data-tab="%s">%s</a>' % (u[1:], t)
        return A(url(u), t)
    body = re.sub(r'\{\{([^|{}]+)\|([^{}]+)\}\}', link, body)
    return re.sub(r'\[\[((?:ar|ah):[^|\]]+)\|([^\]]+)\]\]',
                  lambda m: A(url(m.group(1)), m.group(2), 'where'), body)


def card():
    upd = (' · updated %s' % day(P['updated'])) if P.get('updated') else ''
    h = ['<div class="hero" id="hero">',
         '<div class="hero-k">Article · %s · %s%s</div>' % (E(P.get('kind', 'article')), E(P['site']), upd),
         '<h1>%s</h1>' % E(P['title']),
         '<div class="au">%s · published %s</div>' % (E(P['author']), day(P['published'])),
         '<p class="tk"><b>In one line:</b> %s</p>' % E(P['takeaway']),
         '<div class="hn">']
    for x in P.get('headline', [])[:3]:
        h.append('<div class="stat"><div class="v">%s <span class="u">%s</span></div><div class="k">%s</div><div class="d">%s · %s</div></div>'
                 % (E(x['v']), E(x['u']), E(x['k']), E(x['d']), A(frag(x['at']), 'in the article: ' + E(x['l']))))
    h.append('</div>')
    if P.get('verdict'):
        h.append('<p class="tk"><b>How far to trust it:</b> %s <a href="#s-trust">The evidence, judged</a>.</p>' % E(P['verdict']))
    links = [A(P['url'], 'read it (%d min)' % P['read_time'])]
    if P.get('companion'): links.append(A(P['companion']['u'], E(P['companion']['t'])))
    if P.get('code'): links.append(A(P['code']['u'], 'logs and code (%s)' % E(P['code']['t'])))
    for d in P.get('discussion', []):
        links.append(A(d['u'], 'discussion (%s points, %s comments on %s)' % (f"{d['points']:,}", f"{d['comments']:,}", day(d['read']))))
    h.append('<div class="hero-l">%s</div>' % ' · '.join(links))
    if P.get('updated_note'): h.append('<div class="hero-n">Updated: %s.</div>' % E(P['updated_note']))
    h.append('</div>')
    return '\n'.join(h)


def day(s):
    y, m, d = s.split('-')
    return '%d %s %s' % (int(d), ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][int(m) - 1], y)


def kblink(k, t=None):
    return A(N(k['id']), E(t or k['t'])) if k['id'] not in ('', 'PENDING') else '<b>%s</b>' % E(t or k['t'])


def more():
    sp = lambda name, by, note, t: '<div class="sp"><div class="n">%s</div><p>%s%s</p>%s</div>' % (name, ('<span class="mute">%s:</span> ' % E(by)) if by else '', note, ('<p class="rt">(%s)</p>' % t) if t else '')
    h = ['<div class="tab" id="t-more" role="tabpanel" hidden><section id="s-more">', '<h2>Further reading</h2>',
         '<p class="small mute">Every link opens in a new tab; links checked %s. Reading time of the resources below: RES_TIME.</p>' % day(P['fetched']),
         '<h3>The article</h3><div class="grid">',
         sp(A(P['url'], E(P['title'])), P['author'], 'The post itself (%s, published %s%s). %s' % (E(P['site']), day(P['published']), (', updated ' + day(P['updated'])) if P.get('updated') else '', E(P.get('more_note', ''))), '%d min' % P['read_time'])]
    if P.get('companion'): h.append(sp(A(P['companion']['u'], E(P['companion']['t'])), P['author'], E(P['companion']['n']), P['companion']['time']))
    if P.get('code'): h.append(sp(A(P['code']['u'], E(P['code']['t'])), 'the authors', E(P['code']['n']), P['code']['time']))
    for d in P.get('discussion', []):
        h.append(sp(A(d['u'], E(d['t'])), '', '%s points, %s comments (read %s), submitted %s.' % (f"{d['points']:,}", f"{d['comments']:,}", day(d['read']), day(d['date'])), d.get('time', '')))
    h.append('</div><h3>Responses, in date order</h3><div class="grid">')
    for r in sorted(P.get('responses', []), key=lambda r: r['date']):
        h.append(sp(A(url(r['u']), E(r['t'])), '%s, %s, %s' % (r['by'], day(r['date']), r['kind']), E(r['n']), r['time']))
    if P.get('since'):
        h.append('</div><h3>Since the article (' + E(P.get('since_label', 'papers that build on it')) + ')</h3><div class="grid">')
        for r in P['since']:
            h.append(sp(A(r['u'], E(r['t'])), day(r['date']), E(r['n']), r['time']))
    h.append('</div><h3>What it rests on</h3><div class="grid">')
    for r in P.get('resources', []):
        h.append(sp(A(r['u'], E(r['t'])), r['by'], E(r['n']), r['time']))
    h.append('</div><h3>In this knowledge base</h3><div class="grid">')
    for k in P.get('kb', []):
        h.append(sp(kblink(k), '', E(k['n']), ''))
    par = P.get('parent', {})
    h.append('</div><p class="small mute">This page is one of the %s: articles worth a page of their own, each with its argument, its evidence judged and what others replied.</p>' % kblink({'id': par.get('id', ''), 't': par.get('title', 'Articles')}))
    h.append('</section></div>')
    return '\n'.join(h)


def resp():
    """the open "What the responses said" list, in date order (placed at @@RESP@@)"""
    h = ['<ul class="wp-resp">']
    for r in sorted(P.get('responses', []), key=lambda r: r['date']):
        h.append('<li><span class="kind">%s</span>%s<div class="by">%s, %s</div><p>%s</p></li>' % (E(r['kind']), A(url(r['u']), E(r['t'])), E(r['by']), day(r['date']), E(r['n'])))
    return '\n'.join(h + ['</ul>'])


def since():
    """the closed "Since the article" block's list (placed at @@SINCE@@): volatile follow-ups, dated"""
    return '<ul>' + ''.join('<li>%s (%s): %s</li>' % (A(r['u'], E(r['t'])), day(r['date']), E(r['n'])) for r in P.get('since', [])) + '</ul>'


def data():
    keep = {k: P[k] for k in ('title', 'url', 'published', 'updated', 'fetched') if k in P}
    return ('// Generated by mk_article.py from article.json (and DATA_EXTRA); do not edit by hand.\nwindow.ARTICLE='
            + json.dumps(dict(keep, **DATA_EXTRA), separators=(',', ':'), ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    for f, s in (('_gen_card.html', card()), ('_gen_more.html', more()), ('_gen_resp.html', resp()), ('_gen_since.html', since()), ('_gen_data.js', data())):
        open(os.path.join(HERE, 'parts', f), 'w', encoding='utf-8').write(s + '\n')
    print('mk_article: card, further reading and data written (%d fragments checked)' % len(USED))
    save_frags()
