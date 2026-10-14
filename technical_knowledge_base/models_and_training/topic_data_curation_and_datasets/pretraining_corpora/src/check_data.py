"""Checks that the built page carries exactly the recorded data and that numbers in the prose agree with their sources.
1. parts/22_pc_data.js equals what build_data.py makes from data/ (rebuilt and compared), and its blocks equal the files.
2. Every @@key@@ in the parts has a fact; index.html has no unfilled @@ and no em-dash.
3. Literal numbers in the prose are recomputed: T5 Table 8 cells against the T5 paper page's tables.json, the running
   example's counts against data/kept.json, published study cells against data/ablations.json, robots shares.
4. If DC_SCRATCH is set: the reduced files agree with the scratch measurements they came from.
5. Privacy: no home path, scratch path, login name, tokens or e-mail addresses anywhere in this page's folder.
usage: python3 check_data.py   (stdlib only)
"""
import json, os, re, subprocess, sys

H = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(H)
bad = []


def ok(c, m):
    if not c:
        bad.append(m)
    print(('ok   ' if c else 'FAIL ') + m)


js_p = os.path.join(H, 'parts', '22_pc_data.js')
before = open(js_p).read()
subprocess.run([sys.executable, os.path.join(H, 'build_data.py')], check=True, capture_output=True)
after = open(js_p).read()
ok(before == after, 'embedded data is what build_data.py makes from data/')
PC = json.loads(after.split('window.PC=', 1)[1].rstrip().rstrip(';'))
D = lambda n: json.load(open(os.path.join(H, 'data', n)))
for k in ('corpora', 'ablations', 'mixes', 'measured', 'kept'):
    ok(PC[k] == D(k + '.json'), f'PC.{k} = data/{k}.json')
ok(PC['robots'] == D('robots_optout.json'), 'PC.robots = data/robots_optout.json')

F = D('facts.json')
keys = set()
for f in os.listdir(os.path.join(H, 'parts')):
    keys |= set(re.findall(r'@@([a-z0-9_]+)@@', open(os.path.join(H, 'parts', f)).read()))
ok(keys <= set(F), 'every @@key@@ in the parts has a fact' + ('' if keys <= set(F) else ': missing ' + ', '.join(sorted(keys - set(F)))))
html = open(os.path.join(P, 'index.html')).read()
ok('@@' not in html, 'no unfilled @@ in index.html')
ok('—' not in html, 'no em-dash in index.html')
text = re.sub(r'<[^>]+>', ' ', html)

# T5 Table 8 cells quoted in section 3, against the T5 paper page's own extraction
t5 = json.load(open(os.path.join(P, '..', '..', '..', 'reference', 'papers', 't5', 'src', 'tables.json')))['T8']['rows']
cells = {r['name']: r['v'] for r in t5}
for name, cols in [('C4', (0, 2, 3, 4)), ('C4, unfiltered', (0, 2, 3, 4)), ('Wikipedia', (0, 2, 3, 4)), ('Wikipedia + TBC', (0, 2, 3, 4))]:
    for c in cols:
        ok(cells[name][c] in text, f'T5 Table 8 {name} column {c} = {cells[name][c]} appears in the page')
