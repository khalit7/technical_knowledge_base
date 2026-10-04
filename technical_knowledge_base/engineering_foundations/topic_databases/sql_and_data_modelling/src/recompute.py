"""Independent checks of every number and claim the page quotes, from the raw measurement files in inputs/ and the root's
data. Plain python3, no dependencies. Writes recompute_out.json, which src/check_page.mjs compares with the page's
JavaScript (the window animation, the B-tree model, the normalisation counters and the numbers filled into the text).
Run: python3 recompute.py   (exit code 1 if any claim fails)"""
import os, sys, json, re
HERE = os.path.dirname(os.path.abspath(__file__)); INP = os.path.join(HERE, 'inputs')
J = lambda n: json.load(open(os.path.join(INP, n)))
D = json.load(open(os.path.join(HERE, '..', '..', 'src', 'sql', 'data.json')))
E = J('examples.json')['runs']; A = J('alter.json'); Q = J('queue.json'); K = J('keys.json'); N1 = J('n1.json'); N1b = J('n1_repeat.json')
ok = []
def check(name, cond): ok.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name)
rows = lambda k, eng='pg': [r for r in E[k][eng] if 'cols' in r]
errs = lambda k, eng='pg': [r['error'] for r in E[k][eng] if 'error' in r]
val = lambda k, i, eng='pg': rows(k, eng)[i]['rows'][0][0]

# ---- examples: the facts the Reading tab states ----
check('q_alias: Postgres refuses the alias in WHERE, SQLite accepts it', errs('q_alias') and not errs('q_alias', 'sqlite_py'))
check('j_left_trap: filter in WHERE keeps fewer users than in ON (which keeps all 50)', val('j_left_trap', 0) < val('j_left_trap', 1) == 50)
check('j_semi: the JOIN returns more rows than EXISTS', val('j_semi', 0) > val('j_semi', 1))
check('j_anti: the three anti joins agree on 6 users', [val('j_anti', i) for i in range(3)] == [6, 6, 6])
team = [u for u in D['users'] if u[3] == 'team']
check('two of the five team-plan users have no country', len(team) == 5 and sum(u[4] is None for u in team) == 2)
check('j_notin_null: NOT IN returns 0, NOT EXISTS more (both engines)', val('j_notin_null', 0) == 0 < val('j_notin_null', 1) and val('j_notin_null', 0, 'sqlite_py') == 0)
fw, fr = rows('j_fanout')[0]['rows'], rows('j_fanout')[1]['rows']
check('j_fanout: the single join overcounts chats', any(a[1] > b[1] for a, b in zip(fw, fr)) and [a[2] for a in fw] == [b[2] for b in fr])
wl = rows('w_last')[0]['rows']
check('w_last: default frame returns the current row, whole frame the last message', all(r[1] == r[2] for r in wl) and len({r[3] for r in wl}) == 1)
wr = rows('w_range')[0]['rows']
check('w_range: RANGE gives tied days the same count, ROWS does not', any(a[2] == b[2] and a[1] == b[1] for a, b in zip(wr, wr[1:])) and [r[3] for r in wr] == list(range(1, len(wr) + 1)))
check('u_upsert: two upserts add up to 200 tokens', rows('u_upsert')[-1]['rows'][0][2] == 200)
un = rows('u_nothing')
check('u_nothing: first insert returns a row, the second none, one stored', un[0]['n'] == 1 and un[1]['n'] == 0 and un[2]['rows'][0][0] == 1)
d = rows('t_dst')[0]['rows'][0]
check('t_dst: +1 day and +24 hours differ by an hour', str(d[0]) != str(d[1]))
check('m_enum: DROP VALUE does not exist', any('syntax error' in e for e in errs('m_enum')))
rl = rows('m_rls')
check('m_rls: owner sees 3 rows, tenant 2 sees its 1, the cross-tenant insert is refused', rl[0]['rows'][0][0] == 3 and rl[1]['n'] == 1 and any('row-level security' in e for e in errs('m_rls')))
check('m_partial: the second pinned chat is refused', len(errs('m_partial')) == 1 and len(errs('m_partial', 'sqlite_py')) == 1)
check('m_soft: re-signup allowed, a second live copy refused', len(errs('m_soft')) == 1 and rows('m_soft')[-1]['n'] == 2)
fk = errs('m_fk')
check('m_fk: RESTRICT refuses through folder_chats, CASCADE leaves no links', len(fk) == 1 and 'folder_chats' in fk[0] and rows('m_fk')[-1]['rows'][0][0] == 0)
check('m_trigger: the counter equals the real count', rows('m_trigger')[-1]['rows'][0][1] == rows('m_trigger')[-1]['rows'][0][2])
check('m_quote: unquoted name folds to lower case and is not found', any('chattags' in e for e in errs('m_quote')))
check('n_anomaly: two names for user 7 after the partial update', rows('n_anomaly')[-1]['n'] == 2)

