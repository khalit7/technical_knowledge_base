#!/usr/bin/env python3
"""Proves the built page embeds exactly the recorded data and that its prose numbers follow from that data.

1. window.AGD in index.html equals src/out/gallery.json (pruned as gen_data.py prunes it) and src/out/census.json.
2. The page's JavaScript (parts/23_js_ag_1core.js, run in node by js_eq_py.mjs) gives the Python's numbers for every row.
3. Agreement with the root page: the Architecture map (src/map/out/map.json of Topic: llm-architecture) field for field
   on every shared model, and the Config calculator (src/out/cc_agree.json from cc_agree.mjs).
4. Every reconstruction of a gallery mismatch equals the gallery's printed figure.
5. Prose claims in the Reading and tab parts, each checked against the data.
Run from anywhere with the repo .venv Python, after src/build.sh: python3 src/checks/check_data.py
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
PAGE = os.path.dirname(SRC)
html = open(os.path.join(PAGE, 'index.html'), encoding='utf-8').read()
bad = []
AGD = json.loads(re.search(r'window\.AGD=(.*?);\n', html, re.S).group(1))
rows = json.load(open(os.path.join(SRC, 'out', 'gallery.json')))
census = json.load(open(os.path.join(SRC, 'out', 'census.json')))
sys.path.insert(0, SRC)
KEEP = re.search(r"KEEP = (\[.*?\])", open(os.path.join(SRC, 'gen_data.py')).read(), re.S).group(1)
KEEP = eval(KEEP)
pruned = [{k: r.get(k) for k in KEEP if r.get(k) not in (None, '', [], {}, False)} for r in rows]
if AGD['rows'] != pruned:
    for a, b in zip(AGD['rows'], pruned):
        if a != b:
            bad.append('row differs: %s %s' % (a.get('n'), sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))[:5]))
    if len(AGD['rows']) != len(pruned):
        bad.append('row count %d vs %d' % (len(AGD['rows']), len(pruned)))
if AGD['census'] != census:
    bad.append('census differs')

# 2. JS equals Python
js = json.loads(subprocess.run(['node', os.path.join(HERE, 'js_eq_py.mjs')], capture_output=True, text=True, check=True).stdout)
T = 131072
by = {r['n']: r for r in rows}
n_js = 0
for j in js:
    r = by[j['n']]
    if 'full' not in j:
        continue
    n_js += 1
    if j['full'] != r['kv'] * T:
        bad.append('JS full cache %s: %s vs %s' % (r['n'], j['full'], r['kv'] * T))
    if round(j['cred'] / T, 1) != r['kvw']:
        bad.append('JS credited %s: %s vs %s' % (r['n'], j['cred'] / T, r['kvw']))
    if j['expl'] != r['kv']:
        bad.append('JS explain total %s: %s vs %s' % (r['n'], j['expl'], r['kv']))
    nl = sum(c in 'LH' for c in r['mix'])
    if j['state'] != (r.get('st') or 0) * nl * 4:
        bad.append('JS state %s' % r['n'])

# 3a. the root Architecture map
M = json.load(open(os.path.join(PAGE, '..', 'src', 'map', 'out', 'map.json')))
gk = {r['repo'].lower(): r for r in rows if r.get('repo')}
n_map = 0
for m in M:
    if not m.get('cfgu'):
        continue
    repo = m['cfgu'].split('huggingface.co/')[1].split('/blob')[0].lower()
    if repo not in gk:
        continue
    n_map += 1
    g = gk[repo]
    for f in ['L', 'D', 'H', 'Hkv', 'dh', 'mix', 'ffn', 'pos', 'kv', 'kvw', 'W', 'E', 'k', 'sh', 'dff', 'dffe', 'theta', 'scale', 'dc', 'dr', 'V', 'st', 'tied']:
        if m.get(f) != g.get(f):
            bad.append('map disagrees on %s.%s: %r vs %r' % (m['n'], f, m.get(f), g.get(f)))
# 3b. the root Config calculator
cc = json.load(open(os.path.join(SRC, 'out', 'cc_agree.json')))
cc_ok = sum(1 for c in cc if c.get('ok'))
cc_err = [c['n'] for c in cc if c.get('err')]
cc_bad = [c['n'] for c in cc if not c.get('ok') and not c.get('err')]
if cc_bad:
    bad.append('calculator disagrees: %s' % cc_bad)
hf = json.load(open(os.path.join(SRC, 'out', 'hf_layer_types.json')))
hf_ok = sum(1 for x in hf['rows'] if x['status'] == 'agree')
hf_bad = sum(1 for x in hf['rows'] if x['status'] == 'DIFFER')
hf_skip = len(hf['rows']) - hf_ok - hf_bad
nonuni = sorted(x['n'] for x in hf['rows'] if x['status'].startswith('no per-layer') and len(set(by[x['n']]['mix'])) > 1)
if nonuni != ['Inkling', 'MiniMax M3 428B']:
    bad.append('a model without a transformers per-layer list has a non-uniform strip')

# 4. reconstructions
for r in rows:
    if r.get('galbytes') and abs(r['galbytes'] - r['gal']) > max(0.006 * r['gal'], 60):
        bad.append('reconstruction does not give the gallery figure: %s %s vs %s' % (r['n'], r['galbytes'], r['gal']))

# 5. prose
parts = os.path.join(SRC, 'parts')
prose = ''.join(open(os.path.join(parts, f), encoding='utf-8').read() for f in sorted(os.listdir(parts)) if f.endswith('.html'))
C26, C25, st = census['2026'], census['2025'], census['status']
KiB, MiB, GiB = 1024, 2 ** 20, 2 ** 30
R = by
held = lambda r, T, cred: sum(r['per'].get(c, 0) * (min(T, r['W']) if cred and c == 'S' and r.get('W') else T) for c in r['mix'][:r['L'] - (r.get('shared') or 0)]) * (r.get('passes') or 1)
HY = [sum(c in 'LH' for c in r['mix']) / len(r['mix'].replace('L', '').replace('H', '').replace('F', '')) for r in rows if r.get('mix') and not r.get('x') and any(c in 'LH' for c in r['mix']) and r['mix'].replace('L', '').replace('H', '').replace('F', '')]
MOE = [r for r in rows if r.get('E') and r.get('tot') and r.get('act') and not r.get('x') and r['dt'] >= '2025']
BIG = [round(100 * r['act'] / r['tot'], 1) for r in MOE if r['tot'] >= 500]
SMALL = [round(100 * r['act'] / r['tot'], 1) for r in MOE if r['tot'] <= 35]
stB = lambda r: (r.get('st') or 0) * sum(c in 'LH' for c in r['mix']) * 4
claims = [
    ('105 of the 109 models', census['n_cfg'] == 105 and census['n_gallery'] == 109),
    ('MLA in 16; no plain MHA at all', C26['mla'] == 16 and C26['mha'] == 0),
    ('median cache 68.6 KiB per token against 144 KiB for the 2025 models', round(C26['kv_median'] / KiB, 1) == 68.6 and C25['kv_median'] == 144 * KiB),
    ('windows in 25', C26['win'] == 25),
    ('linear or SSM hybrids in 20; trained sparse attention in 11', C26['hyb'] == 20 and C26['sparse'] == 11),
    ('MoE in 52 (39 add a shared expert and 31 keep their first layers dense); partial RoPE in 25; layers with no position in 5', C26['moe'] == 52 and C26['shared'] == 39 and C26['prefix'] == 31 and C26['prope'] == 25 and C26['nope'] == 5),
    ('RoPE, 61 of the 66 models of 2026', C26['rope'] == 61),
    ('looped in 1, cross-layer KV sharing in 2 of the 2026 models', C26['loops'] == 1 and C26['kvshare'] == 2),
    ('the gallery\'s 66 models of 2026: MLA in 16', C26['n'] == 66 and C26['mla'] == 16),
    ('The top of the list is Gemma 4 12B at 31.2 times', round(R['Gemma 4 12B']['kv'] / R['Gemma 4 12B']['kvw'], 1) == 31.2 and max(r['kv'] / r['kvw'] for r in rows if r.get('mix') and 'S' in r['mix'] and r.get('kv') and r.get('kvw') and not r.get('x')) == R['Gemma 4 12B']['kv'] / R['Gemma 4 12B']['kvw']),
    ('13 of the 23 sit between 2.9 and 3.1 to 1', len(HY) == 23 and sum(1 for q in HY if 2.85 <= q <= 3.1) == 13 and round(min(HY), 1) == 1.7 and max(HY) == 7),
    ('From 500B parameters up, 21 of 22 models run 2.9 to 6.4% of their weights per token', len(BIG) == 22 and sum(1 for v in BIG if 2.9 <= v <= 6.4) == 21 and max(BIG) == 10.0),
    ('at 35B and below the share is 8 to 21% (Mellum2 Thinking 20.8%)', min(SMALL) == 8.0 and max(SMALL) == 20.8),
    ('MiMo-V2-Flash and MiMo-V2.5: 217.5 KiB, not 144', R['Xiaomi MiMo-V2-Flash 309B']['kv'] == 217.5 * KiB and R['Xiaomi MiMo-V2.5 310B']['kv'] == 217.5 * KiB and R['Xiaomi MiMo-V2-Flash 309B']['galtxt'] == '144 KiB'),
    ('LongCat-Flash-Lite: 31.5 KiB, not 63', R['LongCat-Flash-Lite 68.5B-A3B']['kv'] == 31.5 * KiB and R['LongCat-Flash-Lite 68.5B-A3B']['galtxt'] == '63 KiB'),
    ('Step 3.5 Flash: 180 KiB against 192', R['Step 3.5 Flash 196B']['kv'] == 180 * KiB and R['Step 3.5 Flash 196B']['galtxt'] == '192 KiB'),
    ('72 KiB per token on the card, 36 KiB per token effective at 131,072 tokens; one full-context request holds 4.5 GiB, so 16 such requests need 72 GiB', R['GPT-OSS 120B']['kv'] == 72 * KiB and round(R['GPT-OSS 120B']['kvw'] / KiB) == 36 and round(held(R['GPT-OSS 120B'], T, True) / GiB, 1) == 4.5),
    ('24 × (512 + 64) × 2 = 27 KiB per token, 3.4 GiB at 131,072 tokens', R['Kimi K3']['mix'].count('M') == 24 and R['Kimi K3']['kv'] == 27 * KiB and round(R['Kimi K3']['kv'] * T / GiB, 1) == 3.4),
    ('a fixed state of 1,572,864 numbers each, 414 MiB per sequence', R['Kimi K3']['st'] == 1572864 and round(stB(R['Kimi K3']) / MiB) == 414),
    ('896 routed experts, 16 active, 2 shared; the first layer dense', R['Kimi K3']['E'] == 896 and R['Kimi K3']['k'] == 16 and R['Kimi K3']['sh'] == 2 and R['Kimi K3']['ffn'][:2] == 'de'),
    ('69 Kimi Delta Attention layers', R['Kimi K3']['mix'].count('L') == 69),
    ('(52 × 8 KiB × 1,024 = 416 MiB)', R['Gemma 3 27B']['mix'].count('S') == 52 and R['Gemma 3 27B']['per']['S'] == 8 * KiB and R['Gemma 3 27B']['W'] == 1024),
    ('10 × 8 KiB × 131,072 = 10 GiB', R['Gemma 3 27B']['mix'].count('G') == 10),
    ('About 10.4 GiB', round(held(R['Gemma 3 27B'], T, True) / GiB, 1) == 10.4 and R['Gemma 3 27B']['kv'] * T == 62 * GiB),
    ('nine such files', True),
    ('95 of the 101 figures', st['match'] == 95 and st['match'] + st['differs'] == 101),
    ('59 models agree layer for layer, 0 differ; the other 49', hf_ok == 59 and hf_bad == 0 and hf_skip == 49),
    ('19 need custom code (no class in transformers), 2 configs are rejected by their class', sum(1 for x in hf['rows'] if x['status'] == 'no transformers class') == 19 and sum(1 for x in hf['rows'] if x['status'].startswith('class rejects')) == 2),
    ('28 classes keep no per-layer list, 26 of them', sum(1 for x in hf['rows'] if x['status'].startswith('no per-layer')) == 28),
    ('all 46 models agree, 230 numbers, all equal', cc_ok == 46 and len(cc) == 46 and not cc_bad and not cc_err),
    ('The four Nemotron 3 MoE configs agree', sum(1 for x in cc if x['n'].startswith('Nemotron 3') and x['ok'] and x['mt'] == 'nemotron_h') >= 4),
    ('the 27 models both pages draw', n_map == 27),
    ('2,560 KiB per token, 320 GiB for one 128K request', 2 * 80 * 64 * 128 * 2 == 2560 * KiB),
    ('(Llama 3.1 70B: 64 query heads, 8 KV heads, 320 KiB per token)', R['Llama 3.1 70B']['H'] == 64 and R['Llama 3.1 70B']['Hkv'] == 8 and R['Llama 3.1 70B']['kv'] == 320 * KiB),
    ('Nemotron 3.5 Lightning keeps 6 KiB per token, Gemma 4 31B 840 KiB', R['Nemotron 3.5 Lightning 30B-A3B']['kv'] == 6 * KiB and R['Gemma 4 31B']['kv'] == 840 * KiB),
    ('3:1 (11 models, the most common)', True),
    ('windows from 128 tokens (11 models', sum(1 for r in rows if r.get('mix') and not r.get('x') and 'S' in r['mix'] and r.get('W') == 128) == 11),
    ('cuts the long-context cache 2 times for gpt-oss and 18 times for Gemma 4 31B', round(R['GPT-OSS 120B']['kv'] / R['GPT-OSS 120B']['kvw']) == 2 and round(R['Gemma 4 31B']['kv'] / R['Gemma 4 31B']['kvw']) == 18),
    ('8 experts per token is the most common choice (31 models)', sum(1 for r in rows if r.get('mix') and not r.get('x') and r['dt'] >= '2026' and 'e' in r['ffn'] and r.get('k') == 8) == 31),
    ('Kimi K3 and Ember-1 in all 24 attention layers', R['Kimi K3']['pos'].count('N') == 24 and R['Ember-1']['pos'].count('N') == 24),
    ('Llama 4 Maverick in 12 of 48 and SmolLM3 in 9 of 36', R['Llama 4 Maverick']['pos'].count('N') == 12 and R['SmolLM3 3B']['pos'].count('N') == 9),
    ('YaRN factors in 9 of the 2026 configs', sum(1 for r in rows if r.get('mix') and not r.get('x') and r['dt'] >= '2026' and (r.get('scale') or '').startswith('yarn')) == 9),
    ('names QK-norm for 19 of the 2026 models', C26['qk'] == 19),
    ('384 KiB per pass, 1.5 MiB per token', R['Ouro-Thinking 2.6B']['kv'] == 1536 * KiB and R['Ouro-Thinking 2.6B']['passes'] == 4),
    ('18 KiB and 56 KiB per token, not the gallery\'s 35 and 84', R['Gemma 4 E2B']['kv'] == 18 * KiB and R['Gemma 4 E4B']['kv'] == 56 * KiB),
    ('V4-Pro 30 CSA + 31 HCA layers, 7,928 bytes per token', R['DeepSeek V4-Pro']['kvc']['csa'] == 30 and R['DeepSeek V4-Pro']['kvc']['hca'] == 31 and R['DeepSeek V4-Pro']['kvc']['main'] == 7928),
    ('V4-Flash 21 CSA + 20 HCA layers plus 2 window-only layers, 5,536 bytes', R['DeepSeek V4-Flash']['kvc']['csa'] == 21 and R['DeepSeek V4-Flash']['kvc']['hca'] == 20 and R['DeepSeek V4-Flash']['kvc']['win'] == 2 and R['DeepSeek V4-Flash']['kvc']['main'] == 5536),
    ('this page\'s 180 KiB and the gallery\'s 192 KiB for Step 3.5 Flash', R['Step 3.5 Flash 196B']['kv'] == 180 * KiB),
    ('larger than the cache up to about 15,700 tokens', round(stB(R['Kimi K3']) / R['Kimi K3']['kv'], -2) == 15700),
    ('plus 15.25 KiB of indexer keys (61 × 128 × 2 bytes)', R['DeepSeek V3.2']['idx'] == 61 * 128 * 2 == 15.25 * KiB),
    ('about 46 KiB per token at 131,072 tokens, 105 GiB against 5.8 GiB', round(R['Gemma 4 31B']['kvw'] / KiB) == 46 and R['Gemma 4 31B']['kv'] * T == 105 * GiB and round(held(R['Gemma 4 31B'], T, True) / GiB, 1) == 5.8),
    ('72 MiB of FP32 state against 24 KiB per token, about 3,000 tokens', stB(R['Qwen3 Next 80B-A3B']) == 72 * MiB and R['Qwen3 Next 80B-A3B']['kv'] == 24 * KiB),
    ('31 of the 52 MoE models of 2026', C26['prefix'] == 31 and C26['moe'] == 52),
    ('about 130 GiB for 16 requests', int(16 * (held(R['Nemotron 3 Super 120B-A12B'], 2 ** 20, True) + stB(R['Nemotron 3 Super 120B-A12B'])) / GiB) == 130),
    ('160 MiB of Mamba-2 state', stB(R['Nemotron 3 Super 120B-A12B']) == 160 * MiB),
    ('57 KiB. The 12 global layers', round(R['Llama 4 Maverick']['kvw'] / KiB) == 57 and R['Llama 4 Maverick']['mix'].count('G') == 12),
    ('180 MiB / 30 KiB = 6,144 tokens', stB(R['Qwen3.5 397B']) == 180 * MiB and R['Qwen3.5 397B']['kv'] == 30 * KiB),
    ('6,144 bytes per token', R["Tiny GPT (this topic's running example)"]['kv'] == 6144),
]
for text, ok in claims:
    if text not in prose:
        bad.append('claim text not found in prose: ' + text)
    if not ok:
        bad.append('claim does not match data: ' + text)
# pasted outputs are real outputs
rep = open(os.path.join(SRC, 'out', 'report.txt')).read()
for line in re.findall(r'^(match +Gemma 3 27B .*)$', open(os.path.join(parts, '20_read_b.html')).read(), re.M):
    if line.replace('</div>', '').rstrip() not in rep:
        bad.append('pasted report line not in out/report.txt')
hft = open(os.path.join(SRC, 'out', 'hf_layer_types.txt')).read()
for line in re.findall(r'^((?:agree|transformers) .*)$', open(os.path.join(parts, '20_read_e.html')).read(), re.M):
    if line.replace('</div>', '').rstrip() not in [l.rstrip() for l in hft.splitlines()]:
        bad.append('pasted transformers output not in out/hf_layer_types.txt: ' + line[:50])
print('rows', len(rows), '| JS = Python on', n_js, 'rows | map shared', n_map, '| calculator agree', cc_ok, 'errors', cc_err, '| transformers agree', hf_ok, 'differ', hf_bad, 'not checkable', hf_skip, '| claims', len(claims))
print('\n'.join(bad) if bad else 'all checks pass')
sys.exit(1 if bad else 0)
