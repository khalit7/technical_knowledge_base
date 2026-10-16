"""Mixing lab (root tab t-mix, prefix mx): every number the tab shows, computed here.

Reads (all in the repo):
  inputs/cards.json, inputs/units_measured.json, inputs/nemotron_cc.json   (this folder)
  ../../data_mixing/src/data/mx2_data.json      the data mixing child's verified numbers (Muennighoff, CMR, RegMix Table 4, recipes)
  ../../data_mixing/src/data/smoke.json         the child's CPU smoke test of the proxy experiment
  ../../data_mixing/src/data/proxy_runs.json    the proxy experiment's results, once run_pending.sh has run (optional)
  reference/papers/olmo_2/src/tables.json        OLMo 2 Tables 4, 5, 13 (transcribed from arXiv 2501.00656v3)
Writes mx_data.json (here) and ../parts/34_js_mx_0data.js (what the page embeds).
Run: python3 build_data.py   (standard library only)
"""
import json, math, os

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(H, '..', '..'))                      # topic folder
REPO = os.path.normpath(os.path.join(ROOT, '..', '..', '..'))              # repository root
CHILD = os.path.join(ROOT, 'data_mixing', 'src', 'data')
J = lambda p: json.load(open(p))

cards = J(os.path.join(H, 'inputs', 'cards.json'))
units = J(os.environ.get('MX_UNITS') or os.path.join(H, 'inputs', 'units_measured.json'))   # MX_UNITS: a test copy, never for the committed page
nemo = J(os.path.join(H, 'inputs', 'nemotron_cc.json'))
mx2 = J(os.path.join(CHILD, 'mx2_data.json'))
smoke = J(os.path.join(CHILD, 'smoke.json'))
olmo = J(os.path.join(REPO, 'technical_knowledge_base', 'reference', 'papers', 'olmo_2', 'src', 'tables.json'))
pr_path = os.environ.get('MX_PROXY') or os.path.join(CHILD, 'proxy_runs.json')   # MX_PROXY: a synthetic test file in scratch, never for the committed page
proxy = J(pr_path) if os.path.exists(pr_path) else None

# ---------------------------------------------------------------- 1. domain sizes in one unit (GPT-2 tokens)
ORDER = ['web', 'wiki', 'code', 'math', 'papers']
conv = {}
u = units['dclm_baseline']; conv['web'] = dict(ratio=u['gpt2'] / u['neox'], how='GPT-2 / GPT-NeoX tokens on the 2,000-document sample')
u = units['wikipedia_en']
nontext = units['wikipedia_en'].get('nontext_bytes_per_row', 60.6)       # url + title, measured on the sample (see README)
text_bytes = cards['wiki']['value'] - cards['wiki']['rows'] * nontext
bpt = u['utf8_bytes'] / u['gpt2']
conv['wiki'] = dict(ratio=None, text_bytes=text_bytes, bytes_per_token=bpt,
                    how='(dataset bytes - rows x %.1f bytes of url and title) / %.3f UTF-8 bytes per GPT-2 token on the sample' % (nontext, bpt))
u = units['stackv2_edu']
if 'comma' not in u:
    raise SystemExit('units_measured.json lacks the Comma tokenizer count for stackv2_edu: run measure_units.py with the Comma tokenizer')
conv['code'] = dict(ratio=u['gpt2'] / u['comma'], how='GPT-2 / Comma v0.1 tokens on the 2,000-document sample')
u = units['finemath_4plus']; conv['math'] = dict(ratio=u['gpt2'] / u['card_token_count_field'], how="GPT-2 tokens / the rows' own token_count field on the 2,000-document sample")
u = units['pes2o_v2']; conv['papers'] = dict(ratio=u['gpt2'] / u['ws_words'], how='GPT-2 tokens per whitespace word on the 1,000-document sample')

domains = []
for k in ORDER:
    c = cards[k]; cv = conv[k]
    g = cv['text_bytes'] / cv['bytes_per_token'] if k == 'wiki' else c['value'] * cv['ratio']
    domains.append(dict(key=k, name=c['name'], repo=c['repo'], rev=c['rev'][:8], quote=c['quote'], published=c['value'], unit=c['unit'],
                        ratio=None if cv.get('ratio') is None else round(cv['ratio'], 4), how=cv['how'], gpt2=round(g / 1e9, 2)))  # billions
U = [d['gpt2'] * 1e9 for d in domains]

# ---------------------------------------------------------------- 2. the calculator's maths (mirrored in 34_js_mx_2calc.js)
RS = mx2['muennighoff']['R_D_star']
def effective(unique, drawn):
    """Muennighoff et al. (arXiv 2305.16264) D' = U + U R* (1 - exp(-R/R*)), R = repetitions beyond the first pass."""
    if drawn <= unique: return drawn
    R = drawn / unique - 1
    return unique + unique * RS * (1 - math.exp(-R / RS))
