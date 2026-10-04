"""Check every quote ('q') in the atlas against its source text: arXiv abstracts first, else the full text
(arXiv HTML, falling back to ar5iv), else the fetched web page. Writes inputs/quote_checks.json
({source key or arXiv id: {quote: true/false}}). Pages are cached in the scratch folder given as argv[1]."""
import json, re, sys, pathlib, subprocess, hashlib, html
here = pathlib.Path(__file__).parent
cache = pathlib.Path(sys.argv[1]); cache.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(here))
import lib, rows_kr, rows_mc, rows_ag, rows_ot, rows_fix  # noqa
out_p = here / 'inputs' / 'quote_checks.json'
out = json.loads(out_p.read_text()) if out_p.exists() else {}
norm = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).replace('\\', '').strip()
def get(url):
    f = cache / (hashlib.md5(url.encode()).hexdigest() + '.html')
    if not f.exists() or f.stat().st_size < 500:
        subprocess.run(['curl', '-sL', '-m', '60', '-A', 'Mozilla/5.0', '-o', str(f), url])
    return f.read_text(errors='ignore') if f.exists() else ''
qs = []
for r in lib.ROWS:
    if r['it'].get('q'): qs.append((r['it']['s'], r['it']['q']))
    for e in r['ev']:
        if isinstance(e, dict) and e.get('q'): qs.append((e['s'], e['q']))
for s, q in qs:
    if s.startswith('ax:'):
        a = s[3:]; key = a
        t = norm(get('https://arxiv.org/html/' + a))
        if norm(q) not in t:
            t += norm(get('https://ar5iv.labs.arxiv.org/html/' + a))
    else:
        key = s; t = norm(get(lib.SOURCES[s]['u']))
    ok = norm(q) in t or norm(q).replace(',', '') in t.replace(',', '')
    out.setdefault(key, {})[q] = ok
    print('OK ' if ok else 'NO ', key, '|', q)
out_p.write_text(json.dumps(out, indent=1, ensure_ascii=False))
