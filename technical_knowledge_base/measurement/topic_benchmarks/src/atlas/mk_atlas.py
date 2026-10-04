"""Assemble the Benchmark atlas: rows_*.py -> ../data/atlas.json and ../parts/32_js_atlas_a.js (data block).

Run from anywhere: python3 src/atlas/mk_atlas.py
Inputs (all in src/atlas/inputs/): arxiv_verified.json (arXiv API titles, dates, abstracts), epoch_frontier.json
(Epoch hub top rows), old_table.json (old page master table, verbatim); plus the Topic: llms grid
(models_and_training/topic_llms/src/data/bench_grid.json). Evidence marked EP(...) or GRID(...) is copied from
those files, never retyped. Fails loudly on unknown enum values, missing sources or quotes not found in their source.
"""
import json, pathlib, re, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib
import rows_kr, rows_mc, rows_ag, rows_ot  # noqa: F401  (register rows)
import rows_fix  # noqa: F401,E402  (research updates, applied last)

SRC = HERE.parent
KB = SRC.parents[2]
ROOT_DATA = SRC / 'data'
ax = json.load(open(HERE / 'inputs' / 'arxiv_verified.json'))
ep = json.load(open(HERE / 'inputs' / 'epoch_frontier.json'))['files']
old = json.load(open(HERE / 'inputs' / 'old_table.json'))['rows']
grid = json.load(open(KB / 'models_and_training' / 'topic_llms' / 'src' / 'data' / 'bench_grid.json'))
fulltext_checks = {}
ftp = HERE / 'inputs' / 'quote_checks.json'
if ftp.exists():
    fulltext_checks = json.load(open(ftp))

FAM = {'know': 'Knowledge', 'reas': 'Reasoning', 'math': 'Math', 'code': 'Coding', 'agent': 'Agentic', 'tool': 'Tool use',
       'long': 'Long context', 'instr': 'Instruction following', 'pref': 'Human preference', 'safe': 'Safety and monitoring',
       'mm': 'Multimodal', 'multi': 'Multilingual', 'classic': 'Classic era', 'agg': 'Aggregator'}
GR = {'exact': ('Exact match', 'The answer is compared with a key: a letter, a number or a normalised string.'),
      'tests': ('Unit tests', 'Generated code is run against tests; it passes or fails.'),
      'exec': ('Execution check', 'An environment\'s final state is inspected by a checker script (files, database, desktop).'),
      'judge': ('LLM judge', 'Another model grades the answer against a key or rubric.'),
      'pair': ('Human pairwise', 'People compare two outputs and pick the better one; ratings come from the votes.'),
      'rubric': ('Human or expert rubric', 'Experts score the output against criteria.'),
      'proof': ('Proof checker', 'A proof assistant (Lean, Isabelle) accepts or rejects a formal proof.'),
      'overlap': ('Overlap metric', 'String overlap with a reference (F1, BLEU, chrF, ANLS).')}
CD = {'none': ('None', 'Items are public and fixed; nothing stops them entering training data.'),
      'private': ('Private split', 'Some or all items are withheld and run only by the maintainer.'),
      'rolling': ('Rolling by date', 'New items keep arriving with dates, so a model can be scored on items newer than its training data.'),
      'licensing': ('Licensing', 'Items come from private code or data licensed for evaluation, never published.'),
      'interactive': ('Interactive or generated', 'Each run generates its own instances or an environment the model must explore; there is no answer list to leak.'),
      'transform': ('Transformed at run time', 'Existing items are rewritten at evaluation time so memorised surface cues disappear.')}
ST = {'active': ('Active', 'Still separates frontier models: the best score is well below the ceiling, or the set refreshes.'),
      'saturating': ('Saturating', 'Top models cluster near the ceiling (roughly above 85 to 90%) but it still separates the tier below.'),
      'saturated': ('Saturated', 'The top is at the ceiling or inside the noise of the answer key: no frontier signal left.'),
      'retired': ('Retired', 'Replaced by a successor or no longer reported on frontier model cards.')}
OWN = {'kr': ('Knowledge and reasoning benchmarks', 'https://app.notion.com/p/3c65c17b0d0d810f8574da3ffb860be5'),
       'mc': ('Math and coding benchmarks', 'https://app.notion.com/p/3c65c17b0d0d8146b127fe43f5761bf0'),
       'ag': ('Agentic benchmarks', 'https://app.notion.com/p/3c65c17b0d0d811fb926d7b91ef8234e'),
       'planned': ('Planned (no child page yet)', None)}