# ---- ALTER TABLE: the claims of section 11 and the tab ----
o = {x['id']: x for x in A['ops']}
check('alter: constant DEFAULT is metadata only (< 10 ms, no rewrite)', o['add_const']['median_s'] < 0.01 and not o['add_const']['rewrite'])
check('alter: volatile DEFAULT, generated STORED, int->bigint, text->varchar rewrite', all(o[k]['rewrite'] for k in ('add_volatile', 'add_generated', 'type_bigint', 'type_text')))
check('alter: widening varchar does not rewrite', not o['type_widen']['rewrite'])
check('alter: ADD FOREIGN KEY holds ShareRowExclusive, blocks writes not reads', 'ShareRowExclusiveLock' in o['fk']['locks'] and not o['fk']['blocks_read'] and o['fk']['blocks_write'])
check('alter: VALIDATE blocks neither reads nor writes', all(not o[k]['blocks_read'] and not o[k]['blocks_write'] for k in ('check_validate', 'fk_validate')))
check('alter: CREATE INDEX blocks writes not reads; CONCURRENTLY neither', o['index']['blocks_write'] and not o['index']['blocks_read'] and not o['index_conc']['blocks_write'] and not o['index_conc']['blocks_read'])
check('alter: SET NOT NULL with a validated CHECK skips the scan', o['set_nn_check']['median_s'] < o['set_nn']['median_s'] / 10)
check('alter: every ACCESS EXCLUSIVE change blocked the probe SELECT', all(x['blocks_read'] for x in A['ops'] if x['strongest'] == 'AccessExclusiveLock'))
check('alter: 21 changes on 2,000,000 rows', len(A['ops']) == 21 and A['table']['rows'] == 2_000_000)

# ---- the lock queue ----
S = Q['scenarios']
check('queue: without lock_timeout every read waited over 3 s', S['long']['summary']['max_read_wait'] > 3 and S['long']['summary']['reads_over_100ms'] == 7)
check('queue: with lock_timeout 500 ms no read waited more than 0.5 s', S['timeout']['summary']['max_read_wait'] < 0.5 and S['timeout']['summary']['alter_attempts'] == 3)
check('queue: with no long transaction reads take about a millisecond', S['quick']['summary']['max_read_wait'] < 0.01)
check('queue: all three runs of each scenario agree', all(max(s['max_read_wait'] for s in S[k]['all_summaries']) < (3.6 if k == 'long' else 0.5 if k == 'timeout' else 0.01) for k in S))

# ---- keys ----
kr = lambda kind, n, mode='bulk': next(r for r in K['runs'] if r['kind'] == kind and r['n'] == n and r['mode'] == mode)
for n in (1_000_000, 10_000_000):
    check(f'keys {n:,}: index v4 > v7 > bigint', kr('uuid_v4', n)['index_bytes'] > kr('uuid_v7', n)['index_bytes'] > kr('bigint', n)['index_bytes'])
    check(f'keys {n:,}: WAL v4 > v7', kr('uuid_v4', n)['wal_bytes'] > kr('uuid_v7', n)['wal_bytes'])
check('keys 10M: the v4 index exceeds 128 MB of shared buffers', kr('uuid_v4', 10_000_000)['index_bytes'] > 128 * 2**20 and K.get('settings', {}).get('shared_buffers', '16384') == '16384')

# ---- N+1 ----
for R_ in (N1, N1b):
    for r in R_['runs']:
        w = r['ways']
        check(f"n1 {r['path']} N={r['n']}: queries 1+N, 2, 1, 1 and lazy slowest", w['lazy']['queries'] == r['n'] + 1 and w['selectinload']['queries'] == 2 and w['joinedload']['queries'] == 1 and w['one_sql']['queries'] == 1 and w['lazy']['median_ms'] == max(v['median_ms'] for v in w.values()))

