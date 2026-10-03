"""Recompute every derived number on the Price list tab and validate data/price.json.
Run after mk_price.py:  python3 check_price.py   (exits 1 on any failure)
"""
import json, os, math, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(os.path.dirname(HERE), 'data', 'price.json')))
runs = {r['id']: r for r in D['runs']}
fails = 0


def chk(claim, got, want, tol=0.005):
    global fails
    ok = abs(got - want) <= tol * max(abs(want), 1e-12)
    print(('ok  ' if ok else 'FAIL'), claim, '| got', round(got, 4), '| want', want)
    fails += not ok


def fig(rid, unit, i=0):
    return [f for f in runs[rid]['figs'] if f['unit'] == unit][i]['v']


# --- schema
items = [k for k, _ in D['inc_items']]
for r in D['runs']:
    for k in ('id', 'name', 'org', 'stage', 'date', 'bought', 'figs', 'src'):
        assert k in r, (r.get('id'), k)
    assert r['stage'] in [s[0] for s in D['stages']], r['id']
    for s in r['src']:
        assert s in D['sources'], (r['id'], s)
    for f in r['figs']:
        assert f['unit'] in ('usd', 'gpuh', 'flop') and f['kind'] in D['kind'], (r['id'], f)
        assert sorted(f['inc']) == sorted(items) and set(f['inc'].values()) <= set('ynu'), (r['id'], f['inc'])
        assert f['inc']['run'] == 'y', r['id']
        if f['unit'] == 'usd':
            assert f.get('cost') in D['cost'], (r['id'], 'usd figure needs cost')
        if f['unit'] == 'gpuh':
            assert f.get('gpu'), (r['id'], 'GPU-hours need a GPU type')
        assert f['v'] > 0 and math.isfinite(f['v'])
print('schema ok:', len(D['runs']), 'runs,', sum(len(r['figs']) for r in D['runs']), 'figures')
txt = json.dumps(D, ensure_ascii=False)
assert '—' not in txt, 'em dash in data'

# --- DeepSeek-V3 (Table 1)
chk('V3: 2664K + 119K + 5K GPU-hours', sum(p['gpuh'] for p in runs['dsv3']['parts']), 2.788e6)
chk('V3: 2,788K x $2', fig('dsv3', 'gpuh') * 2, fig('dsv3', 'usd'))
chk('V3: stage dollars sum to $5.576M', sum(p['usd'] for p in runs['dsv3']['parts']), 5.576e6)
for p in runs['dsv3']['parts']:
    chk('V3 %s at $2' % p['name'], p['gpuh'] * 2, p['usd'], 0.01)
# --- DeepSeek-R1 (Table 7)
chk('R1: 101K + 5K + 41K', sum(p['gpuh'] for p in runs['dsr1']['parts']), 1.47e5)
chk('R1: x $2 = $294K', fig('dsr1', 'gpuh') * 2, fig('dsr1', 'usd'))
chk('R1-Zero: 512 GPUs x 198 h ~ 101K', 512 * 198, 1.01e5, 0.01)
chk('R1: 512 x 80 h ~ 41K', 512 * 80, 0.41e5, 0.005)
chk('R1 as a share of V3 GPU-hours (%)', 100 * 1.47e5 / 2.788e6, 5.3, 0.01)
# --- Llama 3.1
chk('Llama 3.1: 1.46M + 7.0M + 30.84M = 39.3M', fig('llama8', 'gpuh') + fig('llama70', 'gpuh') + fig('llama405', 'gpuh'), 39.3e6)
chk('Llama 3.1 405B: 6 x 405B x 15.6T', 6 * 405e9 * 15.6e12, 3.8e25, 0.01)
# --- derived GPU-hours
for rid, want in [('qorl', 2 * 95), ('alpaca', 8 * 3), ('vicuna', 8 * 24), ('s1', 16 * 26 / 60), ('skyt1', 8 * 19), ('llmc124', 8 * 1.5), ('llmc16', 8 * 24),
                  ('nanochat', 8 * 1.65), ('speed1', 8 * 45 / 60), ('speed92', 8 * 0.665 / 60)]:
    chk(rid + ' GPU-hours', fig(rid, 'gpuh'), want)