def temperature(sizes, T):
    q = [s ** (1 / T) for s in sizes]; z = sum(q); return [x / z for x in q]
def unimax(sizes, budget, N):
    """UniMax (arXiv 2304.09151, Algorithm 1): smallest domains first; each gets min(N epochs, an equal share of what is left)."""
    order = sorted(range(len(sizes)), key=lambda i: sizes[i]); left = budget; alloc = [0.0] * len(sizes)
    for j, i in enumerate(order):
        share = left / (len(sizes) - j); alloc[i] = min(N * sizes[i], share); left -= alloc[i]
    tot = sum(alloc)   # budget larger than N epochs of everything: scale up (epochs then exceed N; the page says so)
    return [a / tot for a in alloc]
def plan(w, budget):
    rows = []
    for k, wi, ui in zip(ORDER, w, U):
        d = wi * budget; rows.append(dict(key=k, w=round(wi, 6), drawn=d, epochs=round(d / ui, 3), eff=effective(ui, d)))
    tot_eff = sum(r['eff'] for r in rows)
    return dict(rows=[dict(r, drawn=round(r['drawn'] / 1e9, 2), eff=round(r['eff'] / 1e9, 2)) for r in rows], eff=round(tot_eff / 1e9, 1), eff_frac=round(tot_eff / budget, 4))
examples = {}
for B in (1e12, 4e12, 15e12):
    for name, w in (('natural', temperature(U, 1)), ('T2', temperature(U, 2)), ('T333', temperature(U, 3.33)), ('T5', temperature(U, 5)), ('uniform', [0.2] * 5), ('unimax4', unimax(U, B, 4))):
        examples['%s_%dT' % (name, B / 1e12)] = plan(w, B)

# ---------------------------------------------------------------- 3. the same budget before and after mid-training (OLMo 2 7B)
def tok(s):
    s = s.strip(); m = {'T': 1e12, 'B': 1e9, 'M': 1e6, 'K': 1e3}[s[-1]]; return float(s[:-1]) * m
t4 = [r['c'] for r in olmo['t4']['rows'] if r['c'][0] != 'Total']
pool1 = sum(tok(c[2]) for c in t4)
GROUP1 = {'DCLM-Baseline': 'web', 'StarCoder filtered version from OLMoE Mix': 'code', 'peS2o from Dolma 1.7': 'papers', 'arXiv': 'papers',
          'OpenWebMath': 'math', 'Algebraic Stack': 'math', 'Wikipedia & Wikibooks from Dolma 1.7': 'wiki'}
st1 = {}
for c in t4: st1[GROUP1[c[0]]] = st1.get(GROUP1[c[0]], 0) + tok(c[2]) / pool1
t13 = [r['c'] for r in olmo['t13']['rows']]
GROUP2 = {'Filtered DCLM': 'hqweb', 'Decontam. FLAN': 'instr', 'StackExchange Q&A': 'instr', 'peS2o': 'papers', 'Wikipedia/Wikibooks': 'wiki', 'Dolmino Math': 'math'}
st2 = {}
for c in t13: st2[GROUP2[c[0]]] = st2.get(GROUP2[c[0]], 0) + float(c[3]) / 100
PRE, MID = 4e12, 50e9
math1 = st1['math'] * PRE; math2 = st2['math'] * MID
olmo2 = dict(pre=PRE, mid=MID, mid_frac=round(MID / (PRE + MID), 5), pool1=pool1, stage1=st1, stage2=st2,
             stage1_rows=[[c[0], c[1], c[2]] for c in t4], stage2_rows=[[c[0], c[1], c[3]] for c in t13],
             math_pre=round(math1 / 1e9, 2), math_mid=round(math2 / 1e9, 2), math_mid_share=round(math2 / (math1 + math2), 4),
             wiki_pre=round(st1['wiki'] * PRE / 1e9, 2), wiki_mid=round(st2['wiki'] * MID / 1e9, 2),
             static_math=round((math1 + math2) / (PRE + MID), 5), static_math_mid=round((math1 + math2) / (PRE + MID) * MID / 1e9, 3))

