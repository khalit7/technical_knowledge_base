#!/usr/bin/env python3
"""Check the built page embeds exactly src/map/out data, that prose numbers in the map parts match the data,
and that KV per token agrees with the Architecture Gallery child page (its src/out/gallery.json) for every model both pages share.
Run from anywhere: python3 src/map/check_data.py (repo .venv)."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
bad = []


def glob_js(name):
    m = re.search(r'window\.' + name + r'=(.*?);\n', html, re.S)
    return json.loads(m.group(1))


AMD, AMS = glob_js('AMD'), glob_js('AMS')
rows = json.load(open(os.path.join(HERE, 'out', 'map.json')))
keep = set(AMD[0].keys()) | set().union(*[set(r.keys()) for r in AMD])
for a, r in zip(AMD, rows):
    for k, v in a.items():
        if r.get(k) != v:
            bad.append('AMD %s.%s page %r data %r' % (r['id'], k, v, r.get(k)))
if len(AMD) != len(rows):
    bad.append('row count %d vs %d' % (len(AMD), len(rows)))
if AMS != json.load(open(os.path.join(HERE, 'out', 'shifts.json'))):
    bad.append('AMS differs from out/shifts.json')
B = {r['id']: r for r in rows}
KiB, GiB = 1024, 2 ** 30
T = 131072
prose = open(os.path.join(ROOT, 'src', 'parts', '35_tab_map_a.html')).read() + open(os.path.join(ROOT, 'src', 'parts', '35_tab_map_b.html')).read() + open(os.path.join(ROOT, 'src', 'parts', '35_tab_map_z.html')).read()
cfg = lambda stem: json.load(open(os.path.join(HERE, 'inputs', 'configs', stem + '.json')))
claims = [
    ('46 models', len(rows) == 46),
    ('GPT-2 (2019) to Kimi K3 (July 2026)', rows[0]['id'] == 'gpt2' and rows[-1]['id'] == 'kimik3' and rows[-1]['dt'].startswith('2026-07')),
    ('3,904 KiB per token', 2 * 128 * 128 * 2 * 61 / KiB == 3904),
    ('576 x 61 x 2 bytes = 68.6 KiB', B['dsv3']['kv'] == 576 * 61 * 2 and round(B['dsv3']['kv'] / KiB, 1) == 68.6),
    ('num_key_value_heads: 128', cfg('deepseek-ai__DeepSeek-V3')['num_key_value_heads'] == 128),
    ('496 KiB per token', B['gemma3']['kv'] == 496 * KiB),
    ('62 GiB for one 131,072-token sequence', B['gemma3']['kv'] * T / GiB == 62),
    ('52 of its 62 layers', B['gemma3']['mix'].count('S') == 52 and B['gemma3']['L'] == 62 and B['gemma3']['W'] == 1024),
    ('10.4 GiB', round(B['gemma3']['kvw'] * T / GiB, 1) == 10.4),
    ('10,240,000', B['minimaxm1']['ctxc'] == 10240000),
    ('40,960', B['qwen3d']['ctxc'] == 40960),
    ('num_key_value_heads: 16', cfg('google__gemma-4-31B-it')['text_config']['num_key_value_heads'] == 16),
    ('num_global_key_value_heads: 4', cfg('google__gemma-4-31B-it')['text_config']['num_global_key_value_heads'] == 4),
    ('960 KiB per token', 60 * 2 * 16 * 256 * 2 / KiB == 960),
    ('give 840 KiB', B['gemma4']['kv'] == 840 * KiB),
    ('50 sliding layers', B['gemma4']['mix'].count('S') == 50),
    ('runs 5.1B parameters per token, but all 117B', B['gptoss']['act'] == '5.1B' and B['gptoss']['tot'] == '117B'),
    ('Mixtral 8x7B is 46.7B', B['mixtral']['tot'] == '46.7B'),
    ('the total is 400B', B['llama4']['tot'] == '400B'),
]
for text, ok in claims:
    if text not in prose:
        bad.append('claim text not found in prose: ' + text)
    if not ok:
        bad.append('claim does not match data: ' + text)
# Agreement with the gallery child page (its own recalculation from its own config copies)
gp = os.path.join(ROOT, 'llm_architecture_gallery', 'src', 'out', 'gallery.json')  # rows with repo and kv (gen_data.py)
n = 0
if not os.path.exists(gp):
    bad.append('gallery data not found: ' + gp)
else:
    gk = {g['repo'].lower(): g['kv'] for g in json.load(open(gp)) if g.get('kv') and g.get('repo')}
    for r in rows:
        if r.get('cfgu') and r.get('kv'):
            repo = r['cfgu'].split('huggingface.co/')[1].split('/blob')[0].lower()
            if repo in gk:
                n += 1
                if gk[repo] != r['kv']:
                    bad.append('gallery disagrees on %s: %s vs %s' % (r['n'], gk[repo], r['kv']))
print('shared with gallery:', n)
print('\n'.join(bad) if bad else 'all checks pass (%d claims)' % len(claims))
sys.exit(1 if bad else 0)
