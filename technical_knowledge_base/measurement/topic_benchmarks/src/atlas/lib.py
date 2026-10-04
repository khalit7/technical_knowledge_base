"""Helpers shared by the atlas row files (rows_*.py). Plain data; mk_atlas.py assembles and checks.

Row fields (short keys keep the JS payload small):
  id, n (name), fam (family id), yr (year first released), by (who made it)
  paper: source key of the first paper or announcement
  me (what it measures), fmt (format), met (metric)
  it: items {n: number or None, t: text, s: source key, q: verbatim quote checked against the source}
  gr: grading ids, cd: contamination-defence ids, st: status id, cont: contamination evidence or None
  ev: evidence list (first entry is the headline reading), each E(...)
  why: one sentence tying the evidence to the status
  iss: known issues [{t, s}]
  own: owning child page id ('kr', 'math', 'code', 'ag', 'lcm', 'pref', 'safe'; set in rows_fix.py) or 'root' (no child page)
  old: old-table row name (exact), corr: corrections to the old page [{c: claim, f: fix, s: source}]
  rel: related rows that must not be spliced with this one (other versions), mem: members of a grouped row
"""

SOURCES = {}


def S(key, t, u, d, kind='page', read=None):
    """Register a source: title, url, date of the document, kind; read = date we read it if it is a live page."""
    SOURCES[key] = {'t': t, 'u': u, 'd': d, 'k': kind}
    if read:
        SOURCES[key]['r'] = read
    return key


def E(v, unit, model, date, setting, kind, s, note=None, q=None):
    """One reading. kind: 'ind' (maintainer or third party) or 'lab' (vendor's own figure)."""
    e = {'v': v, 'u': unit, 'm': model, 'd': date, 'set': setting, 'k': kind, 's': s}
    if note:
        e['note'] = note
    if q:
        e['q'] = q
    return e


def I(t, s, n=None, q=None):
    d = {'t': t, 's': s}
    if n is not None:
        d['n'] = n
    if q:
        d['q'] = q
    return d


def X(t, s):
    return {'t': t, 's': s}


def C(claim, fix, s):
    return {'c': claim, 'f': fix, 's': s}


ROWS = []


def R(**k):
    k.setdefault('cd', ['none'])
    k.setdefault('iss', [])
    k.setdefault('corr', [])
    k.setdefault('rel', [])
    k.setdefault('ev', [])
    k.setdefault('cont', None)
    ROWS.append(k)
    return k


# Common sources
EPOCH = 'https://epoch.ai/benchmarks'
EPOCH_ZIP = 'https://epoch.ai/data/benchmark_data.zip'
S('ep', 'Epoch AI, Benchmarking hub data (benchmark_data.zip, CC BY 4.0)', EPOCH_ZIP, '2026-10-04', 'data', read='2026-10-04')
S('grid', 'Topic: llms, Benchmarks tab data (Artificial Analysis, ARC Prize, Epoch, LMArena, Datacurve readings)', 'https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286', '2026-10-01', 'kb', read='2026-10-01')
S('oldpage', 'Topic: benchmarks, old Notion page (master table)', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', '2026-10-01', 'kb')
S('kr', 'Knowledge and reasoning benchmarks (child page, old text)', 'https://app.notion.com/p/3c65c17b0d0d810f8574da3ffb860be5', '2026-09-22', 'kb')
S('ag', 'Agentic benchmarks (child page, old text)', 'https://app.notion.com/p/3c65c17b0d0d811fb926d7b91ef8234e', '2026-09-22', 'kb')


def AX(aid):
    """Source key for an arXiv paper; title and date are filled from inputs/arxiv_verified.json by mk_atlas.py."""
    key = 'ax:' + aid
    if key not in SOURCES:
        SOURCES[key] = {'t': None, 'u': 'https://arxiv.org/abs/' + aid, 'd': None, 'k': 'paper'}
    return key


def AA(slug, read='2026-10-01'):
    key = 'aa:' + slug
    S(key, 'Artificial Analysis, model page ' + slug + ' (per-evaluation scores; read for the Topic: llms grid)', 'https://artificialanalysis.ai/models/' + slug, read, 'leaderboard', read=read)
    return key


def EP(f, mv, setting, note=None, name=None):
    """Evidence copied from Epoch's CSV row (resolved by mk_atlas.py from inputs/epoch_frontier.json, never retyped)."""
    d = {'from': 'ep', 'f': f, 'mv': mv, 'set': setting}
    if note:
        d['note'] = note
    if name:
        d['m'] = name
    return d


def GRID(bid, setting=None, note=None):
    """Evidence copied from the Topic: llms grid's best independent cell for benchmark id bid (resolved by mk_atlas.py)."""
    d = {'from': 'grid', 'b': bid}
    if setting:
        d['set'] = setting
    if note:
        d['note'] = note
    return d
