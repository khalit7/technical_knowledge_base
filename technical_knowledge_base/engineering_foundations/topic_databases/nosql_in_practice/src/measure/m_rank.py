"""The leaderboard in PostgreSQL 16.2: the same 100,000 scores as m_redis.py (random.seed(7)), top 10 and one user's rank.
A rank in SQL is a count of everyone above you: the index answers it, but it still visits one entry per higher-ranked player.
About 1 minute. Writes inputs/rank.json.
"""
import os, sys, json, random, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pgserver
res = machine()
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin'); root = os.path.join(S, 'rank_pg'); D = root + '/data'
port = free_port(56640); res['pg_port'] = port
def psql(sql, db='postgres'):
    r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', str(port), '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', '-c', sql, db)
    if r.returncode: raise RuntimeError(r.stderr + sql[:300])
    return r.stdout.strip()
shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
sh(f'{B}/initdb', '-D', D, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
sh(f'{B}/pg_ctl', '-D', D, '-o', f"-p {port} -k '' -h 127.0.0.1", '-l', root + '/log', '-w', 'start')
try:
    random.seed(7)
    with open(root + '/s.csv', 'w') as f: f.writelines(f'{i},{random.randint(0, 1_000_000)}\n' for i in range(100_000))
    psql(f"CREATE TABLE scores(user_id int PRIMARY KEY, score int NOT NULL); COPY scores FROM '{root}/s.csv' WITH (FORMAT csv); CREATE INDEX scores_score ON scores(score DESC, user_id)"); psql('VACUUM ANALYZE scores')
    def ex(sql):
        for _ in range(3): psql('EXPLAIN ANALYZE ' + sql)
        xs = [json.loads(psql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql))[0] for _ in range(15)]
        p = xs[-1]['Plan']; return {'ms': round(pct([x['Execution Time'] for x in xs], .5), 3), 'buffers': p.get('Shared Hit Blocks', 0) + p.get('Shared Read Blocks', 0)}
    res['top10'] = ex('SELECT user_id, score FROM scores ORDER BY score DESC, user_id LIMIT 10')
    out = []
    for u, label in ((85068, 'near the top'), (4242, None)):
        q = f'SELECT count(*) FROM scores WHERE score > (SELECT score FROM scores WHERE user_id = {u})'
        rank = int(psql(q)); e = ex(q); e.update({'user': u, 'rank': rank}); out.append(e)
    # a user ranked in the middle
    mid = int(psql('SELECT user_id FROM scores ORDER BY score DESC OFFSET 50000 LIMIT 1'))
    q = f'SELECT count(*) FROM scores WHERE score > (SELECT score FROM scores WHERE user_id = {mid})'
    e = ex(q); e.update({'user': mid, 'rank': int(psql(q))}); out.append(e)
    res['rank'] = out; res['sql'] = q.replace(str(mid), '$1')
    print(res, flush=True); save('rank.json', res)
finally:
    sh(f'{B}/pg_ctl', '-D', D, '-m', 'fast', '-w', 'stop')
