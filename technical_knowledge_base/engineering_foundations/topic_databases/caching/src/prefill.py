"""Write every measured number into the built page's text at build time: <span class="nv" data-n="path" data-f="fmt"></span>
is filled from window.CA (parts/22_js_data.js) with the same formats as parts/26_js_fill.js, so the numbers are in the
static HTML (readable without JavaScript, and visible to html_utils/ledger.py check). 26_js_fill.js still runs and
writes the same text. usage: python3 prefill.py ../index.html"""
import json, math, re, sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

H = Path(__file__).resolve().parent
src = (H / 'parts' / '22_js_data.js').read_text()
CA = json.loads(src[src.index('window.CA=') + len('window.CA='):].strip().rstrip(';'))


def get(p):
    o = CA
    for k in p.split('.'):
        o = None if o is None else o.get(k)
    return o


def rnd(v):  # JavaScript Math.round
    return math.floor(v + 0.5)


def fixed(v, n):  # JavaScript toFixed: exact binary value, ties away from zero
    return str(Decimal(v).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP))


F = {'int': lambda v: f'{rnd(v):,}', 'mb': lambda v: fixed(v / 1048576, 1), 'gb': lambda v: fixed(v / 1073741824, 2),
     'kb': lambda v: f'{rnd(v / 1024):,}', 'x1': lambda v: fixed(v, 1), 'x2': lambda v: fixed(v, 2), 'x3': lambda v: fixed(v, 3),
     'pct': lambda v: f'{rnd(v * 100)}%', 'raw': lambda v: (str(int(v)) if isinstance(v, float) and v.is_integer() else str(v))}


def fill(m):
    attrs = m.group(1)
    p = re.search(r'data-n="([^"]+)"', attrs).group(1)
    f = (re.search(r'data-f="([^"]+)"', attrs) or [None, None])[1]
    if '/' in p:
        a, b = p.split('/'); v = get(a) / get(b); f = f or 'x1'
    else:
        v = get(p); f = f or 'raw'
    if v is None:
        sys.exit('prefill: missing number ' + p)
    return '<span' + attrs + '>' + F[f](v) + '</span>'


out = Path(sys.argv[1])
s = out.read_text()
s, n = re.subn(r'<span((?=[^>]*class="nv")[^>]*)></span>', fill, s)
out.write_text(s)
print('prefill:', n, 'numbers written')
