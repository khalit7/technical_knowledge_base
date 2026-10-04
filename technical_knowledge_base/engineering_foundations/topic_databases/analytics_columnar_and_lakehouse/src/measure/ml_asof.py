"""Point-in-time correctness, run for real in DuckDB on the chat data: one training example per chat, stamped with the chat's
first message time; the feature is the user's plan. The plan history is ILLUSTRATIVE
(generated here: 20% of users upgraded from free to pro on a random day; the chat data has no history), the rest is the
measured chat data. Compares the naive join (today's plan) with an ASOF JOIN (the plan in force at the chat's start).
Writes inputs/ml_asof.json. Seconds.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with duckdb==1.5.6 python ml_asof.py
"""
import os, json, datetime, duckdb
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
con = duckdb.connect(); con.execute(f"ATTACH '{DDB}' AS chat (READ_ONLY)")
con.execute("SELECT setseed(0.5)")
con.execute("""CREATE TABLE plan_history AS
  SELECT id AS user_id, 'free' AS plan, TIMESTAMP '2024-01-01' AS valid_from FROM chat.users
  UNION ALL
  SELECT id, 'pro', TIMESTAMP '2025-09-01' + to_days(CAST(floor(random() * 340) AS INTEGER)) FROM chat.users WHERE hash(id) % 5 = 0""")
con.execute("""CREATE TABLE examples AS SELECT c.id AS chat_id, c.user_id, min(m.created_at) AS ts FROM chat.chats c JOIN chat.messages m ON m.chat_id = c.id GROUP BY 1, 2""")
naive = """SELECT e.chat_id, e.ts, p.plan FROM examples e JOIN (SELECT user_id, arg_max(plan, valid_from) AS plan FROM plan_history GROUP BY 1) p USING (user_id)"""
asof = """SELECT e.chat_id, e.ts, p.plan FROM examples e ASOF JOIN plan_history p ON e.user_id = p.user_id AND e.ts >= p.valid_from"""
res = {'duckdb': duckdb.__version__, 'date': datetime.date.today().isoformat(), 'naive_sql': naive, 'asof_sql': asof}
res['examples'] = con.execute('SELECT count(*) FROM examples').fetchone()[0]
res['users_upgraded'] = con.execute("SELECT count(*) FROM plan_history WHERE plan = 'pro'").fetchone()[0]
res['naive_pro'] = con.execute(f"SELECT count(*) FROM ({naive}) WHERE plan = 'pro'").fetchone()[0]
res['asof_pro'] = con.execute(f"SELECT count(*) FROM ({asof}) WHERE plan = 'pro'").fetchone()[0]
res['leaked'] = con.execute(f"SELECT count(*) FROM ({naive}) n JOIN ({asof}) a USING (chat_id) WHERE n.plan <> a.plan").fetchone()[0]
res['sample'] = [list(map(str, r)) for r in con.execute(f"""SELECT n.chat_id, n.ts, n.plan AS naive_plan, a.plan AS asof_plan,
   (SELECT max(valid_from) FROM plan_history h WHERE h.user_id = e.user_id) AS upgraded_at
   FROM ({naive}) n JOIN ({asof}) a USING (chat_id) JOIN examples e USING (chat_id) WHERE n.plan <> a.plan ORDER BY n.chat_id LIMIT 3""").fetchall()]
json.dump(res, open(os.path.join(OUT, 'ml_asof.json'), 'w'), indent=1); print(json.dumps(res, indent=1))
