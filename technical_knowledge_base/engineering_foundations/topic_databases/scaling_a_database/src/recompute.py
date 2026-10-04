"""Recomputes every derived number the page shows from src/inputs/*.json and compares with what the page's JavaScript rendered
(src/page_numbers.json, written by check_ui.mjs). Also re-derives the ring resharding count from the router in measure/ring.py
on user ids alone (independent of the database). Run: python3 recompute.py (after node src/check_ui.mjs)."""
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__)); I = lambda f: json.load(open(os.path.join(H, 'inputs', f)))
sys.path.insert(0, os.path.join(H, 'measure'))
C, L, P, CR = I('citus.json'), I('lab_data.json'), I('part.json'), I('crdb.json')
f = lambda x, d: f'{x:,.{d}f}'
pct = lambda x: f(100 * x, 1)
ring = L['reshard']['balance']['ring4']; rt = sum(ring)
exp = {'emailCitus': f(C['point']['login_email']['citus']['p50'], 2), 'emailBig': f(C['point']['login_email']['big']['p50'], 3),
       'emailX': f(C['point']['login_email']['citus']['p50'] / C['point']['login_email']['big']['p50'], 0),
       'repart': f(C['repartition_join'], 0), 'joinBig': f(C['join_big'], 0), 'tx1': f(C['tx']['one_shard']['p50'], 2),
       'tx2': f(C['tx']['two_nodes_2pc']['p50'], 2), 'tx2p99': f(C['tx']['two_nodes_2pc']['p99'], 1),
       'rsMod': pct(L['reshard']['mod']['msgs_pct']), 'rsRing': pct(L['reshard']['ring64']['msgs_pct']), 'rsRingMin': pct(min(ring) / rt),
       'rsRingMax': pct(max(ring) / rt), 'rsLog': pct(L['reshard']['logical48']['msgs_pct']), 'kc': pct(L['key_change_3']['pct']),
       'crStale': f(float(CR['follower_staleness_s'].split()[-1]), 1), 'crP50': f(CR['insert_latency']['crdb']['p50'], 1),
       'pgP50': f(CR['insert_latency']['postgres']['p50'], 2), 'pgFlush': f(CR['insert_latency']['postgres_flush']['p50'], 1)}
b8 = L['by_n']['8']
for k in ('user_hash', 'chat_hash', 'country', 'user_range', 'month_range'):
    exp['sk_' + k] = [pct(max(b8[k][m]) / sum(b8[k][m])) + '%' for m in ('stored', 'week')]
# independent: ring move counts from the router alone (users only; messages need the database)
from ring import Ring, user_key, h32
r3, r4 = Ring([0, 1, 2]), Ring([0, 1, 2, 3])
users_moved = sum(r3.shard(user_key(u)) != r4.shard(user_key(u)) for u in range(1, 100001))
mod_moved = sum(h32(user_key(u)) % 3 != h32(user_key(u)) % 4 for u in range(1, 100001))
indep = {'ring_users_moved': [users_moved, L['reshard']['ring64']['users']], 'mod_users_moved': [mod_moved, L['reshard']['mod']['users']]}
# text claims in the HTML parts
d, m = P['m'], P['m']
text = {'dash plain ms (373)': round(d['dash|messages']['ms']), 'dash month ms (26)': round(d['dash|messages_month']['ms']),
        'dash index ms (23)': round(d['dash|messages+index']['ms']), 'pages month 7,341': d['dash|messages_month']['shared_hit'] + d['dash|messages_month']['shared_read'],
        'pages plain 192,372': d['dash|messages']['shared_hit'] + d['dash|messages']['shared_read'],
        'chat plain 0.05': d['chat|messages']['ms'], 'chat month 0.21': d['chat|messages_month']['ms'], 'plan 2.0 vs 0.3': [d['chat|messages_month']['planning_ms'], d['chat|messages']['planning_ms']],
        'delete 863,999 rows, 2.1 s, 160 MB': [P['ret_delete']['rows'], P['ret_delete']['s'], P['ret_delete']['wal_mb']], 'cold 2,766': d['dash|messages']['all_ms'][0],
        'chat list 0.46 vs 0.10': [C['point']['chat_list']['citus']['p50'], C['point']['chat_list']['big']['p50']],
        'mention 375 vs 1,502': [C['heavy']['mention']['citus']['ms'], C['heavy']['mention']['big']['ms']],
        'monthly price x730': [round(22.944 * 730), round(45.888 * 730), round(60.864 * 730)], 'Singapore 218+68': 218 + 68}
page = json.load(open(os.path.join(H, 'page_numbers.json')))
bad = 0
for k, v in exp.items():
    got = page['skTable'][['user_hash', 'chat_hash', 'country', 'user_range', 'month_range'].index(k[3:])] if k.startswith('sk_') else page.get(k)
    ok = got == v; bad += not ok
    print(('OK ' if ok else 'MISMATCH ') + k, v, got)
for k, (a, b) in indep.items():
    ok = a == b; bad += not ok; print(('OK ' if ok else 'MISMATCH ') + k, a, b)
print(json.dumps(text))
json.dump({'expected': exp, 'independent': indep, 'text': text, 'mismatches': bad}, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1)
print('mismatches', bad)