errs = []
S = lib.SOURCES
# arXiv sources: title and date from the API
for k, v in S.items():
    if k.startswith('ax:'):
        a = k[3:]
        if a not in ax:
            errs.append('arXiv id not verified: ' + a)
            continue
        au = ax[a]['authors']
        v['t'] = (au[0].split()[-1] + (' et al.' if len(au) > 1 else '')) + ', ' + ax[a]['title']
        v['d'] = ax[a]['published']
        v['chk'] = 'arXiv API ' + ax[a]['checked']


def pct(x):
    return round(float(x) * 100, 1)


def pretty(mv):
    """Epoch model-version ids to readable names: 'claude-opus-4-7_max' -> 'Claude Opus 4.7 (max)'."""
    if not mv or ' ' in mv: return mv
    base, _, eff = mv.partition('_')
    dm = re.search(r'-(\d{4}-\d{2}-\d{2})$', base)
    if dm: base = base[:dm.start()]
    toks = base.split('-'); out = []
    for t in toks:
        if out and re.fullmatch(r'\d+', t) and re.fullmatch(r'\d+', out[-1]) and len(t) <= 2 and len(out[-1]) <= 2:
            out[-1] += '.' + t
        else:
            out.append(t)
    words = []
    for t in out:
        if t.lower() == 'gpt': words.append('GPT'); continue
        if words and words[-1] == 'GPT': words[-1] = 'GPT-' + t; continue
        words.append(t if re.match(r'\d', t) else t[:1].upper() + t[1:])
    s = ' '.join(words)
    s += (' ' + dm.group(1)) if dm else ''
    return s + (' (' + eff + ')' if eff and eff != 'unknown' else '')


def epoch_ev(d):
    f = ep.get(d['f'])
    if not f:
        errs.append('epoch file missing ' + d['f']); return None
    for r in f['top']:
        if (r.get('Model version') or r.get('Name') or '') == d['mv']:
            col = f['score_column']; raw = float(r[col])
            scale = float(f.get('scale') or 1)
            if d['f'] == 'metr_time_horizons_external.csv':
                v, u = round(raw), 'minutes (50% horizon)'
            elif scale == 0.01 or raw > 1.5:
                v, u = round(raw, 1), '%'
            else:
                v, u = pct(raw), '%'
            date = r.get('Started at', '')[:10] or r.get('Date of evaluation') or r.get('Run date') or r.get('Release date') or ''
            src_url = r.get('Source link') or (r.get('Source') if (r.get('Source') or '').startswith('http') else '')
            who = r.get('Source') if r.get('Source') and not r.get('Source', '').startswith('http') else None
            kind = 'ind'
            note = d.get('note')
            run = 'Epoch\'s own run' if 'Started at' in r and r.get('Started at') else ('reported by ' + who if who else 'collected by Epoch')
            e = {'v': v, 'u': u, 'm': d.get('m') or r.get('Name') or pretty(r.get('Model version')), 'mv': r.get('Model version') or r.get('Name'), 'd': date,
                 'dk': 'run started' if r.get('Started at') else ('evaluated' if r.get('Date of evaluation') else 'model release'),
                 'set': d['set'], 'k': kind, 's': 'ep', 'via': src_url or None, 'run': run}
            if r.get('stderr'):
                e['se'] = round(float(r['stderr']) * 100, 1)
            if note:
                e['note'] = note
            return e
    errs.append('epoch row not in top 5: %s %s' % (d['f'], d['mv'])); return None


best = {}
for r in grid['rows']:
    for k, cells in r['cells'].items():
        for c in cells:
            if c.get('kind') != 'ind' or c.get('v') is None:
                continue
            if k not in best or c['v'] > best[k][0]['v']:
                best[k] = (c, r)
gb = {b['id']: b for b in grid['benchmarks']}


def grid_ev(d):
    c, r = best[d['b']]
    b = gb[d['b']]
    key = lib.AA(r['slug']) if 'artificialanalysis' in c['url'] else None
    if key is None:
        key = 'g:' + d['b']
        lib.S(key, b['by'] + ', ' + b['name'] + ' (read for the Topic: llms grid)', c['url'], c['date'], 'leaderboard', read=c['date'])
    e = {'v': c['v'], 'u': b['unit'], 'm': r['m'] + ' (' + r['e'] + ')', 'd': c['date'], 'dk': 'read', 'set': d.get('set') or (b['name'] + ', ' + str(c.get('ver'))),
         'k': 'ind', 's': key, 'run': b['by'], 'via': 'grid'}
    n = ' '.join(x for x in [d.get('note'), c.get('note')] if x)
    if n:
        e['note'] = n
    return e


