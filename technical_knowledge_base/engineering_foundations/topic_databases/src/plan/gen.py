"""Generate the chat product's data in a local PostgreSQL 16 (pgserver wheel): 100k users, 1M chats, 10M messages.
Deterministic (setseed). Writes inputs/gen_log.json (timings, table and index sizes, settings).
Run from a scratch directory (the data directory is several GB):
  QP_DATA=/path/outside/repo uv run --no-project --python 3.12 --with pgserver --with duckdb python <repo>/.../src/plan/gen.py
"""
import os, sys, time, json, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgcommon import *
HERE = os.path.dirname(os.path.abspath(__file__))
N_USERS, N_CHATS, N_MSGS = 100_000, 1_000_000, 10_000_000
log = {'date': datetime.date.today().isoformat(), 'steps': []}
def step(name, sql):
    t = time.time(); psql(sql); dt = round(time.time() - t, 1)
    log['steps'].append({'step': name, 'seconds': dt}); print(name, dt, flush=True)

os.makedirs(ROOT, exist_ok=True)
if not os.path.exists(DATA):
    print(sh(f'{B}/initdb', '-D', DATA, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C').stdout[-200:])
print(start())
psql('DROP DATABASE IF EXISTS chat', db='postgres'); psql('CREATE DATABASE chat', db='postgres')

# Twenty countries, three real cities each; country weights are skewed (the first is the biggest market).
geo = [('US', ['New York', 'Los Angeles', 'Chicago']), ('IN', ['Bengaluru', 'Mumbai', 'Delhi']), ('GB', ['London', 'Manchester', 'Leeds']),
       ('DE', ['Berlin', 'Munich', 'Hamburg']), ('FR', ['Paris', 'Lyon', 'Marseille']), ('BR', ['Sao Paulo', 'Rio de Janeiro', 'Recife']),
       ('CA', ['Toronto', 'Montreal', 'Vancouver']), ('JP', ['Tokyo', 'Osaka', 'Nagoya']), ('ES', ['Madrid', 'Barcelona', 'Valencia']),
       ('IT', ['Rome', 'Milan', 'Turin']), ('NL', ['Amsterdam', 'Rotterdam', 'Utrecht']), ('AU', ['Sydney', 'Melbourne', 'Brisbane']),
       ('KR', ['Seoul', 'Busan', 'Incheon']), ('MX', ['Mexico City', 'Guadalajara', 'Monterrey']), ('PL', ['Warsaw', 'Krakow', 'Gdansk']),
       ('SE', ['Stockholm', 'Gothenburg', 'Malmo']), ('NG', ['Lagos', 'Abuja', 'Ibadan']), ('EG', ['Cairo', 'Alexandria', 'Giza']),
       ('ID', ['Jakarta', 'Surabaya', 'Bandung']), ('PK', ['Karachi', 'Lahore', 'Islamabad'])]
# time zone: a third column fully determined by the city (correlated predicates for case 5)
TZ = {'US': None, 'IN': 'Asia/Kolkata', 'GB': 'Europe/London', 'DE': 'Europe/Berlin', 'FR': 'Europe/Paris', 'BR': 'America/Sao_Paulo',
      'CA': None, 'JP': 'Asia/Tokyo', 'ES': 'Europe/Madrid', 'IT': 'Europe/Rome', 'NL': 'Europe/Amsterdam', 'AU': None, 'KR': 'Asia/Seoul',
      'MX': 'America/Mexico_City', 'PL': 'Europe/Warsaw', 'SE': 'Europe/Stockholm', 'NG': 'Africa/Lagos', 'EG': 'Africa/Cairo',
      'ID': 'Asia/Jakarta', 'PK': 'Asia/Karachi'}
CITY_TZ = {'New York': 'America/New_York', 'Los Angeles': 'America/Los_Angeles', 'Chicago': 'America/Chicago', 'Toronto': 'America/Toronto',
           'Montreal': 'America/Toronto', 'Vancouver': 'America/Vancouver', 'Sydney': 'Australia/Sydney', 'Melbourne': 'Australia/Melbourne',
           'Brisbane': 'Australia/Brisbane', 'Recife': 'America/Recife'}
vals = ','.join(f"({i},'{c}',{j},'{city}','{CITY_TZ.get(city) or TZ[c]}')" for i, (c, cs) in enumerate(geo) for j, city in enumerate(cs))
step('geo', f'CREATE TABLE geo(ci int, country text, k int, city text, tz text); INSERT INTO geo VALUES {vals};')

step('schema', '''
CREATE TABLE users(id bigint PRIMARY KEY, email text NOT NULL, country text NOT NULL, city text NOT NULL, plan text NOT NULL, created_at timestamptz NOT NULL, timezone text NOT NULL);
CREATE TABLE chats(id bigint PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), title text NOT NULL, model text NOT NULL, created_at timestamptz NOT NULL);
CREATE TABLE messages(id bigint PRIMARY KEY, chat_id bigint NOT NULL REFERENCES chats(id), role text NOT NULL, model text NOT NULL,
  tokens int NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL) WITH (autovacuum_enabled = false);
ALTER TABLE users SET (autovacuum_enabled = false); ALTER TABLE chats SET (autovacuum_enabled = false);
''')
# users: country index floor(20 * r^2) (skewed), city one of that country's three, time zone fixed by the city
step('users', f'''SELECT setseed(0.42);
INSERT INTO users SELECT i, 'user' || i || '@example.com', g.country, g.city,
  CASE WHEN r3 < 0.85 THEN 'free' WHEN r3 < 0.99 THEN 'pro' ELSE 'team' END,
  timestamptz '2024-01-01 00:00+00' + (i * interval '5 minutes'), g.tz
FROM (SELECT i, floor(20 * random()^2)::int AS ci, floor(3 * random())::int AS k, random() AS r3 FROM generate_series(1, {N_USERS}) i) s
JOIN geo g ON g.ci = s.ci AND g.k = s.k ORDER BY i;''')
# chats: heavy users are the low ids (user_id = 1 + floor(N * r^1.6)); model fixed per chat
step('chats', f'''SELECT setseed(0.43);
INSERT INTO chats SELECT i, 1 + floor({N_USERS} * random()^1.6)::bigint, 'Chat ' || i,
  (ARRAY['mini','standard','large','reasoning'])[1 + (i % 4)],
  timestamptz '2025-09-01 00:00+00' + (i * interval '30 seconds')
FROM generate_series(1, {N_CHATS}) i;''')
# messages: appended in time order; message i belongs to a chat near i/10 (chats are active at overlapping times),
# so one chat's messages are spread over a window of about 20,000 rows of the table, as in a real append-only log
step('messages', f'''SELECT setseed(0.44);
INSERT INTO messages SELECT i, c, CASE WHEN i % 2 = 1 THEN 'user' ELSE 'assistant' END,
  (ARRAY['mini','standard','large','reasoning'])[1 + (c % 4)],
  CASE WHEN i % 2 = 1 THEN 10 + floor(190 * random())::int ELSE 50 + floor(1450 * random()^2)::int END,
  left(repeat(md5(i::text), 4), 30 + floor(100 * random())::int),
  timestamptz '2025-09-01 00:00+00' + (i * interval '3 seconds')
FROM (SELECT i, least({N_CHATS}, greatest(1, ceil(i / 10.0)::bigint + floor(2000 * random())::bigint - 1000)) AS c
      FROM generate_series(1, {N_MSGS}) i) s;''')
step('base indexes', 'CREATE INDEX chats_user_id ON chats(user_id); CREATE INDEX messages_chat_created ON messages(chat_id, created_at);')
step('analyze', 'ANALYZE;')
sizes = psql('''SELECT json_agg(json_build_object('name', relname, 'kind', relkind, 'rows', reltuples::bigint, 'pages', relpages,
  'bytes', pg_relation_size(oid))) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','i');''')
log['sizes'] = json.loads(sizes)
log['version'] = psql('SELECT version()')
log['settings'] = dict(l.split('|') for l in psql("SELECT name, current_setting(name) FROM pg_settings WHERE name IN ('shared_buffers','work_mem','effective_cache_size','random_page_cost','seq_page_cost','max_parallel_workers_per_gather','jit','default_statistics_target','block_size','effective_io_concurrency','jit_above_cost')").splitlines())
json.dump(log, open(os.path.join(HERE, 'inputs', 'gen_log.json'), 'w'), indent=1)
print(json.dumps(log, indent=1))
