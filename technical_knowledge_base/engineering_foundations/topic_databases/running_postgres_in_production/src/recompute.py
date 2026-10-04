"""Recompute every derived number on the page from inputs/*.json and the quoted unit prices, check the numbers written
into the HTML prose against the measured runs, and write recompute_out.json (check_page.mjs compares the page's JavaScript
with it). Run: python3 recompute.py"""
import json, os, re, glob, statistics
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda n: json.load(open(os.path.join(HERE, 'inputs', n + '.json')))
html = ''.join(open(f).read() for f in sorted(glob.glob(os.path.join(HERE, 'parts', '*.html'))) + sorted(glob.glob(os.path.join(HERE, 'parts', '2*.js'))))
bad = 0
def check(ok, msg):
    global bad
    print(('ok   ' if ok else 'FAIL ') + msg); bad += (not ok)
def inhtml(s, why):
    check(s in html, f'prose says "{s}" ({why})')

out = {}
# autovacuum trigger: 50 + sf x rows, PostgreSQL 18 caps at 100,000,000
thr = lambda rows, sf: {'raw': 50 + sf * rows, 'pg18': min(50 + sf * rows, 1e8)}
out['thr_1e9_02'], out['thr_1e7_001'], out['thr_1e5_02'] = thr(1e9, 0.2), thr(1e7, 0.01), thr(1e5, 0.2)
check(out['thr_1e5_02']['raw'] == 20050, 'chat_state trigger 50 + 0.2 x 100,000 = 20,050'); inhtml('20,050', 'trigger')
check(out['thr_1e9_02']['raw'] == 200_000_050, 'a billion rows at 0.2: 200 million dead tuples'); inhtml('200 million dead rows', 'mistakes section')
# managed: one 2 vCPU / 8 GiB node, 730 h, compute only
out['cost'] = {'rds': 0.168 * 730, 'rds_maz': 0.337 * 730, 'csql': (2 * 0.0413 + 8 * 0.007) * 730, 'csql_ha': 2 * (2 * 0.0413 + 8 * 0.007) * 730, 'alloy': (2 * 0.06608 + 8 * 0.0112) * 730}
print('     monthly:', {k: round(v, 2) for k, v in out['cost'].items()})
# illustrative restore arithmetic
check(2_000_000 / 200 == 10_000, '2 TB at 200 MB/s = 10,000 s (about 3 hours)'); check(round(1_000_000 / 1000 / 60, 1) == 16.7, '1 TB at 1 GB/s = 16.7 min (about 17)')

# PITR
p = J('pitr'); st = {s['step']: s for s in p['steps']}
check(p['before_delete'] - p['count_dump'] == 12000 and p['count_pitr'] == p['before_delete'], f"dump loses {p['before_delete'] - p['count_dump']:,}, PITR loses {p['before_delete'] - p['count_pitr']}")
inhtml('six batches of 2,000 messages', 'the day'); inhtml(f"{st['dump']['bytes'] / 2**20:.1f} MB", 'dump size')
inhtml(f"{st['basebackup']['bytes'] / 2**20:.0f} MB", 'base backup size')
check('221 MB' in st['load']['out'], 'database is 221 MB'); inhtml('221 MB', 'database size')
check(st['restore_pitr']['secs'] < 2, f"PITR recovery {st['restore_pitr']['secs']} s (prose: under two seconds)")
check(any('recovery stopping before commit' in l for l in st['restore_pitr']['log']), 'recovery stopped before the DELETE commit')
# replication
r = J('replication'); rs = {s['step']: s for s in r['steps']}
lag = sorted(x[3] for x in rs['lag_load']['series'])
print(f"     replay lag under load: median {statistics.median(lag):.2f} ms, max {lag[-1]:.2f} ms; paused peak {max(x[3] for x in rs['lag_pause']['series'])/1000:.1f} s")
check(0.5 <= statistics.median(lag) <= 2, 'one-screen card: about 1 ms normally')
check(9 <= max(x[3] for x in rs['lag_pause']['series']) / 1000 <= 11, 'one-screen card: 10 s after a 10 s stall')
mx = max(x['retained'] or 0 for x in r['retention'])
check(round(mx / 1e9, 1) == 1.1, f'retained WAL peak {mx/1e9:.2f} GB (card: 1.1 GB)')
sync = {x['mode']: x['tps'] for x in r['sync']}
s_on, s_async = round(sync['on']), round(sync['on (no synchronous standby)'])
inhtml(f'{s_async:,} to {s_on:,}', 'sync cost'); check(s_on / s_async < 0.5, f'synchronous on keeps {s_on/s_async:.2f} of async (prose: more than half lost)')
check(rs['rebuild']['secs'] < 3 and '774 MB' in rs['rebuild']['out'], f"rebuild {rs['rebuild']['secs']} s for 774 MB"); inhtml('2.3 s for 774 MB', 'rebuild')
# wraparound
w = J('wraparound'); ws = {s['step']: s for s in w['steps']}
check(w['steps'][1]['target'] - w['steps'][1]['oldest'] == 2**31 - 3_000_000 - 300, 'pg_resetwal target = oldest + 2^31 - 3,000,000 - 300')
check(ws['fix']['secs'] < 1, f"fix took {ws['fix']['secs']} s"); inhtml(f"{ws['fix']['secs']} s", 'fix time')
# vacuum
v = J('vacuum'); S = v['series']
A = [x for x in S if x[7] == 'A']; Bp = [x for x in S if x[7] == 'B']; hot = [x for x in S if x[7] == 'hot']
check(max(x[2] for x in hot) < 20050, f"HOT phase peak dead tuples {max(x[2] for x in hot):,} stays under the trigger")
check(A[-1][3] > A[0][3], f"autovacuum ran {A[-1][3] - A[0][3]} times in phase A")
check(Bp[-1][2] > 3 * 20050, f"phase B dead tuples reach {Bp[-1][2]:,}")
sz = {x['label']: x['bytes'] for x in v['sizes']}
check(sz['after VACUUM'] == sz['after DELETE of half'] and sz['after VACUUM FULL'] < sz['after VACUUM'], 'VACUUM keeps the size, VACUUM FULL shrinks it')
check(v['steps'][-1]['secs'] < 2, f"VACUUM FULL {v['steps'][-1]['secs']} s (prose: under two seconds)")
# connections
c = J('connections'); cs = {s['step']: s for s in c['steps']}
check(cs['bouncer_1000']['server_conns'] == 20, 'Postgres saw 20 server connections for 1,000 clients')
check(cs['prepared']['fail0'] > 0 and cs['prepared']['fail200'] == 0, f"prepared: {cs['prepared']['fail0']} failures at 0, none at 200")
check(all(x == '5s' for x in cs['set_leak']['b']), "client B saw client A's 5s timeout")
# upgrade
u = J('upgrade'); us = {s['step']: s for s in u['steps']}
check(us['copy']['secs'] < 3 and us['link']['secs'] < 3, f"pg_upgrade copy {us['copy']['secs']} s, link {us['link']['secs']} s (prose: about two seconds)")
check('duplicate key' in us['seq_trap']['out'], 'sequence trap reproduced')
json.dump(out, open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=1)
print('FAILED', bad) if bad else print('all ok')