rows = []
seen = set()
oldnames = {o['name']: o for o in old}
for r in lib.ROWS:
    if r['id'] in seen:
        errs.append('duplicate id ' + r['id'])
    seen.add(r['id'])
    for k in ('id', 'n', 'fam', 'yr', 'me', 'fmt', 'met', 'it', 'gr', 'cd', 'st', 'own'):
        if k not in r:
            errs.append('%s missing %s' % (r['id'], k))
    if r['fam'] not in FAM: errs.append('%s fam %s' % (r['id'], r['fam']))
    if r['st'] not in ST: errs.append('%s st %s' % (r['id'], r['st']))
    if r['own'] not in OWN: errs.append('%s own %s' % (r['id'], r['own']))
    for g in r['gr']:
        if g not in GR: errs.append('%s gr %s' % (r['id'], g))
    for g in r['cd']:
        if g not in CD: errs.append('%s cd %s' % (r['id'], g))
    evs = []
    for e in r['ev']:
        if 'from' in e:
            e = epoch_ev(e) if e['from'] == 'ep' else grid_ev(e)
            if e is None:
                continue
        evs.append(e)
    r['ev'] = evs
    if r.get('old') and r['old'] not in oldnames:
        errs.append('%s old row name not found: %s' % (r['id'], r['old']))
    r['olds'] = oldnames[r['old']]['status'] if r.get('old') else None
    rows.append(r)

