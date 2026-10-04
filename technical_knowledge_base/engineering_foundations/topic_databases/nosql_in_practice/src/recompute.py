"""Recompute every number the page states from inputs/*.json and check it against the built page:
literal numbers written in the prose (searched in ../index.html) and the numbers the page's JavaScript put into the prose
(src/page_numbers.json, written by check_ui.mjs). Run: python3 recompute.py (after sh build.sh and node check_ui.mjs)."""
import json, os, re, html
H = os.path.dirname(os.path.abspath(__file__))
I = lambda n: json.load(open(os.path.join(H, 'inputs', n)))
page = html.unescape(re.sub(r'<[^>]+>', ' ', open(os.path.join(H, '..', 'index.html')).read()))
page = re.sub(r'\s+', ' ', page)
nums = json.load(open(os.path.join(H, 'page_numbers.json'))) if os.path.exists(os.path.join(H, 'page_numbers.json')) else {}
r, rk, w, d, doc, g, ts = I('redis.json'), I('rank.json'), I('wide.json'), I('ddb.json'), I('doc.json'), I('graph.json'), I('ts.json')
f0 = lambda v: f'{round(v):,}'
checks, fails = [], 0
def lit(expect, why):
    global fails
    ok = expect in page; checks.append((ok, 'prose', expect, why)); fails += not ok
def js(path, expect, why=''):
    global fails
    got = nums.get(path); ok = got == expect; checks.append((ok, 'js ' + path, f'{got} == {expect}', why)); fails += not ok

# Redis (section 3)
lit(f"{r['get_us']['p50']} µs", 'GET median'); lit(f"p99 {round(r['get_us']['p99'])} µs", 'GET p99')
b = r['benchmark']
assert 16000 <= b['set_c1_P1'] and b['get_c1_P1'] <= 18100; lit('16,000 to 18,000', '1-client range')
assert 32500 <= b['set_c50_P1'] and b['get_c50_P1'] <= 35500; lit('33,000 to 35,000', '50-client range (32,967 rounds to 33,000)')
assert min(b['set_c50_P16'], b['get_c50_P16']) > 520000; lit('over 520,000', 'pipelined')
lb = r['leaderboard']
lit(f"{lb['memory_bytes'] / 1048576:.1f} MB", 'sorted set memory (MiB)'); lit(f"about {round(lb['memory_bytes'] / lb['members'])} bytes each", 'per member')
lit(f"median {round(lb['top10_us_p50'])} µs", 'top 10'); lit(f"median {round(lb['rank_us_p50'])} µs", 'rank')
lit(f"about {round(lb['zincrby_ops_1client'], -2):,.0f} a second", 'ZINCRBY rounded to hundreds')
lit(f"{rk['top10']['buffers']} page reads, {rk['top10']['ms']} ms", 'pg top 10')
for x in rk['rank'][1:]:
    lit(f"{x['buffers']} page reads, {x['ms']:.2f} ms", f"pg rank {x['rank']}")