# how big the final stage is, by lab (published; fractions derived)
late = [
    dict(name='Llama 3 405B', what='annealing, final 40M tokens', late=40e6, total=15.6e12, src='Llama 3, Section 3.4.3', url='https://arxiv.org/abs/2407.21783'),
    dict(name='OLMo 2 7B', what='mid-training on 50B Dolmino tokens', late=50e9, total=4.05e12, src='OLMo 2, Table 9 caption', url='https://arxiv.org/abs/2501.00656'),
    dict(name='SmolLM2 1.7B', what='stage 4 (decay), 10T to 11T', late=1e12, total=11e12, src='SmolLM2, Section 4', url='https://arxiv.org/abs/2502.02737'),
    dict(name='SmolLM3 3B', what='stage 3 (decay), 9.90T to 11.14T', late=(11.14 - 9.90) * 1e12, total=11.14e12, src='huggingface/smollm configs at 438be18', url='https://github.com/huggingface/smollm/tree/438be18/text/pretraining/smollm3'),
    dict(name='Nemotron-CC 8B', what='phase 2, high quality only, last 6T', late=6e12, total=15e12, src='Nemotron-CC, Appendix E', url='https://arxiv.org/abs/2412.02595'),
]
for r in late: r['frac'] = r['late'] / r['total']

# ---------------------------------------------------------------- 4. long horizons: epochs over unique tokens (Nemotron-CC Table 4)
horizon = []
for r in nemo['table4']:
    for B in (1e12, 15e12):
        uq = r['unique'] * 1e12; e = B / uq; eff = effective(uq, B)
        horizon.append(dict(name=r['name'], total=r['total'], unique=r['unique'], synthetic=r['synthetic'], budget=B / 1e12,
                            epochs=round(e, 2), eff=round(eff / 1e12, 3), eff_frac=round(eff / B, 4)))

# ---------------------------------------------------------------- 5. proxy experiment: smoke (measured) and results (pending)
proxy_view = None
if proxy and 'fit' not in proxy:
    # only DoReMi ran (2026-10-16); the RegMix sweep and rank check were dropped (see the child's README)
    dm = proxy['doremi'][0]; names = proxy['names']
    proxy_view = dict(names=names, fit=None, device=dm.get('device'),
                      doremi=dict(ref_w=[round(dm['ref_weights'][n], 4) for n in names], avg_w=[round(dm['avg_weights'][n], 4) for n in names],
                                  ref_loss=[round(dm['ref_val_loss'][n], 3) for n in names], proxy_loss=[round(dm['proxy_val_loss'][n], 3) for n in names],
                                  steps=dm['config']['steps'], minutes=round((dm['seconds'] + dm['ref_seconds']) / 60)))
elif proxy:
    names = proxy['names']; runs = proxy['runs']
    f = proxy['fit']; t = [f['t'][n] for n in names]
    pts = []
    for r in runs:
        if not r['tag'].startswith('sweep_'): continue
        y = sum(r['val_loss'][n] for n in names) / len(names)
        p = f['c'] + math.exp(f['b'] + sum(ti * r['weights'][n] for ti, n in zip(t, names)))
        pts.append([round(y, 4), round(p, 4), [round(r['weights'][n], 4) for n in names]])
    anchors = {r['tag']: dict(w=[round(r['weights'][n], 4) for n in names], loss=round(sum(r['val_loss'][n] for n in names) / len(names), 4),
                              per=[round(r['val_loss'][n], 4) for n in names]) for r in runs if not r['tag'].startswith('sweep_')}
    proxy_view = dict(names=names, pts=pts, fit=f, anchors=anchors, doremi=[dict(w=d.get('weights'), steps=d.get('steps')) for d in proxy.get('doremi', [])][:2],
                      device=runs[0].get('device') if runs else None)

data = dict(
    as_of='2026-10-15',
    domains=domains, R_star=RS, muennighoff_table=mx2['muennighoff']['table'],
    examples=examples, olmo2=olmo2, late=late, horizon=horizon,
    nemo_quotes=nemo['quotes'],
    regmix_t4=mx2['regmix']['table4'], regmix_ratio=mx2['regmix']['ratio_flops_doremi'],
    cmr=mx2['cmr'], smollm2_t3=mx2['recipes']['smollm2_table3'],
    smoke=dict(date=smoke['date'], params_non_embedding=smoke['params_non_embedding'], params_total=smoke['params_total'],
               tokens_per_s=smoke['tokens_per_s'], pool_train_tokens=smoke['pool_train_tokens']),
    proxy=proxy_view,
)
json.dump(data, open(os.path.join(H, 'mx_data.json'), 'w'), indent=1)
js = '// generated by src/mix/build_data.py: do not edit\nwindow.MXD=' + json.dumps(data, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'src', 'parts', '34_js_mx_0data.js'), 'w').write(js)
print('domains (B GPT-2 tokens):', {d['key']: d['gpt2'] for d in domains})
print('olmo2 math pre/mid/share:', olmo2['math_pre'], olmo2['math_mid'], olmo2['math_mid_share'], 'mid_frac', olmo2['mid_frac'])
print('bytes embedded:', len(js), 'proxy:', 'yes' if proxy else 'pending')