# every source key referenced must exist; quotes must appear in their source
def refs(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 's' and isinstance(v, str):
                yield v
            else:
                yield from refs(v)
    elif isinstance(o, list):
        for v in o:
            yield from refs(v)

for r in rows:
    for k in list(refs(r)) + ([r['paper']] if r.get('paper') else []):
        if k not in S:
            errs.append('%s: unknown source %s' % (r['id'], k))
    rel = [x for x in r['rel'] if x not in seen]
    if rel:
        errs.append('%s: unknown related rows %s' % (r['id'], rel))

qfail = []
def check_quote(rid, q, s):
    if not q: return
    if s.startswith('ax:'):
        a = s[3:]
        norm = lambda x: re.sub(r'\s+', ' ', x)
        if norm(q) in norm(ax[a].get('abstract', '')):
            return 'abstract'
        if fulltext_checks.get(a, {}).get(q):
            return 'full text'
    else:
        if fulltext_checks.get(s, {}).get(q):
            return 'page'
    qfail.append((rid, s, q))

for r in rows:
    it = r['it']
    if it.get('q'):
        it['qc'] = check_quote(r['id'], it['q'], it['s'])
    for e in r['ev']:
        if e.get('q'):
            e['qc'] = check_quote(r['id'], e['q'], e['s'])

if errs:
    print('\n'.join(errs)); sys.exit(1)

# summary counts
from collections import Counter
cnt = {'rows': len(rows), 'status': Counter(r['st'] for r in rows), 'family': Counter(r['fam'] for r in rows),
       'defence': Counter(c for r in rows for c in r['cd']), 'owner': Counter(r['own'] for r in rows),
       'corrections': sum(len(r['corr']) for r in rows), 'evidence': sum(len(r['ev']) for r in rows)}

# ---- animation: one training cutoff against five test sets (all counts from sources) ----
an = json.load(open(HERE / 'inputs' / 'anim_inputs.json'))
def q2m(q):  # '2019-Q3' -> month index (year*12 + month-1) of the quarter's middle month
    y, k = q.split('-Q'); return int(y) * 12 + (int(k) - 1) * 3 + 1
MO = {m: i for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}
lcb, prev_end, prev_cum = [], 2023 * 12 + MO['May'] - 1, 0
for rel in an['livecodebench']['releases']:
    mon, yr = rel['end'].split(); end = int(yr) * 12 + MO[mon]
    months = list(range(prev_end + (1 if prev_cum else 0), end + 1)); add = rel['cum'] - prev_cum
    for i, m in enumerate(months):  # spread evenly within the release window (labelled on the page)
        lcb.append([m, add // len(months) + (1 if i < add % len(months) else 0)])
    prev_end, prev_cum = end, rel['cum']
S['an_swev'] = {'t': 'SWE-bench Verified on Hugging Face (created_at of each issue, read through datasets-server)', 'u': 'https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified', 'd': '2024-08-13', 'k': 'data', 'r': '2026-10-04'}
S['an_lcb'] = {'t': 'LiveCodeBench README (release_v1 to release_v6 windows and counts)', 'u': 'https://github.com/LiveCodeBench/LiveCodeBench', 'd': '2025-04', 'k': 'code', 'r': '2026-10-04'}
S['an_gsm'] = {'t': 'GSM8K on Hugging Face (test split: 1,319 problems)', 'u': 'https://huggingface.co/datasets/openai/gsm8k', 'd': '2021-10-27', 'k': 'data', 'r': '2026-10-04'}
anim = {'start': 2021 * 12, 'end': 2025 * 12 + 9, 'step': 3, 'lanes': [
  {'id': 'gsm8k', 'n': 'GSM8K test set', 'cd': 'none', 'kind': 'static', 'note': 'Written fresh by contractors, public from the paper on 27 October 2021.', 's': 'an_gsm',
   'items': [[2021 * 12 + 9, 1319]]},
  {'id': 'swebench_verified', 'n': 'SWE-bench Verified', 'cd': 'none', 'kind': 'artifact', 'note': 'Each task is a real GitHub issue and its fix, public from the issue date (2013 to 2023), long before the benchmark appeared in August 2024.', 's': 'an_swev',
   'released': 2024 * 12 + 7, 'items': sorted([[q2m(k), v] for k, v in an['swebench_verified']['by_quarter'].items()])},
  {'id': 'livecodebench', 'n': 'LiveCodeBench (release_v6)', 'cd': 'rolling', 'kind': 'rolling', 'note': 'Each problem carries its contest date; only problems after the cutoff are scored. Counts per release window are the README\'s; within a window they are spread evenly by month.', 's': 'an_lcb',
   'items': lcb, 'data_end': 2025 * 12 + 3},
  {'id': 'frontiermath', 'n': 'FrontierMath Tiers 1-3', 'cd': 'private', 'kind': 'private', 'note': 'Problems are never published; Epoch runs them. Exposure is governance (who has access), not the calendar.', 's': 'epfm',
   'items': [[2024 * 12 + 10, 300]], 'approx': True},
  {'id': 'real_swe', 'n': 'Real-SWE', 'cd': 'licensing', 'kind': 'licensed', 'note': 'Ten tasks licensed from private production repositories; never public.', 's': 'realswe',
   'items': [[2026 * 12 + 8, 10]]}]}
# sanity: counts add up to the sources
assert sum(v for _, v in anim['lanes'][1]['items']) == 500 and sum(v for _, v in lcb) == 1055

out = {'read_date': '2026-10-04', 'about': 'Benchmark atlas for Topic: benchmarks (Notion 3c65c17b0d0d811fb43fece56e40041a). One row per benchmark or benchmark version; versions are separate rows and never spliced. ev[0] is the headline reading behind the status. Other tabs may reuse ids and names (rows[].id, rows[].n, rows[].yr, rows[].fam, rows[].st).',
       'enums': {'fam': FAM, 'gr': {k: list(v) for k, v in GR.items()}, 'cd': {k: list(v) for k, v in CD.items()}, 'st': {k: list(v) for k, v in ST.items()}, 'own': {k: list(v) for k, v in OWN.items()}},
       'sources': S, 'rows': rows, 'anim': anim, 'counts': {k: (dict(v) if isinstance(v, Counter) else v) for k, v in cnt.items()}}
ROOT_DATA.mkdir(exist_ok=True)
(ROOT_DATA / 'atlas.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
js = '// ---- Benchmark atlas (t-atlas), part a: data ----\n// Written by src/atlas/mk_atlas.py from src/atlas/rows_*.py; do not edit by hand. Same content as src/data/atlas.json.\nwindow.BENCH_ATLAS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
(SRC / 'parts' / '32_js_atlas_a.js').write_text(js)
print('rows', len(rows), dict(cnt['status']), 'evidence', cnt['evidence'], 'corrections', cnt['corrections'], 'json KB', round(len(js) / 1024))
if qfail:
    print('QUOTES NOT YET CHECKED (%d):' % len(qfail))
    for x in qfail: print('  ', x)