# the running example
K = D('kept.json')
ok(K['code'].count('1') + K['code'].count('2') == K['fineweb'], 'kept.code has as many FineWeb pages as kept.fineweb')
ok(K['code'].count('2') == K['fineweb_edu'] == 159, 'FineWeb-Edu pages = 159')
ok(len(K['code']) == K['html200'], 'one code per HTML page')
ok(len(K['edu_scores_measured']) == K['fineweb'] == len(K['fw_tokens_gpt2']), 'one score and token count per FineWeb page')
ok(F['kp_fw'] == f"{K['fineweb']:,}" and F['kp_html'] == f"{K['html200']:,}", 'prose counts = kept.json')
# published studies quoted in prose
A = {s['id']: s for s in D('ablations.json')}
nem = dict(A['nem_t5']['rows'])
ok(abs(nem['Nemotron-CC-HQ'] - nem['DCLM-Baseline'] - 5.6) < 1e-9, 'Nemotron-CC-HQ minus DCLM MMLU = 5.6')
ok('59.0 against 53.4' in text, 'prose quotes 59.0 against 53.4')
d4 = dict(A['dclm_t4']['rows'])
ok(d4['fastText OH-2.5 + ELI5 (top 10%)'] == 30.2 and d4['RefinedWeb reproduction (no model filter)'] == 27.5 and '30.2 Core against 27.5' in text, 'DCLM Table 4 cells quoted = data')
osr = dict(A['osr_t5']['rows'])
ok((osr['Nemotron-CC-HQ'], osr['DCLM-Baseline'], osr['FineWeb-Edu']) == (0.66, 0.57, 0.56) and '0.66, 0.57, 0.56' in text, 'open-sci-ref averages quoted = data')
fw = dict(A['fw_csv']['rows'])
ok(round(fw['FineWeb'] - fw['Dolma v1.6 (CC part)'], 2) == 0.84 and '0.84 points' in text, 'FineWeb csv: top four within 0.84 points')
# robots shares
R = D('robots_optout.json')
for c in ('CC-MAIN-2023-23', 'CC-MAIN-2026-39'):
    k = c.replace('CC-MAIN-', '').replace('-', '_')
    v = f"{100 * R['crawls'][c]['full_block_share_of_parsed']['GPTBot']:.1f}%"
    ok(F[f'rb_{k}_gptbot'] == v and v in text, f'GPTBot share {c} = {v} in prose')
# corpus sizes quoted in prose against the corpus table
C = {c['id']: c for c in D('corpora.json')}
for cid, s in [('fineweb', '18,306.0B'), ('nemotron_cc2', '5,868.0B'), ('dolma3', '9.31T'), ('finepdfs', '2,918.79B')]:
    ok(s in json.dumps(C[cid], ensure_ascii=False) and (s in text or s.replace(',', '') in text or cid == 'fineweb'), f'{cid} size {s} in data and prose')

if os.environ.get('DC_SCRATCH'):
    S = os.path.join(os.environ['DC_SCRATCH'], 'data', 'pc')
    Ks = json.load(open(os.path.join(S, 'kept.json')))['summary']
    ok(Ks['fineweb'] == K['fineweb'] and Ks['html_200'] == K['html200'], 'kept.json = scratch WARC scan')
    M = D('measured.json')['samples']
    for n in M:
        ms = json.load(open(os.path.join(S, 'measure', n + '.json')))['summary']
        if ms['pass'] != M[n]['pass'] or ms['chars_per_token'] != M[n]['cpt']:
            ok(False, f'measured {n} = scratch measurement')
    ok(True, 'measured.json pass rates and token ratios = scratch measurements')
else:
    print('skip scratch comparison (DC_SCRATCH unset)')

# privacy
login = os.environ.get('USER', '')  # the login name, read at run time so this file does not contain it
pat = re.compile('|'.join(['/' + 'Users/', 'Users' + '-', re.escape(login) if login else 'x^', 'gl' + 'pat', 'sk' + '-ant', r'[\w.+-]+@[\w-]+\.(?:com|org|net|ai|io|edu)\b']), re.I)
hits = []
for root, dirs, files in os.walk(P):
    dirs[:] = [d for d in dirs if d not in ('.shots', '__pycache__')]
    for f in files:
        p = os.path.join(root, f)
        try:
            t = open(p, encoding='utf-8').read()
        except Exception:
            continue
        for m in pat.finditer(t):
            if m.group(0).lower() not in ('[email]',):
                hits.append(f'{os.path.relpath(p, P)}: {m.group(0)}')
ok(not hits, 'privacy grep clean' + ('' if not hits else ': ' + '; '.join(hits[:10])))
print('FAIL' if bad else 'ALL OK', len(bad))
sys.exit(1 if bad else 0)
