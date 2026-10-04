"""Recompute every number the Reading tab states or animates, and compare with the page.
Run after build.sh and check_read.mjs:  python3 recompute.py   (plain Python 3, no packages)
Sources: inputs/read_measure.json (measure_read.py), ../atlas/inputs/pg_tps.json (atlas agent), the page parts.
"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(H, '..', 'parts')
m = json.load(open(os.path.join(H, 'inputs', 'read_measure.json')))
read = ''.join(open(os.path.join(P, f)).read() for f in sorted(os.listdir(P)) if f.startswith('20_read'))
js = open(os.path.join(P, '22_js_rd_data.js')).read()
ok = fail = 0
def check(name, cond, info=''):
    global ok, fail
    if cond: ok += 1
    else: fail += 1; print('FAIL', name, info)
def jsnum(key):
    r = re.search(r'\b' + key + r':([0-9.]+)', js); return float(r.group(1))
# 1. measured constants in the page's data file equal the measurement file
pairs = {'heapPages': m['heap_pages'], 'heapBytes': m['heap_bytes'], 'seqPages': m['lookup_seq']['pages'], 'seqHit': m['lookup_seq']['hit'],
         'seqRead': m['lookup_seq']['read'], 'seqMs': m['lookup_seq']['ms'], 'idxPages': m['lookup_idx']['nodes'][1]['hit'] + m['lookup_idx']['nodes'][1]['read'],
         'idxMs': m['lookup_idx']['ms'], 'chatRows': m['lookup_idx']['rows'], 'chatHeapPages': m['chat_heap_pages'], 'indexBytes': m['index_bytes'],
         'aggRowBytes': m['agg_row']['bytes'], 'aggRowMs': m['agg_row']['ms'], 'pqFile': m['parquet_file_bytes'], 'aggColMs': m['agg_col']['ms_median']}
for k, v in pairs.items(): check('data ' + k, abs(jsnum(k) - v) < 1e-9, f'{jsnum(k)} vs {v}')
for c, v in m['parquet_cols'].items():
    check('pq ' + c, re.search(r'pq:\{[^}]*\b' + c + r':' + str(v['compressed']), js) is not None)
    check('pqU ' + c, re.search(r'pqU:\{[^}]*\b' + c + r':' + str(v['uncompressed']), js) is not None)
check('credits naive', m['credits_naive']['sent'] == 'tab_a,tab_b' and m['credits_naive']['balance'] == '0')
check('credits lock', m['credits_lock']['sent'] == 'tab_a' and m['credits_lock']['balance'] == '0')
check('credits serializable', m['credits_serializable']['sent'] == 'tab_a' and 'could not serialize access due to concurrent update' in m['credits_serializable']['session_output']['tab_b'])
# 2. derived numbers stated in the prose
colb = m['parquet_cols']['model']['compressed'] + m['parquet_cols']['tokens']['compressed']
ratio = m['agg_row']['bytes'] / colb
check('94 times', round(ratio) == 94 and '94 times' in read, ratio)
check('52 rows per page', round(m['rows'] / m['heap_pages']) == 52 and 'about 52 rows' in read)
check('index 6%', round(100 * m['index_bytes'] / m['heap_bytes']) == 6 and '6% of the table' in read)
check('9.3 MB', f"{m['index_bytes'] / 1e6:.1f}" == '9.3' and '9.3 MB' in read)
check('157.7 MB', f"{m['agg_row']['bytes'] / 1e6:.1f}" == '157.7' and '157.7 MB' in read)
check('158 GB at a billion', round(m['agg_row']['bytes'] * 1000 / 1e9) == 158 and 'about 158 GB' in read)
check('19,251 pages', m['agg_row']['pages'] == 19251 and '19,251 pages' in read)
check('70 ms', round(m['agg_row']['ms']) == 70 and '70 ms' in read)
check('19,349 / 28 ms', m['lookup_seq']['pages'] == 19349 and round(m['lookup_seq']['ms']) == 28 and '19,349 pages and took 28 ms' in read)
check('19,235 pages 157 MB', m['heap_pages'] == 19235 and '19,235 pages (157 MB)' in read)
check('14,435 / 4,914', '14,435' in read and '4,914' in read and m['lookup_seq']['hit'] == 14435)
check('role 254,530 to 862', m['parquet_cols']['role']['uncompressed'] == 254530 and m['parquet_cols']['role']['compressed'] == 862 and '254,530 bytes to 862' in read)
mini = dict(m['agg_col']['result'])['mini']
check('mini total', mini == 80277256 and '80,277,256' in read and str(mini) in m['agg_result'])
check('2.6 ms', round(m['agg_col']['ms_median'], 1) == 2.6 and '2.6 ms' in read)
check('Buffers hit=12', 'shared hit=12' in read and m['lookup_idx']['nodes'][1]['hit'] == 12)
v = 1536 * 4
check('6,144 bytes', v == 6144 and '6,144 bytes' in read)
check('6,152 pgvector', v + 8 == 6152 and '6,152' in read)
check('6.2 GB / 615 GB', round((v + 8) * 1e6 / 1e9, 1) == 6.2 and round((v + 8) * 1e8 / 1e9) == 615 and 'about 6.2 GB' in read and 'about 615 GB' in read)
tps = json.load(open(os.path.join(H, '..', 'atlas', 'inputs', 'pg_tps.json')))
wt = {r['clients']: r['tps'] for r in tps['writethrough']['runs']}
check('148 / 2,133 tps', wt[1] == 148 and wt[32] == 2133 and '148 write transactions' in read and '2,133' in read)
# 3. the SQL animation's result, recomputed from the sample rows
D = {}
for t in ('users', 'chats', 'messages'):
    blk = re.search(t + r":\{cols:\[(.*?)\],rows:\[(.*?)\]\]\}", js)
    cols = [c.strip("'") for c in blk.group(1).split(',')]
    rows = [[x.strip().strip("'") for x in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', blk.group(2) + ']')]
    D[t] = [dict(zip(cols, r)) for r in rows]
chat_user = {c['id']: c['user_id'] for c in D['chats']}; uname = {u['id']: u['name'] for u in D['users']}
agg = {}
for msg in D['messages']:
    if msg['role'] != 'assistant': continue
    n = uname[chat_user[msg['chat_id']]]; a = agg.setdefault(n, [0, 0]); a[0] += 1; a[1] += int(msg['tokens'])
expect = sorted(([k, v[0], v[1]] for k, v in agg.items()), key=lambda r: -r[2])
co = os.path.join(H, 'check_out.json')
if os.path.exists(co):
    out = json.load(open(co))
    for run in out['runs']:
        got = [[r['name'], r['replies'], r['tokens']] for r in run['sql']]
        check('sql animation ' + run['scheme'], got == expect, f'{got} vs {expect}')
        cards = run['cards']
        check('idx final ' + run['scheme'], 'Pages read: 12' in cards['rd-idx/idx'] and 'Pages read: 19,349' in cards['rd-idx/seq'], cards['rd-idx/idx'])
        check('col final ' + run['scheme'], 'Bytes read: 1.68 MB' in cards['rd-col/col'] and 'Bytes read: 157.7 MB' in cards['rd-col/row'], cards['rd-col/col'])
        check('tx final ' + run['scheme'], 'Replies sent: 2' in cards['rd-tx/naive'] and 'Replies sent: 1' in cards['rd-tx/lock'] and 'Replies sent: 1' in cards['rd-tx/serializable'])
        check('cache final ' + run['scheme'], 'Stale answers: 1' in cards['rd-cache/ttl'] and 'Stale answers: 0' in cards['rd-cache/inv'] and 'Expensive queries: 4' in cards['rd-cache/db'], cards['rd-cache/ttl'])
        check('no errors ' + run['scheme'], not run['errors'] and not run['problems'] and not run['sideways'])
else:
    print('check_out.json missing: run check_read.mjs first')
print(f'recompute: {ok} ok, {fail} failed; SQL result {expect}')
json.dump({'ok': ok, 'failed': fail, 'sql': expect, 'ratio_bytes': round(ratio, 2)}, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1)
