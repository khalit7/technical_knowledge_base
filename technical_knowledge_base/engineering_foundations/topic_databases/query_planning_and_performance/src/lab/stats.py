"""Statistics section: what ANALYZE stores (pg_stats) for real columns, how the sample size changes it, and what each
kind of extended statistics fixes. Works on copies (stats_users, stats_chats) so the shared tables keep their statistics.
Writes ../inputs/stats.json."""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'stats.json')
o = {}
def est(sql, pre=''):
    # serial plans, so the top scan node's rows are for the whole table, not per parallel worker
    p = explain(sql, pre='SET max_parallel_workers_per_gather = 0; ' + pre)['Plan']
    return {'est': p['Plan Rows'], 'act': p['Actual Rows'] * p['Actual Loops'], 'node': p['Node Type']}
# 1. pg_stats rows as stored
o['pg_stats'] = {}
for t, c in [('users', 'country'), ('users', 'plan'), ('users', 'city'), ('messages', 'tokens'), ('messages', 'created_at'), ('chats', 'user_id'), ('messages', 'chat_id'), ('users', 'id')]:
    r = psql(f"SELECT null_frac, avg_width, n_distinct, most_common_vals::text, most_common_freqs::text, histogram_bounds::text, correlation FROM pg_stats WHERE tablename='{t}' AND attname='{c}'").split('|')
    o['pg_stats'][f'{t}.{c}'] = dict(null_frac=float(r[0]), avg_width=int(r[1]), n_distinct=float(r[2]), mcv=r[3] or None, mcf=r[4] or None, hist=r[5] or None, correlation=float(r[6]) if r[6] else None)
o['actual'] = {
 'users.country': psql("SELECT json_agg(x) FROM (SELECT country, count(*) n FROM users GROUP BY 1 ORDER BY 2 DESC) x"),
 'users.plan': psql("SELECT json_agg(x) FROM (SELECT plan, count(*) n FROM users GROUP BY 1 ORDER BY 2 DESC) x"),
 'chats.user_id_distinct': int(psql('SELECT count(DISTINCT user_id) FROM chats')),
 'messages.chat_id_distinct': int(psql('SELECT count(DISTINCT chat_id) FROM messages')),
 'chats.user_id_top': psql("SELECT json_agg(x) FROM (SELECT user_id, count(*) n FROM chats GROUP BY 1 ORDER BY 2 DESC LIMIT 5) x"),
}
print(o['actual'], flush=True)
# 2. statistics target on a copy of chats: n_distinct and the estimate for the busiest user and for a typical one
psql('DROP TABLE IF EXISTS stats_chats; CREATE TABLE stats_chats AS SELECT * FROM chats; ALTER TABLE stats_chats SET (autovacuum_enabled = false);')
top = json.loads(o['actual']['chats.user_id_top'])[0]['user_id']
o['target'] = []
for tg in [10, 100, 1000, 10000]:
    psql(f'ALTER TABLE stats_chats ALTER COLUMN user_id SET STATISTICS {tg}')
    t0 = time.time(); psql('ANALYZE stats_chats'); dt = time.time() - t0
    r = psql("SELECT n_distinct, coalesce(array_length(most_common_vals::text::bigint[],1),0), coalesce(array_length(histogram_bounds::text::bigint[],1),0) FROM pg_stats WHERE tablename='stats_chats' AND attname='user_id'").split('|')
    a = est(f'SELECT * FROM stats_chats WHERE user_id = {top}'); b = est('SELECT * FROM stats_chats WHERE user_id = 77777')
    o['target'].append(dict(target=tg, sample_rows=min(300 * tg, 1000000), analyze_s=round(dt, 3), n_distinct=float(r[0]), n_mcv=int(r[1]), n_hist=int(r[2]), top=a, typical=b))
    print(o['target'][-1], flush=True)
# 3. stale statistics: a bulk load the planner has not seen
psql('DROP TABLE IF EXISTS stale; CREATE TABLE stale (id bigint, user_id bigint, title text); ALTER TABLE stale SET (autovacuum_enabled = false); INSERT INTO stale SELECT i, i % 100, \'x\' FROM generate_series(1, 1000) i; ANALYZE stale; CREATE INDEX ON stale(user_id);')
o['stale'] = {'before_load': est('SELECT * FROM stale WHERE user_id = 7')}
psql("INSERT INTO stale SELECT i, CASE WHEN i % 10 = 0 THEN i % 100 ELSE 7 END, 'x' FROM generate_series(1001, 1000000) i")
o['stale']['after_load'] = est('SELECT * FROM stale WHERE user_id = 7')
o['stale']['after_load_plan'] = psql('EXPLAIN (ANALYZE, COSTS, TIMING OFF) SELECT * FROM stale WHERE user_id = 7')
psql('ANALYZE stale')
o['stale']['after_analyze'] = est('SELECT * FROM stale WHERE user_id = 7')
o['stale']['after_analyze_plan'] = psql('EXPLAIN (ANALYZE, COSTS, TIMING OFF) SELECT * FROM stale WHERE user_id = 7')
print(o['stale'], flush=True)
# 4. extended statistics on a copy of users (country, city: every city belongs to one country)
psql('DROP TABLE IF EXISTS stats_users; CREATE TABLE stats_users AS SELECT * FROM users; ANALYZE stats_users;')
Q = {'and': "SELECT * FROM stats_users WHERE country = 'GB' AND city = 'London'",
     'mismatch': "SELECT * FROM stats_users WHERE country = 'GB' AND city = 'Paris'",
     'group': 'SELECT country, city, count(*) FROM stats_users GROUP BY country, city',
     'in': "SELECT * FROM stats_users WHERE country IN ('GB','FR') AND city IN ('London','Paris')"}
def run_all():
    r = {}
    for k, q in Q.items():
        if k == 'group':
            p = explain(q, pre='SET max_parallel_workers_per_gather = 0; ')['Plan']; r[k] = {'est': p['Plan Rows'], 'act': p['Actual Rows'], 'node': p['Node Type']}
        else: r[k] = est(q)
    return r
o['ext'] = {'none': run_all()}
for kind in ['dependencies', 'ndistinct', 'mcv']:
    psql(f'DROP STATISTICS IF EXISTS su_{kind}; CREATE STATISTICS su_{kind} ({kind}) ON country, city FROM stats_users; ANALYZE stats_users;')
    o['ext'][kind] = run_all()
    psql(f'DROP STATISTICS su_{kind}')
o['ext']['dep_values'] = None
psql('CREATE STATISTICS su_all (dependencies, ndistinct, mcv) ON country, city FROM stats_users; ANALYZE stats_users;')
o['ext']['all'] = run_all()
o['ext']['dep_values'] = psql("SELECT dependencies::text || ' | ' || n_distinct::text FROM pg_stats_ext WHERE statistics_name = 'su_all'")
print(o['ext'], flush=True)
json.dump(o, open(OUT, 'w'), indent=1)