lit(f"rank {rk['rank'][1]['rank']:,}", 'pg rank of user 4242'); lit(f"rank {rk['rank'][2]['rank']:,}", 'pg rank middle')
rl = r['ratelimit']
lit(f"let {rl['naive_allowed']} of {rl['attempts']} attempts through a limit of {rl['capacity']}", 'race')
for k in ('fixed_window_ops_1client', 'window_log_ops_1client', 'lua_ops_1client'): lit(f"{f0(rl[k])} checks/s", k)
lit(f"{f0(rl['lua_ops_8clients'])} with 8 clients", 'lua 8 clients')
rp = r['replication']; lit(f"lost {rp['lost']:,} of {rp['during_acked']:,} acknowledged writes", 'mistakes: replication')
js('#one-repl', f"{rp['lost']:,} of {rp['during_acked']:,}")
# DynamoDB (section 4)
L = d['load']; aps = {a['label']: a for a in d['access_patterns']}; full = aps['Wrong: one model across all chats (full Scan)']; sc = aps['Wrong: latest 50 by Scan + filter (no key)']
lit(f"{L['users']} users, {L['chats']:,} chats, {L['messages']:,} messages, {full['scanned']:,} items in all", 'load')
lit(f"read {sc['scanned']:,} items in its first page and returned none", 'scan+filter'); assert sc['count'] == 0
lit(f"read all {full['scanned']:,} items in {full['pages']} pages of 1 MB for {full['capacity']:,} read units", 'full scan')
lit(f"about {d['message_item_bytes']['mean']} bytes", 'item size'); lit(f"cost {round(d['append_txn_capacity'][0]['CapacityUnits'])} write units", 'txn WRU')
lit(f"one message put cost {round(d['put_message_capacity'])} write unit", 'put WRU')
a4 = aps['AP4 latest 50 messages']; assert -(-50 * d['message_item_bytes']['mean'] // 4096) * 0.5 == a4['capacity'], 'RCU formula reproduces DynamoDB Local'
# section 2
pg = w['pg']; runs = pg['runs']
js('wide.pg.long_chat_rows', f"{pg['long_chat_rows']:,}")
# documents (section 5)
m = doc['mongo']; js('doc.mongo.limit16.messages_fitted', f"{m['limit16']['messages_fitted']:,}"); lit(f"at {m['limit16']['messages_fitted']:,} messages", 'mistakes: 16 MB')
js('doc.pg.sizes.jsonb_per_message/doc.pg.sizes.columns', f"{doc['pg']['sizes']['jsonb_per_message'] / doc['pg']['sizes']['columns']:.1f}")
js('doc.mongo.agg.ms', f"{m['agg']['ms']:,}")
# wide-column (section 6)
t = w['cass']['tombstones']; ratio = t[1]['ms_p50'] / t[0]['ms_p50']; assert 8 <= ratio < 10, ratio
lit('about nine times slower', f'tombstones {ratio:.1f}x'); lit(f"{t[1]['deleted']:,} tombstones", 'mistakes'); lit(f"{t[2]['deleted']:,} made it fail", 'mistakes'); assert 'error' in t[2]
js('wide.cass.rows_in_latest_partition', f"{w['cass']['rows_in_latest_partition']:,}")
# time series (section 7)
p = ts['pg']; lit(f"Measured: {p['retention_delete']['s']} s and {round(p['retention_delete']['wal_bytes'] / 1048576)} MB of log for 7 days", 'mistakes: delete')
lit(f"took {p['retention_drop']['s']:.2f} s", 'mistakes: drop'); assert p['part_rows_after'] == p['plain_rows_after'] and p['same_answer']
per_pg, per_pq = p['size']['plain_heap'] / p['rows'], ts['duckdb']['parquet_bytes'] / ts['duckdb']['rows']; assert 9 < per_pg / per_pq < 12; lit('about a tenth of the size', f'{per_pg / per_pq:.1f}x')
js('ts.pg.chart_rollup.ms', f"{p['chart_rollup']['ms']:.1f}"); js('ts.pg.size.brin_ts', f"{round(p['size']['brin_ts'] / 1024)}")
# graph (section 8)
for k in '1234': assert g['pg']['counts'][k] == g['neo4j']['counts'][k] == g['kuzu']['counts'][k], k
best4 = min(g['pg']['recursive_cte']['4']['ms_p50'], g['pg']['join_per_hop']['4']['ms_p50']); n4 = g['neo4j']['4']['ms_p50']
js('#rd-g-4', f"{round((1 - n4 / best4) * 100)}% faster" if n4 < best4 else f"{round((n4 / best4 - 1) * 100)}% slower")
for k in '123': assert min(g['pg']['recursive_cte'][k]['ms_p50'], g['pg']['join_per_hop'][k]['ms_p50']) < min(g['neo4j'][k]['ms_p50'], g['kuzu'][k]['ms_p50']), 'Postgres fastest up to 3 hops'
js('graph.neo4j.shortest.hops', str(g['neo4j']['shortest']['hops']))
for ok, kind, what, why in checks:
    print('OK  ' if ok else 'FAIL', kind, '|', what, '|', why)
print(f'{len(checks)} checks, {fails} failed')
json.dump({'checks': len(checks), 'failed': fails}, open(os.path.join(H, 'recompute_out.json'), 'w'))
