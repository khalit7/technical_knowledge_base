"""Recompute every derived number the page states, from inputs/*.json and the page's formulas, and check the prose.
Run: python3 recompute.py   (writes recompute_out.json, read by check_page.mjs to compare with the page's JavaScript)
"""
import json, math, os, re, glob
H = os.path.dirname(os.path.abspath(__file__))
L = lambda n: json.load(open(os.path.join(H, 'inputs', n)))
m1, m2, m3, m4, m5 = L('m1_pages.json'), L('m2_wal.json'), L('m3_indexes.json'), L('m4_pg18.json'), L('m5_lsm.json')
prose = ' '.join(open(f).read() for f in sorted(glob.glob(os.path.join(H, 'parts', '20_read_*.html'))))
out, bad = {}, []
def check(name, value, text=None):
    out[name] = value
    if text is not None and text not in prose: bad.append(f'{name}: prose lacks "{text}" (value {value})')
# fan-out (section 5)
ENTRY = lambda k: math.ceil((8 + k) / 8) * 8 + 4
U = 8192 - 24 - 16; per = U // ENTRY(8); leaf = round(U * 0.9 / ENTRY(8)); inner = round(U * 0.7 / ENTRY(8))
def levels(n, f, l):
    leaves = math.ceil(n / l); return 1 if leaves <= 1 else 1 + math.ceil(math.log(leaves) / math.log(f) - 1e-9)
check('bigint_per_page', per, 'about 407 entries'); check('bigint_leaf', leaf, '(367 entries)'); check('bigint_inner', inner, 'about 285')
d = {x['rows']: x for x in m3['depth'] if x['key'] == 'bigint'}
for n in d: assert levels(n, inner, leaf) == d[n]['levels'], ('levels', n, levels(n, inner, leaf), d[n]['levels'])
check('levels_1e9', levels(10**9, inner, leaf)); assert out['levels_1e9'] == 4
check('measured_leaf_items', d[10**6]['leaf_items_first']); assert d[10**6]['leaf_items_first'] == leaf
# bloom
b = 10; k = round(b * math.log(2)); p = (1 - math.exp(-k / b)) ** k
check('bloom_k', k); check('bloom_fp_pct', round(100 * p, 2), 'p = 0.82%')
# pages (section 1)
h = m1['page0_header'][0]
check('page0_lp', (h['lower'] - 24) // 4, '52 line pointers'); check('page0_free', h['upper'] - h['lower'], 'Free, 88 bytes'); check('page0_tuples', h['special'] - h['upper'], '7,872 bytes')
check('heap_pages', m1['sizes'][0]['heap'] // 8192, '19,235 pages'); check('fsm_kb', m1['sizes'][0]['fsm'] // 1024, 'it is 56 KB')
# WAL (section 3)
own = lambda rs: sum(r['len'] for r in rs if r['rm'] != 'Heap2')
check('insert_wal_off', own(m2['one_insert']['off']['first']), '<td class="num">299</td>'); check('insert_wal_on', own(m2['one_insert']['on']['first']), '17,638 bytes')
ru = {(r['full_page_writes'], r['wal_compression']): r for r in m2['random_updates']['runs']}
on, off, cp = ru[('on', 'off')], ru[('off', 'off')], ru[('on', 'pglz')]
check('ru_on_MB', round(on['first_bytes'] / 1e6, 1), '<b>19.3 MB</b>'); check('ru_off_MB', round(off['first_bytes'] / 1e6, 2), '0.39 MB'); check('ru_ratio', round(on['first_bytes'] / off['first_bytes']), '50 times')
check('ru_second_MB', round(on['second_bytes'] / 1e6, 2), '0.50 MB'); check('ru_pglz_MB', round(cp['first_bytes'] / 1e6, 1), '6.2 MB'); check('ru_pages', m2['random_updates']['distinct_heap_pages'], '977 different table pages')
c = {(r['synchronous_commit'], r['clients']): r for r in m2['commit']['runs']}
check('tps_on_1', c[('on', 1)]['tps'], 'about 165 commits'); check('tps_on_32', c[('on', 32)]['tps'], 'reach 2,603'); check('tps_off_1', c[('off', 1)]['tps'], '7,504'); check('tps_off_32', c[('off', 32)]['tps'], '71,439')
check('commit_ms', c[('on', 1)]['latency_ms'], 'waits 6 ms'); check('group_gain', round(c[('on', 32)]['tps'] / c[('on', 1)]['tps']), '(16 times more')
cr = m1['crash']; check('crash_MB', round(cr['wal_bytes'] / 1e6, 1), f"{round(cr['wal_bytes'] / 1e6, 1)} MB"); check('crash_restart_s', cr['restart_s'], f"{cr['restart_s']} seconds"); check('crash_rows', cr['rows_back'], 'All 1,000 committed rows')
r1 = m1['ring']; check('ring_cached', r1[0]['cached_after'], f"exactly <b>{r1[0]['cached_after']}</b>"); uc = sum(x['n'] for x in m1['usage_counts']); check('usage_total', uc, f'the {uc} buffers')
# B-tree path (section 5)
check('root_items', m1['bt_root_stats'][0]['live_items'], '4 entries'); check('internal_items', m1['bt_path_42000'][1]['live_items'], '285 entries'); check('leaf_items', m1['bt_path_42000'][2]['live_items'], '92 entries')
check('chat_idx_bytes', m1['sizes'][0]['chat_idx'], None)
# write cost (section 11)
w = {x['indexes']: x for x in m3['write_cost']}
check('wc_6_over_3', round(w[6]['median_s'] / w[3]['median_s'], 1), None)
check('wc_content_MB', round(w[6]['sizes']['t_content'] / 1e6), f"{round(w[6]['sizes']['t_content'] / 1e6)} MB"); tps = [x['single_row_tps'] for x in w.values()]
check('tps_min', min(tps), '12,600'); check('tps_max', max(tps), '23,500')
# amplification (section 7)
pst = m1['pgstattuple'][0]; logical = pst['tuple_len'] - 24 * pst['tuple_count']
check('pg_append_amp', round((w[1]['median_wal'] + w[1]['sizes']['heap'] + w[1]['sizes']['t_pkey']) / logical, 1), 'about 3.4 times for appends')
check('pg_update_amp', round((on['first_bytes'] + on['fpi_records_first'] * 8192) / (1000 * logical / pst['tuple_count'])), 'about 300 times')
# RocksDB
for r in m5['runs']:
    check(f"rocks_{r['style']}_{r['bloom']}_wa", [ph['write_amp'] for ph in r['phases']])
json.dump(out, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1)
print(json.dumps(out)); print('MISMATCHES:', len(bad)); [print(' ', x) for x in bad]
