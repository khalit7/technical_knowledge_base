"""Prepared statements: a generic plan chosen after five custom plans, then reused for a skewed parameter.
Adds one table to the chat product: usage_events, one row per model call billed to a customer organisation.
4,000,000 rows; organisation 1 (one enterprise customer) owns half of them, the other half is spread over 20,000
organisations (about 100 rows each). Deterministic (setseed). Writes ../inputs/generic.json."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'generic.json')
if psql("SELECT count(*) FROM pg_class WHERE relname = 'usage_events'") == '0':
    psql('''SELECT setseed(0.5);
CREATE TABLE usage_events (id bigint PRIMARY KEY, org_id int NOT NULL, chat_id bigint NOT NULL, tokens int NOT NULL, created_at timestamptz NOT NULL) WITH (autovacuum_enabled = false);
INSERT INTO usage_events SELECT i, CASE WHEN random() < 0.5 THEN 1 ELSE 2 + floor(random() * 20000)::int END,
  1 + floor(random() * 1000000)::bigint, 10 + floor(random() * 2000)::int, timestamptz '2026-01-01' + i * interval '2 seconds'
FROM generate_series(1, 4000000) i;
CREATE INDEX usage_events_org ON usage_events (org_id);''', timeout=600)
    psql('VACUUM ANALYZE usage_events', timeout=600)
Q = 'SELECT c.model, count(*), sum(e.tokens) FROM usage_events e JOIN chats c ON c.id = e.chat_id WHERE e.org_id = $1 GROUP BY c.model'
def session(lines, pre='', q=None):
    """One psql session: PREPARE, then each EXPLAIN (ANALYZE) EXECUTE; returns the list of JSON plans."""
    sql = pre + f'PREPARE q(int) AS {q or Q};\n' + ''.join(f'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) EXECUTE q({v});\n' for v in lines)
    r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', 'chat', input=sql)
    if r.returncode: raise RuntimeError(r.stderr)
    out, buf, depth = [], '', 0
    for ch in r.stdout:
        if ch == '[' and depth == 0 and buf.strip() == '': buf = ''
        buf += ch
        if ch == '[': depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0: out.append(json.loads(buf)[0]); buf = ''
    return out
def summ(e):
    p = e['Plan']; nodes = []
    def walk(n, d=0):
        nodes.append(('  ' * d) + n['Node Type'] + (' on ' + n['Relation Name'] if 'Relation Name' in n else '') + (' using ' + n['Index Name'] if 'Index Name' in n else ''))
        for c in n.get('Plans', []): walk(c, d + 1)
    walk(p)
    gen = any('$1' in json.dumps(x) for x in [p])
    return {'ms': round(e['Execution Time'], 2), 'plan_ms': round(e.get('Planning Time', 0), 3), 'cost': p['Total Cost'], 'nodes': nodes, 'generic': gen}
o = {'sql': Q, 'rows_org1': int(psql('SELECT count(*) FROM usage_events WHERE org_id = 1')), 'rows_org77': int(psql('SELECT count(*) FROM usage_events WHERE org_id = 77')),
     'stats': psql("SELECT n_distinct || ' | ' || (most_common_vals::text::int[])[1] || ' | ' || most_common_freqs[1] FROM pg_stats WHERE tablename = 'usage_events' AND attname = 'org_id'")}
small = [77, 1234, 5555, 9001, 15000]
# warm both plans' pages once
session([77, 1]); session([1], pre='SET plan_cache_mode = force_generic_plan;\n')
def rep(*a, **k):
    # the same session three times; each position keeps its fastest run (the plans are identical across runs)
    runs = [[summ(e) for e in session(*a, **k)] for _ in range(3)]
    best = []
    for i in range(len(runs[0])):
        r = dict(runs[0][i]); r['ms_runs'] = [x[i]['ms'] for x in runs]; r['ms'] = min(r['ms_runs']); best.append(r)
        assert all(x[i]['nodes'] == r['nodes'] for x in runs)
    return best
o['auto'] = rep(small + [1, 1, 42])
o['force_custom'] = rep(small + [1, 1, 42], pre='SET plan_cache_mode = force_custom_plan;\n')
HINT = '/*+ HashJoin(e c) SeqScan(e) */ '
o['hint_sql'] = HINT + Q
o['hint'] = rep(small + [1, 1, 42], q=HINT + Q)
o['generic_text'] = psql(f"PREPARE q(int) AS {Q}; SET plan_cache_mode = force_generic_plan; EXPLAIN (ANALYZE, BUFFERS) EXECUTE q(1);")
o['custom_text'] = psql(f"PREPARE q(int) AS {Q}; SET plan_cache_mode = force_custom_plan; EXPLAIN (ANALYZE, BUFFERS) EXECUTE q(1);")
o['custom_small_text'] = psql(f"PREPARE q(int) AS {Q}; SET plan_cache_mode = force_custom_plan; EXPLAIN (ANALYZE, BUFFERS) EXECUTE q(77);")
o['prepared'] = psql("PREPARE q(int) AS SELECT 1 WHERE $1 > 0; EXECUTE q(1); EXECUTE q(1); EXECUTE q(1); EXECUTE q(1); EXECUTE q(1); EXECUTE q(1); SELECT generic_plans || ' ' || custom_plans FROM pg_prepared_statements")
for k in ['auto', 'force_custom']:
    for i, r in enumerate(o[k]): print(k, i, r['ms'], r['generic'], r['nodes'][:4], flush=True)
json.dump(o, open(OUT, 'w'), indent=1)