# ---- values the page's JavaScript computes (compared by check_page.mjs) ----
pool = None
msgs = [m for m in D['messages']]
c11 = sorted([m for m in msgs if m[1] == 11], key=lambda m: m[0]); tok = [m[4] for m in c11]
win = {'sum': [sum(tok[:i + 1]) for i in range(len(tok))],
       'avg3': [round(sum(tok[max(0, i - 2):i + 1]) / len(tok[max(0, i - 2):i + 1]) * 10) / 10 for i in range(len(tok))],
       'lag': [None] + tok[:-1], 'rank': [1 + sum(t > x for t in tok) for x in tok], 'last': tok[:], 'lastall': [tok[-1]] * len(tok)}
wr2 = rows('w_running', 'sqlite_py')[0]['rows']
check('window animation: running total matches SQLite', [r[3] for r in wr2] == win['sum'][:len(wr2)])
chats7 = [c[0] for c in D['chats'] if c[1] == 7]
per = {c: sum(1 for m in msgs if m[1] == c) for c in chats7}; per = {c: n for c, n in per.items() if n}
norm = {'N': sum(per.values()), 'K': per[min(per)], 'BUG': min(per)}
nrow = {r[0]: r[1] for r in rows('n_anomaly', 'sqlite_py')[-1]['rows']}
check('normalisation animation: N and K match the n_anomaly example', sum(nrow.values()) == norm['N'] and nrow.get('Ines Novak-Reyes') == norm['K'])
# the B-tree model, re-implemented
def lcg_keys(k):
    s = 20261004; out = []
    for _ in range(k): s = (s * 1103515245 + 12345) % 2147483648; out.append(int(s / 2147483648 * 1e6))
    return out
def sim(keys, C=6):
    leaves = [[]]; splits = 0
    for x in keys:
        li = next((i for i, l in enumerate(leaves) if l and l[-1] >= x), len(leaves) - 1); L = leaves[li]
        if len(L) < C: L.append(x); L.sort()
        else:
            splits += 1
            if li == len(leaves) - 1 and x > L[-1]: leaves.append([x])
            else:
                left, right = L[:C // 2], L[C // 2:]; leaves[li:li + 1] = [left, right]
                (left if x <= left[-1] else right).append(x); left.sort(); right.sort()
    return {'leaves': len(leaves), 'splits': splits, 'fill': round(100 * sum(map(len, leaves)) / (len(leaves) * C))}
bt = {'seq': sim(list(range(1, 37))), 'rand': sim(lcg_keys(36))}
check('B-tree model: sequential pages full, random pages emptier', bt['seq']['fill'] == 100 and bt['rand']['fill'] < 90)
def mb(b): return f'{b / 2**20:.1f} MB'
M = {'alter_rows': f"{A['table']['rows']:,}", 'alter_size': A['table']['table_size'],
     'add_const_ms': f"{o['add_const']['median_s'] * 1000:.1f}", 'add_volatile_s': f"{o['add_volatile']['median_s']:.1f}",
     'type_bigint_s': f"{o['type_bigint']['median_s']:.1f}", 'index_s': f"{o['index']['median_s']:.2f}", 'index_conc_s': f"{o['index_conc']['median_s']:.2f}",
     'q_long_max': f"{S['long']['summary']['max_read_wait']:.2f}", 'q_timeout_max': f"{S['timeout']['summary']['max_read_wait']:.2f}",
     'q_quick_max_ms': f"{S['quick']['summary']['max_read_wait'] * 1000:.1f}",
     'k10_v4_idx': mb(kr('uuid_v4', 10_000_000)['index_bytes']), 'k10_v7_idx': mb(kr('uuid_v7', 10_000_000)['index_bytes']), 'k10_big_idx': mb(kr('bigint', 10_000_000)['index_bytes'])}
js = open(os.path.join(HERE, 'parts', '32_js_data.js')).read()
Mjs = json.loads(re.search(r'"M":(\{[^}]*\})', js).group(1))
check('numbers filled into the text equal the independent recomputation', Mjs == M)
json.dump({'win': win, 'win_ids': [m[0] for m in c11], 'norm': norm, 'bt': bt, 'M': M}, open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=1)
bad = [n for n, c in ok if not c]
print(f'{len(ok) - len(bad)} of {len(ok)} checks pass'); sys.exit(1 if bad else 0)
