"""Check that the built page embeds exactly the recorded data and that numbers written in the tab's prose match calc.py.
Usage: python3 check_page_data.py   (after build.sh). Exit 1 on any mismatch."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import calc  # noqa: E402
ROOT = os.path.join(HERE, '..', '..')
page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
bad = []
m = re.search(r'window\.CCD=(\{.*?\});\n', page, re.S)
ccd = json.loads(m.group(1))
part = open(os.path.join(HERE, '..', 'parts', '33_js_cc_0data.js'), encoding='utf-8').read()
if json.loads(re.search(r'window\.CCD=(\{.*\});', part, re.S).group(1)) != ccd: bad.append('page CCD differs from 33_js_cc_0data.js')
hub = json.load(open(os.path.join(HERE, 'inputs', 'hf_param_counts.json')))
val = {r['key']: r for r in json.load(open(os.path.join(HERE, 'out', 'validation.json')))}
cfgdir = os.path.join(HERE, '..', 'data', 'configs')
for mm in ccd['models']:
    k = mm['key']
    if mm['hub']['total'] != (hub.get(k) or {}).get('total'): bad.append('hub total ' + k)
    for f in ('mtp', 'vision', 'extra'):
        if mm['val'][f] != val[k][f]: bad.append('validation %s %s' % (f, k))
    raw = json.load(open(os.path.join(cfgdir, k + '.json')))
    if calc.params(calc.normalise(mm['cfg'])) != calc.params(calc.normalise(raw)): bad.append('pruned config changes the result: ' + k)
if 'Infinity' in m.group(1): bad.append('Infinity in data')

P = lambda k: calc.params(calc.normalise(json.load(open(os.path.join(cfgdir, k + '.json')))))
S = lambda k: calc.normalise(json.load(open(os.path.join(cfgdir, k + '.json'))))
prose = ''.join(open(os.path.join(HERE, '..', 'parts', f), encoding='utf-8').read() for f in ('33_tab_calc_a.html', '33_tab_calc_b.html', '33_tab_calc_c.html'))
l8 = P('llama-3.1-8b'); sm = P('smollm2-135m'); dv3 = val['deepseek-v3']; q06 = hub['qwen3-0.6b']['total']
kv8 = calc.cache(S('llama-3.1-8b'), 1)['kv']; nh = S('nemotron-h-8b'); c_nh = calc.cache(nh, 131072)
claims = [
    ('are 13% of it', round(100 * (l8['breakdown']['embedding'] + l8['breakdown']['unembedding']) / l8['total']) == 13),
    ('is 21% of a small model', round(100 * sm['breakdown']['embedding'] / sm['total']) == 21),
    ('128 KiB per token in BF16, not 512 KiB', kv8 == 128 * 1024),
    ('exactly 8,030,261,248', l8['total'] == 8030261248 == hub['llama-3.1-8b']['total']),
    ('the Hub says 0.75B', round(q06 / 1e9, 2) == 0.75),
    ('Hub\'s count of DeepSeek-V3 is 684.5B', round(hub['deepseek-v3']['total'] / 1e9, 1) == 684.5),
    ('671.0B main model', round(dv3['calc_total'] / 1e9, 1) == 671.0),
    ('13.5B MTP layer', round(dv3['mtp'] / 1e9, 1) == 13.5),
    ('41.5M FP32 block-scale', round(dv3['extra'] / 1e6, 1) == 41.5),
    ('8.6&times; too much (550 GB', round(kv8 / ((80e9 - 16e9) / (32 * 131072)), 1) == 8.6 and round(32 * calc.cache(S('llama-3.1-8b'), 131072)['total'] / 1e9) == 550),
    ('69 KiB per token', round(calc.cache(S('deepseek-v3'), 1)['kv'] / 1024) == 69),
    ('16 KiB per token plus 99 MiB', calc.cache(nh, 1)['kv'] == 16 * 1024 and round(c_nh['state'] / 2**20) == 99),
    ('72 GB for the batch in BF16', round(32 * c_nh['total'] / 1e9) == 72),
    ('38 GB with an FP8 cache', round(32 * calc.cache(nh, 131072, 1)['total'] / 1e9) == 38),
    ('about 57&times; smaller', round(2 * 128 * 128 / 576) == 57),
    ('2 of 8 experts plus the shared parts is 12.9B', round(P('mixtral-8x7b')['active'] / 1e9, 1) == 12.9),
    ('(3.3B active)', int(P('qwen3-30b-a3b')['active'] / 1e8) == 33),
    ('needs memory for 30.5B', round(P('qwen3-30b-a3b')['total'] / 1e9, 1) == 30.5),
    ('4 attention layers out of 52', sum(1 for l in nh['layers'] if l['mix'] and l['mix']['t'] == 'attn') == 4 and len(nh['layers']) == 52),
]
for text, ok in claims:
    if text not in prose: bad.append('prose text not found: ' + text)
    elif not ok: bad.append('prose number wrong: ' + text)
print('models', len(ccd['models']), 'prose claims', len(claims), 'problems', len(bad))
for b in bad: print(' ', b)
sys.exit(1 if bad else 0)