chk('Postgres: $800 + $400', 800 + 400, fig('qorl', 'usd'))
chk('Alpaca: <$500 + <$100', 500 + 100, fig('alpaca', 'usd'))
chk('llm.c 1.6B: $672 / 24 h = $28 an hour', 672 / 24, 28)
chk('llm.c 1.6B: $28 / 8 GPUs', 28 / 8, 3.5)
chk('llm.c 124M: 1.5 h x ~$14', 1.5 * 14, 21, 0.01)  # stated "~$20"
chk('nanochat: 2 h x $24', 2 * 24, fig('nanochat', 'usd'))
chk('nanochat record: 1.65 h x $24 ~ $40', 1.65 * 24, 39.6)
chk('s1: $50 / 6.93 H100-hours', 50 / fig('s1', 'gpuh'), 7.21, 0.01)
chk('s1: $20 / 6.93 H100-hours', 20 / fig('s1', 'gpuh'), 2.885, 0.01)
chk('speedrun: 45 / 0.665', 45 / 0.665, 67.7, 0.005)
# --- 2026 runs
chk('Thomson: $40M / $450K', fig('thomson', 'usd', 1) / fig('thomson', 'usd', 0), 88.9, 0.005)
chk('MiMo Pro / Thomson final run', fig('mimo_pro', 'usd') / fig('thomson', 'usd', 0), 5.82, 0.005)
chk('old page: Thomson $40M / MiMo Pro (the "divided by about fifteen")', 4e7 / fig('mimo_pro', 'usd'), 15.27, 0.005)
chk('Postgres to MiMo Pro', fig('mimo_pro', 'usd') / fig('qorl', 'usd'), 2183, 0.001)
chk('Periodic: 1,300 H200 x $2.5 an hour', 1300 * 2.5, 3250)
chk('Periodic: days for $1.2M at that rate', 1.2e6 / 3250 / 24, 15.4, 0.01)
# --- Magic
chk('Magic: DSv4 Pro 6ND', 6 * 48852265054 * 33e12, fig('dsv4pro', 'flop'), 0.005)
chk('Magic: 9.67e24 / 1.58e23', fig('dsv4pro', 'flop') / fig('magic23', 'flop'), 61.2, 0.005)
chk('Magic: e24 / e23 FLOPs', fig('magic24', 'flop') / fig('magic23', 'flop'), 10.3, 0.005)
chk('Magic: e24 / e23 dollars', fig('magic24', 'usd') / fig('magic23', 'usd'), 8)
chk('Magic: e23 is about half of GPT-3', fig('magic23', 'flop') / fig('gpt3', 'flop'), 0.503, 0.01)
mult = {'DSv4 Flash': [29, 24, 72, 62, 26, 12, 16], 'DSv4 Pro': [48, 45, 127, 120, 48, 21, 29], 'Kimi K2': [31, 41, 58, 108, 49, 16, 29], 'Nemotron 3 Ultra': [47, 35, 15, 69, 38, 22, 24]}
allm = sum(mult.values(), [])
chk('Magic: smallest of the 28 multipliers', min(allm), 12)
chk('Magic: largest', max(allm), 127)
chk('Magic: median against DSv4 Pro', sorted(mult['DSv4 Pro'])[3], 48)
# --- Epoch
chk('GPT-4: cloud / amortised', fig('gpt4', 'usd', 1) / fig('gpt4', 'usd', 0), 2.18, 0.01)
chk('Gemini Ultra: cloud / amortised', fig('gemini_ultra', 'usd', 1) / fig('gemini_ultra', 'usd', 0), 6.71, 0.01)
chk('OPT-175B: 793.5 h x $2,500', 793.5 * 2500, fig('opt175', 'usd'), 0.005)
chk('DeepSeek-V3 6ND (Epoch)', 6 * 37e9 * 14.8e12, 3.29e24, 0.005)
# --- the growth animation (33_js_price2_anim.js)
v = 5.576e6 + 0.294e6
chk('DS: V3 + R1', v, 5.87e6)
chk('DS: x2.25', v * 2.25, 13.21e6, 0.002)
chk('DS: x2.7', v * 2.7, 15.85e6, 0.002)
chk('DS: staff low (/0.71)', v * 2.25 / 0.71, 18.6e6, 0.003)
chk('DS: staff high (/0.51)', v * 2.7 / 0.51, 31.1e6, 0.003)
chk('DS: SemiAnalysis capex / headline', 1.6e9 / 5.576e6, 287, 0.002)
chk('BLOOM: 1 / 0.3724', 1 / 0.3724, 2.69, 0.005)
chk('GPT-4: $90M / 0.71', 90e6 / 0.71, 126.8e6, 0.002)
chk('GPT-4: $90M / 0.51', 90e6 / 0.51, 176.5e6, 0.002)
# --- pages text
html = open(os.path.join(os.path.dirname(HERE), 'parts', '33_tab_price.html')).read()
for want in ('89x', '5.8 times', '$450,000', '$2.62M'):
    assert want in html, want
print('failures', fails)
sys.exit(1 if fails else 0)
