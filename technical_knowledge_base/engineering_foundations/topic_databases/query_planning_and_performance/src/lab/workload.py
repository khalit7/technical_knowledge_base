"""The slow-query workflow on a replayed workload. pgbench (from the same PostgreSQL 16.2 build) replays six of the chat
product's queries with random parameters, 4 clients, 1,000 transactions each, weights below. pg_stat_statements
collects per-query totals; auto_explain and log_min_duration_statement log anything slower than 20 ms.
Then the top query by total time is explained, fixed with one index, and the same workload is replayed.
Writes ../inputs/workload.json."""
import os, sys, json, re, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import *
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'workload')
OUT = os.path.join(HERE, '..', 'inputs', 'workload.json')
WEIGHTS = {'open_chat': 40, 'sidebar': 25, 'login': 20, 'search': 8, 'usage': 6, 'report': 1}
def replay(tag):
    psql('SELECT pg_stat_statements_reset()')
    args = [f'{B}/pgbench', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-n', '-c', '4', '-j', '4', '-t', '1000', '--random-seed', '7']
    for k, w in WEIGHTS.items(): args += ['-f', f'{W}/{k}.sql@{w}']
    t0 = time.time(); r = sh(*args, 'chat'); wall = time.time() - t0
    tps = re.search(r'tps = ([0-9.]+)', r.stdout)
    lat = re.search(r'latency average = ([0-9.]+) ms', r.stdout)
    top = json.loads(psql('''SELECT json_agg(x) FROM (SELECT left(regexp_replace(query, '\\s+', ' ', 'g'), 200) AS query, calls, round(total_exec_time::numeric, 1) AS total_ms,
      round(mean_exec_time::numeric, 3) AS mean_ms, round(max_exec_time::numeric, 2) AS max_ms, rows, shared_blks_hit AS hit, shared_blks_read AS read, temp_blks_written AS temp,
      round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct
      FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'chat') AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC LIMIT 8) x'''))
    print(tag, 'tps', tps and tps.group(1), 'wall', round(wall, 1), flush=True)
    for t in top: print('  ', t['pct'], t['calls'], t['mean_ms'], t['query'][:80], flush=True)
    return {'tps': float(tps.group(1)) if tps else None, 'latency_avg_ms': float(lat.group(1)) if lat else None, 'wall_s': round(wall, 1), 'top': top, 'pgbench': r.stdout[-900:]}
o = {'weights': WEIGHTS, 'scripts': {k: open(f'{W}/{k}.sql').read() for k in WEIGHTS}}
psql('DROP INDEX IF EXISTS chats_title')
for st in ["auto_explain.log_min_duration = '20ms'", 'auto_explain.log_analyze = on', 'auto_explain.log_buffers = on', 'auto_explain.log_timing = off', "log_min_duration_statement = '20ms'"]:
    psql('ALTER SYSTEM SET ' + st)
psql('SELECT pg_reload_conf()')
time.sleep(1)
logpos = os.path.getsize(ROOT + '/log')
o['before'] = replay('before')
log = open(ROOT + '/log', errors='ignore').read()[logpos:]
for st in ['auto_explain.log_min_duration', 'auto_explain.log_analyze', 'auto_explain.log_buffers', 'auto_explain.log_timing', 'log_min_duration_statement']:
    psql('ALTER SYSTEM RESET ' + st)
psql('SELECT pg_reload_conf()')
blocks = re.split(r'\n(?=\d{4}-\d\d-\d\d )', log)
o['log_sample'] = {'duration': next((b for b in blocks if 'duration:' in b and 'statement:' in b and 'LIKE' in b), None),
                   'auto_explain': next((b for b in blocks if 'plan:' in b and 'LIKE' in b), None), 'n_logged': sum('plan:' in b for b in blocks)}
SEARCH = "SELECT id, title FROM chats WHERE title LIKE 'Chat 123456%' ORDER BY id LIMIT 10"
o['explain_before'] = explain_text(SEARCH)
t0 = time.time(); psql('CREATE INDEX chats_title ON chats (title)'); o['index_build_s'] = round(time.time() - t0, 2)
o['index_bytes'] = int(psql("SELECT pg_relation_size('chats_title')"))
o['explain_after'] = explain_text(SEARCH)
o['after'] = replay('after')
psql('DROP INDEX chats_title')   # leave the shared clone as found
json.dump(o, open(OUT, 'w'), indent=1)
