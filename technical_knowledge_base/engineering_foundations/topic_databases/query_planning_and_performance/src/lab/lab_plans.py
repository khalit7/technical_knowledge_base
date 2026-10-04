"""Real EXPLAIN (ANALYZE, BUFFERS) outputs for the Plan reading lab tab (the other lab plans come from workload.json,
generic.json and engine.json). Writes ../inputs/lab_plans.json."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'lab_plans.json')
o = {}
def warm_text(sql, pre=''):
    explain_text(sql, pre=pre)          # first run warms the cache; keep the second
    return explain_text(sql, pre=pre)
# correlated filters feeding a join (stats_users has no extended statistics after stats.py dropped su_all? recreate plain copy)
psql('DROP TABLE IF EXISTS lab_users; CREATE TABLE lab_users AS SELECT * FROM users; ALTER TABLE lab_users ADD PRIMARY KEY (id); ANALYZE lab_users;')
J = "SELECT u.id, count(*) AS chats FROM lab_users u JOIN chats c ON c.user_id = u.id WHERE u.country = 'GB' AND u.city = 'London' GROUP BY u.id ORDER BY chats DESC LIMIT 5"
o['corr_before'] = {'sql': J, 'text': warm_text(J)}
psql('CREATE STATISTICS lab_users_geo (dependencies, mcv) ON country, city FROM lab_users; ANALYZE lab_users;')
o['corr_after'] = {'sql': J, 'text': warm_text(J)}
# parallel aggregate: rows per loop
P = 'SELECT role, count(*), avg(tokens) FROM messages WHERE created_at < timestamptz \'2025-12-01\' GROUP BY role'
o['parallel'] = {'sql': P, 'text': warm_text(P)}
# lossy bitmap
L = 'SELECT count(*) FROM messages WHERE id BETWEEN 1 AND 2000000'
o['lossy'] = {'sql': L, 'text': warm_text(L, pre="SET work_mem = '64kB'; SET enable_seqscan = off; SET enable_indexscan = off; SET enable_indexonlyscan = off; SET max_parallel_workers_per_gather = 0; "),
              'text_ok': warm_text(L, pre="SET enable_seqscan = off; SET enable_indexscan = off; SET enable_indexonlyscan = off; SET max_parallel_workers_per_gather = 0; ")}
# correlated subquery run once per outer row
S = "SELECT u.id, (SELECT max(m.created_at) FROM chats c JOIN messages m ON m.chat_id = c.id WHERE c.user_id = u.id) AS last_message FROM users u WHERE u.country = 'SE' AND u.plan = 'team'"
o['subplan'] = {'sql': S, 'text': warm_text(S)}
for k, v in o.items(): print('=====', k); print(v['text'])
json.dump(o, open(OUT, 'w'), indent=1)
