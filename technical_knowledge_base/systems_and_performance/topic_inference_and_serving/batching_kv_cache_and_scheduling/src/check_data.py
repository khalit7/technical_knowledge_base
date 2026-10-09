"""The page embeds exactly the recorded data, and numbers written in the prose agree with it.
usage: python3 -I check_data.py"""
import json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, '..', 'index.html')).read()
m = re.search(r'window\.BKD=(\{.*?\});\n', html, re.S)
page = json.loads(m.group(1))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))
want = {'frag': J('evict', 'out', 'frag.json'), 'ev': J('evict', 'out', 'evict_grid.json'), 'evanim': J('evict', 'out', 'evict_anim.json'),
        'evcheck': [J('evict', 'out', 'vllm_evict_conversation.json'), J('evict', 'out', 'vllm_evict_toolagent.json')],
        'sch': J('sched', 'out', 'sched.json'), 'regress': J('sched', 'out', 'regress.json'), 'meas': J('exp', 'out', 'measured.json'),
        'kvc': J('kvc', 'out', 'kvc_summary.json') if os.path.exists(os.path.join(HERE, 'kvc', 'out', 'kvc_summary.json')) else None}
bad = 0
for k, v in want.items():
    if page.get(k) != v:
        print('EMBED MISMATCH', k)
        bad += 1
text = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S)
text = re.sub(r'<[^>]+>', ' ', text)
text = re.sub(r'\s+', ' ', text).replace('&nbsp;', ' ')
E, S, M = want['ev'], want['sch'], want['meas']
g = lambda t, p, c: E['traces'][t]['grid'][p][E['caps'].index(c)][0]
pc = lambda v: '%.1f%%' % (100 * v)
ck = M['chunk']['rows']
row = lambda b: [r for r in ck if r['budget'] == b][0]
tr = M['tiers']['runs']
fair = S['fair']
sj = {(r['rate'], r['pol']): r for r in S['sjf']['rows']}
pre = {(r['nblocks'], r['mode'], r['swapbw'], r['admit']): r for r in S['preempt']['rows']}
pois = {r['budget']: r for r in S['chunk_poisson']['rows']}
h100 = {r['budget']: r for r in S['chunk_h100']['rows']}
claims = [
    ('LRU hits 4.5% of blocks with 1,024', pc(g('conversation', 'lru', 1024))[:-1] == '4.5'),
    ('18.2% with 8,192', pc(g('conversation', 'lru', 8192)) == '18.2%'),
    ('33.5% with 32,768', pc(g('conversation', 'lru', 32768)) == '33.5%'),
    ('36.6% for an unlimited cache', pc(E['traces']['conversation']['stats']['inf_hit']) == '36.6%'),
    ('LFU keeps 11.9%', pc(g('conversation', 'lfu', 8192)) == '11.9%'),
    ('(18.5% against 17.3% at 16 blocks)', pc(g('toolagent', 'lfu', 16)) == '18.5%' and pc(g('toolagent', 'lru', 16)) == '17.3%'),
    ('(39.3% against 44.0% at 8,192)', pc(g('toolagent', 'lfu', 8192)) == '39.3%' and pc(g('toolagent', 'lru', 8192)) == '44.0%'),
    ('(14.0% against 17.3%)', pc(g('toolagent', 'lru_head', 16)) == '14.0%'),
    ('34.1% at 1,000 blocks', pc(E['table1']['ours']['lru'][5]) == '34.1%'),
    ('46.1% at 10,000', pc(E['table1']['ours']['lru'][4]) == '46.1%'),
    ('55.1% at 50,000', pc(E['table1']['ours']['lru'][2]) == '55.1%'),
    ('73.7% for tool and agent', pc(E['fig9']['ours']['toolagent']) == '73.7%'),
    ('48.4% for synthetic', pc(E['fig9']['ours']['synthetic']) == '48.4%'),
    ('37.1% for conversation', pc(E['fig9']['ours']['conversation']) == '37.1%'),
    ('4.2% of blocks hit on the GPU, plus 5.1%', [r for r in E['tiers']['conversation'] if r[0] == 256 and r[1] == 4096][0][2:4] == [0.04191, 0.05107]),
    ('adds 31.8%', [r for r in E['tiers']['conversation'] if r[0] == 256 and r[1] == 65536][0][3] == 0.31754),
    ('33.2% on the GPU', [r for r in E['tiers']['toolagent'] if r[0] == 256 and r[1] == 4096][0][2:4] == [0.3324, 0.04499]),
    ('2.4% on the GPU, plus 22.8%', [r for r in E['tiers']['synthetic'] if r[0] == 256 and r[1] == 4096][0][2:4] == [0.02388, 0.22778]),
    ('9.55 s to its first token', round(row(128)['ttft_med'], 2) == 9.55 and round(row(128)['maxgap_med'] * 1000) == 242),
    ('762 ms and 7.57 s', round(row(512)['maxgap_med'] * 1000) == 762 and round(row(512)['ttft_med'], 2) == 7.57),
    ('2.66 s and 7.17 s', round(row(2048)['maxgap_med'], 2) == 2.66 and round(row(2048)['ttft_med'], 2) == 7.17),
    ('froze for 7.26 s and the prompt took 7.28 s', round(row(8192)['maxgap_med'], 2) == 7.26 and round(row(8192)['ttft_med'], 2) == 7.28),
    ('26 ms (median) and 33 ms (p99)', round(M['chunk']['alone']['p50'] * 1000) == 26 and round(M['chunk']['alone']['p99'] * 1000) == 33),
    ('0.431 s to 0.439 s', round(h100[2048]['long_ttft'], 3) == 0.431 and round(h100[1024]['long_ttft'], 3) == 0.439),
    ('from 79 ms to 42 ms', round(h100[2048]['max_gap'] * 1000) == 79 and round(h100[1024]['max_gap'] * 1000) == 42),
    ('13 ms at a 512-token budget to 45 ms at 2,048 and 267 ms', round(pois[512]['itl_p99'] * 1000) == 13 and round(pois[2048]['itl_p99'] * 1000) == 45 and round(pois[16384]['itl_p99'] * 1000) == 267),
    ('1.46 s to 1.07 s to 0.95 s', round(pois[512]['ttft_p99'], 2) == 1.46 and round(pois[2048]['ttft_p99'], 2) == 1.07 and round(pois[16384]['ttft_p99'], 2) == 0.95),
    ('(2,364 against 2,430', round(pre[(2000, 'recompute', 25e9, 'optimistic')]['tps']) == 2364 and round(pre[(2000, 'swap', 25e9, 'optimistic')]['tps']) == 2430),
    ('same 146 preemptions', pre[(2000, 'recompute', 25e9, 'optimistic')]['npre'] == 146),
    ('(2,287)', round(pre[(2000, 'swap', 6e9, 'optimistic')]['tps']) == 2287),
    ('serves 1,785 tokens per second with a p99 TTFT of 31.25 s, against 12.61 s', round(pre[(2000, 'recompute', 25e9, 'reserve')]['tps']) == 1785 and round(pre[(2000, 'recompute', 25e9, 'reserve')]['ttft_p99'], 2) == 31.25 and round(pre[(2000, 'recompute', 25e9, 'optimistic')]['ttft_p99'], 2) == 12.61),
    ('from 7.5 s under FCFS to 0.08 s under VTC', round(fair[0]['pol']['fcfs']['per'][1]['ttft_p50'], 1) == 7.5 and round(fair[0]['pol']['vtc']['per'][1]['ttft_p50'], 2) == 0.08),
    ("A's rises from 7.6 s to 8.3 s", round(fair[0]['pol']['fcfs']['per'][0]['ttft_p50'], 1) == 7.6 and round(fair[0]['pol']['vtc']['per'][0]['ttft_p50'], 1) == 8.3),
    ("(median TTFT 6.6 s against A's 27 s)", round(fair[1]['pol']['vtc']['per'][1]['ttft_p50'], 1) == 6.6 and round(fair[1]['pol']['vtc']['per'][0]['ttft_p50']) == 27),
    ('(0.13 s)', round(fair[1]['pol']['priority']['per'][1]['ttft_p50'], 2) == 0.13 and round(fair[1]['pol']['priority']['per'][0]['ttft_p50']) == 28),
    ('mean TTFT falls from 2.25 s to 1.47 s', round(sj[(46, 'fcfs')]['ttft_mean'], 2) == 2.25 and round(sj[(46, 'sjf')]['ttft_mean'], 2) == 1.47),
    ('p99 TTFT rises from 5.1 s to 26.8 s', round(sj[(46, 'fcfs')]['ttft_p99'], 1) == 5.1 and round(sj[(46, 'sjf')]['ttft_p99'], 1) == 26.8),
    ('from 15.7 s to 36.9 s', round(sj[(46, 'fcfs')]['long_e2e_p99'], 1) == 15.7 and round(sj[(46, 'sjf')]['long_e2e_p99'], 1) == 36.9),
    ('2,256 steps, 79 preemptions', sum(c['steps'] for c in S['vllm_prio']) == 2256 and sum(c['pre'] for c in S['vllm_prio']) == 79),
    ('computing it from scratch took 5.63 s', round(sorted(r['res']['recompute']['wall_s'] for r in tr['8192'])[1], 2) == 5.63),
    ('113 to 421 ms', [round(r['res']['host_cache']['wall_s'] * 1000) for r in tr['8192']] == [113, 204, 421]),
    ('recomputed in 5.64 s', all(round(r['res']['host_cache']['wall_s'], 2) == 5.64 for r in tr['0'])),
    ('restoring it 75 to 79 ms', round(min(r['res']['file_restore']['wall_s'] for r in tr['8192'] + tr['0']) * 1000) == 75 and round(max(r['res']['file_restore']['wall_s'] for r in tr['8192'] + tr['0']) * 1000) == 79),
    ('took 0.54 to 0.67 s', round(min(r['res']['file_save']['wall_s'] for r in tr['8192'] + tr['0']), 2) == 0.54 and round(max(r['res']['file_save']['wall_s'] for r in tr['8192'] + tr['0']), 2) == 0.67),
    ('27 to 35 ms', round(min(r['res']['after_file_restore']['wall_s'] for r in tr['8192'] + tr['0']) * 1000) == 27 and round(max(r['res']['after_file_restore']['wall_s'] for r in tr['8192'] + tr['0']) * 1000) == 35),
]
kq = {r['type']: r for r in M['kvq']['rows']}
claims += [('15.18', round(kq['f16']['ppl'], 2) == 15.18 and round(kq['q8_0']['ppl'], 2) == 15.18), ('19.42', round(kq['q4_0']['ppl'], 2) == 19.42)]
K = want['kvc']
if K:
    ka = {(r['policy'], r['ratio']): r for r in K['A']['rows']}
    kb = {(r['policy'], r['ratio']): r for r in K['B']['rows']}
    pa = lambda p, r: '%.1f%%' % (100 * ka[(p, r)]['acc'])
    claims += [
        ('answers 98.3% of 60 questions', '%.1f' % (100 * K['A']['full_acc']) == '98.3' and K['meta']['nA'] == 60),
        ('full-cache perplexity 17.04 over 24 windows', '%.2f' % K['B']['full_ppl'] == '17.04' and K['meta']['nB'] == 24),
        ('from 17.04 to 927 on average', round(kb[('random_nosink', 0.25)]['ppl']) == 927 and round(kb[('random_nosink', 0.25)]['ppl_min']) == 23),
        ('gives 23.71', '%.2f' % kb[('random', 0.25)]['ppl'] == '23.71'),
        ('H2O 18.08, SnapKV 19.83, random per head 22.16', '%.2f' % kb[('h2o', 0.25)]['ppl'] == '18.08' and '%.2f' % kb[('snapkv', 0.25)]['ppl'] == '19.83' and '%.2f' % kb[('random_head', 0.25)]['ppl'] == '22.16'),
        ('19.97, 22.97, 26.84 and 27.80', ['%.2f' % kb[(p, 0.1)]['ppl'] for p in ('h2o', 'snapkv', 'random_head', 'random')] == ['19.97', '22.97', '26.84', '27.80']),
        ('random with sinks answers 5.6%', pa('random', 0.25) == '5.6%' and pa('random_head', 0.25) == '13.9%' and pa('recent', 0.25) == '26.7%' and pa('h2o', 0.25) == '26.7%'),
        ('SnapKV per head 63.3%', pa('snapkv', 0.25) == '63.3%' and pa('snapkv_all', 0.25) == '91.7%'),
        ('freed 1.3% of blocks in place', '%.1f' % (100 * ka[('random', 0.25)]['free']) == '1.3'),
        ('51% of blocks freeable in place', round(100 * ka[('snapkv_all', 0.25)]['free']) == 51),
    ]
for snip, ok in claims:
    if snip not in text:
        print('PROSE MISSING:', snip)
        bad += 1
    elif not ok:
        print('NUMBER MISMATCH:', snip)
        bad += 1
print('claims', len(claims), 'bad', bad)
sys.exit(1 if bad else 0)
