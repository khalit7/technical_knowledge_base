"""Check every number and claim the Reading tab states in prose against the recorded runs (src/inputs/*.json),
and that the page's data part (parts/22_js_data.js) was generated from the same files.
Run: python3 src/recompute.py   (plain Python). Writes src/recompute_out.json; exits 1 on any failure."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); IN = os.path.join(HERE, 'inputs')
L = lambda f: json.load(open(os.path.join(IN, f)))
P, Y, X, B = L('matrix_pg.json'), L('matrix_mysql.json'), L('extras_pg.json'), L('bench_pg.json')
MV = L('mvcc_trace.json')
read = ''.join(open(os.path.join(HERE, 'parts', f)).read() for f in sorted(os.listdir(os.path.join(HERE, 'parts'))) if f.startswith('20_read'))
ok, out = True, []
def check(name, cond, val=None):
    global ok
    out.append({'check': name, 'pass': bool(cond), 'value': val}); ok &= bool(cond)
    print(('PASS ' if cond else 'FAIL ') + name + ('' if val is None else '  [' + str(val) + ']'))
occ = lambda M, k: M['runs'][k]['occurred']
codes = lambda M, k: sorted(set(e['code'] for e in M['runs'][k]['errors']))

# section 1 and 3: the lost update
check('s1: Postgres read committed lost update ends at 25', P['runs']['lost|read committed']['final']['balance'][0][0] == 25)
check('s1: MySQL repeatable read lost update ends at 25', Y['runs']['lost|repeatable read']['final']['balance'][0][0] == 25)
check('s3: Postgres repeatable read refuses with 40001', codes(P, 'lost|repeatable read') == ['40001'] and not occ(P, 'lost|repeatable read'))
check('s3: dirty read never on Postgres', not any(occ(P, 'dirty|' + l) for l in ('read uncommitted', 'read committed', 'repeatable read', 'serializable')))
dr = [s for s in Y['runs']['dirty|read uncommitted']['trace'] if s['finished'] and s['finished'][0].get('rows') == [[0]]]
check('s3: MySQL read uncommitted, B read 0', occ(Y, 'dirty|read uncommitted') and len(dr) == 1)
check('s3: fixes prevent the lost update on both', all(not occ(M, 'lost|read committed|' + f) for M in (P, Y) for f in ('for_update', 'atomic')))
check('s3: write skew caught by Postgres serializable at COMMIT', [e['step'] for e in P['runs']['writeskew|serializable']['errors']] == [7]
      and P['runs']['writeskew|serializable']['trace'][7]['sql'] == 'COMMIT')
check('s3: read-only anomaly: Postgres aborts purchase A', [e['s'] for e in P['runs']['readonly|serializable']['errors']] == ['A'])
check('s3: report totals 100, batch then 150', '100' in P['runs']['readonly|repeatable read']['why'] and '150' in P['runs']['readonly|repeatable read']['why'])
# section 4: the matrix statements
check('s4: Postgres read committed prevents only the dirty read', [k for k in P['scenarios'] if not occ(P, k + '|read committed')] == ['dirty'])
rr = {k: occ(P, k + '|repeatable read') for k in P['scenarios']}
check('s4: Postgres repeatable read lets through write skew, quota, read-only only', sorted(k for k, v in rr.items() if v) == ['quota', 'readonly', 'writeskew'])
check('s4: Postgres serializable prevents all, by 40001 only', all(not occ(P, k + '|serializable') and codes(P, k + '|serializable') in ([], ['40001']) for k in P['scenarios'])
      and all(not P['runs'][k + '|serializable']['blocks'] for k in P['scenarios']))
myrr = sorted(k for k in Y['scenarios'] if occ(Y, k + '|repeatable read'))
check('s4: MySQL repeatable read lets through lost update, both write skews, read-only', myrr == ['lost', 'quota', 'readonly', 'writeskew'], myrr)
check('s4: MySQL read skew prevented at repeatable read', not occ(Y, 'readskew|repeatable read'))
check('s4: MySQL serializable: lost, writeskew, quota end in deadlock 1213', all(codes(Y, k + '|serializable') == ['1213'] for k in ('lost', 'writeskew', 'quota')))
check('s4: MySQL serializable prevents all', all(not occ(Y, k + '|serializable') for k in Y['scenarios']))
# Hermitage agreement (G-single R/O for MySQL RR; P4 lost update not prevented by MySQL RR; PG RR prevents P4 and G-single, not G2-item)
check('s4: agrees with Hermitage', occ(Y, 'lost|repeatable read') and not occ(P, 'lost|repeatable read') and not occ(P, 'readskew|repeatable read') and occ(P, 'writeskew|repeatable read'))
# section 2: durability
D = X['durability']; ratio = D['default_on']['commits_per_s'] / D['writethrough_on']['commits_per_s']
check('s2: writethrough is "tens of times slower"', 10 <= ratio < 100, round(ratio, 1))
check('s2: synchronous_commit off is faster than on (default flush)', D['default_off']['commits_per_s'] > D['default_on']['commits_per_s'])
g1 = D['default_off']['commits_per_s'] / D['default_on']['commits_per_s']; g2 = D['writethrough_off']['commits_per_s'] / D['writethrough_on']['commits_per_s']
check('s2: synchronous_commit off gains about 1.5x (default) and about 86x (writethrough)', 1.3 < g1 < 1.7 and 70 < g2 < 100, (round(g1, 2), round(g2, 1)))
# section 5: the MVCC trace
fin = {k: r['final']['balance'][0][0] for k, r in MV['runs'].items()}
check('s5: MVCC trace finals 25, 15, 15', fin == {'naive': 25, 'for_update': 15, 'serializable': 15}, fin)
fu = MV['runs']['for_update']['steps'][1]['probe'][0]
check('s5: FOR UPDATE writes a lock-only xmax into the row', fu['xmax_is_lock_only'] and fu['xmax'] > 0)
check('s5: serializable B refused with 40001 at its UPDATE', any(f.get('code') == '40001' for f in MV['runs']['serializable']['steps'][6]['finished']))
# section 6 and 7: locks and deadlocks
lq = X['lock_queue']['steps']
check('s6: lock queue: B and C blocked, both finish after A commits', lq[2].get('blocked') and lq[3].get('blocked') and {f['i'] for f in lq[4]['finished']} == {2, 3, 4})
lt = X['lock_queue_timeout']['steps']
check('s6: lock_timeout: migration fails 55P03 after about 200 ms, C not blocked', lt[2]['finished'][0].get('code') == '55P03' and 150 < lt[2]['finished'][0]['ms'] < 400 and not lt[3].get('blocked'), lt[2]['finished'][0]['ms'])
check('s6: SKIP LOCKED gives worker B job 2 at once', X['jobs_skip']['steps'][3]['finished'][0]['rows'] == [[2]] and not X['jobs_skip']['steps'][3].get('blocked'))
check('s6: NOWAIT errors with 55P03', X['jobs_nowait']['steps'][3]['finished'][0].get('code') == '55P03')
dl = [f for s in X['deadlock']['steps'] for f in s['finished'] if f.get('code') == '40P01']
check('s7: deadlock detected after about 1.0 s, B killed', len(dl) == 1 and dl[0]['s'] == 'B' and 950 < dl[0]['ms'] < 1300, dl[0]['ms'] if dl else None)
check('s7: ordered locking: no error, both transfers applied', all(not f.get('error') for s in X['deadlock_ordered']['steps'] for f in s['finished'])
      and X['deadlock_ordered']['final']['balances'] == [[7, 28], [12, 22]])
# section 8
check('s8: optimistic: B first gets UPDATE 0, final (15, 3)', X['optimistic']['steps'][3]['finished'][0]['status'] == 'UPDATE 0' and X['optimistic']['final']['row'] == [[15, 3]])
check('s6: advisory: B refused, then granted', X['advisory']['steps'][1]['finished'][0]['rows'] == [[False]] and X['advisory']['steps'][3]['finished'][0]['rows'] == [[True]])
# section 9: the benchmark
R = {(r['mode'], r['clients'], r['contention']): r for r in B['runs']}
check('s9: all 24 runs completed (no stall)', len(R) == 24 and not any(r.get('stalled') for r in B['runs']))
sp = [R[(m, 32, 'spread')]['commits_per_s'] for m in ('rc_naive', 'rc_atomic', 'rc_for_update', 'ser_retry')]
check('s9: spread, 32 clients: four ways within about 25% of each other', max(sp) / min(sp) < 1.3, sp)
check('s9: spread: serializable retries about 1 in 100 or fewer', all(R[('ser_retry', n, 'spread')]['retries_per_commit'] <= 0.02 for n in (2, 8, 32)))
h32 = R[('ser_retry', 32, 'hot')]
check('s9: hot, 32: serializable more than one retry per commit and hundreds given up', h32['retries_per_commit'] > 1 and 100 <= h32['gave_up'] < 1000, (h32['retries_per_commit'], h32['gave_up']))
check('s9: hot, 32: serializable well behind atomic UPDATE', h32['commits_per_s'] < 0.6 * R[('rc_atomic', 32, 'hot')]['commits_per_s'])
check('s9: hot, 2 clients: dozens of serializable transactions given up', 12 <= R[('ser_retry', 2, 'hot')]['gave_up'] < 100, R[('ser_retry', 2, 'hot')]['gave_up'])
check('s9: naive lost tens of thousands of updates (hot, 32)', R[('rc_naive', 32, 'hot')]['lost_updates'] >= 10000, R[('rc_naive', 32, 'hot')]['lost_updates'])
check('s9: no correct mode lost an update', all(r['lost_updates'] == 0 for r in B['runs'] if r['mode'] != 'rc_naive'))
# section 10: long transaction
LT = X['long_tx']
check('s10: control stays one page', LT['control']['size'] == 8192)
check('s10: held: over a hundred pages', LT['size_held'] // 8192 > 100, LT['size_held'] // 8192)
check('s10: VACUUM while held removed 0, 20,000 not removable', LT['vacuum_held']['removed'] == 0 and LT['vacuum_held']['dead_not_removable'] == 20000)
check('s10: after: removed 20,000, size unchanged', LT['vacuum_after']['removed'] == 20000 and LT['size_after'] == LT['size_held'])
check('s10: updates more than twice as long', LT['update_s_held'] / LT['control']['update_s'] > 2, round(LT['update_s_held'] / LT['control']['update_s'], 2))
check('s10: one-row read several times slower', LT['lat_held_us'] / LT['control']['lat_us'] > 3, round(LT['lat_held_us'] / LT['control']['lat_us'], 1))
# the data part is current
js = open(os.path.join(HERE, 'parts', '22_js_data.js')).read()
D2 = json.loads(js[js.index('=') + 1:].rstrip().rstrip(';'))
check('data part matches inputs (bench and durability)', D2['bench']['runs'][0]['commits_per_s'] == B['runs'][0]['commits_per_s'] and D2['extras']['durability'] == X['durability'])
check('data part matches inputs (matrix)', all(D2['engines']['pg']['runs'][k]['occ'] == int(v['occurred']) for k, v in P['runs'].items()))
json.dump(out, open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=1)
print('ALL PASS' if ok else 'FAILURES'); sys.exit(0 if ok else 1)
