"""Deterministic dataset for the SQL playground: the chat product's data (users, chats, messages, credits).
Run: python3 gen_data.py   -> data.json (compact rows) and schema_sqlite.sql / schema_pg.sql
Seeded (random.Random(20261004)), so every run gives the same rows. Plain Python, no dependencies.
Shape: 50 users (a few with no country, a few with no chats), 200 chats (some untitled, a few with no messages),
2,000 messages (user and assistant turns alternate), one credits row per user (balance >= 0)."""
import json, random, datetime, os

R = random.Random(20261004)
HERE = os.path.dirname(os.path.abspath(__file__))

FIRST = ['Ada', 'Ben', 'Chen', 'Dara', 'Eli', 'Femi', 'Gita', 'Hugo', 'Ines', 'Jon', 'Kemi', 'Lena', 'Mo', 'Nina', 'Omar',
         'Priya', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Vik', 'Wen', 'Xavi', 'Yara', 'Zed']
LAST = ['Okafor', 'Smith', 'Li', 'Patel', 'Garcia', 'Muller', 'Kim', 'Rossi', 'Silva', 'Novak', 'Haddad', 'Sato']
COUNTRIES = ['US', 'GB', 'DE', 'IN', 'BR', 'FR', 'JP', 'NG']
MODELS = ['mini', 'standard', 'reasoning']
TITLES = ['Python list question', 'Trip to Lisbon', 'SQL join help', 'Cover letter', 'Explain transformers',
          'Birthday ideas', 'Fix my regex', 'Recipe for dinner', 'Learning Spanish', 'Budget spreadsheet',
          'Docker error', 'Book summary', 'Interview prep', 'Poem for mum', 'Unit test failing']
USER_MSG = ['How do I reverse a list in Python?', 'Can you shorten this paragraph?', 'What is a JOIN?',
            'Plan three days in Lisbon.', 'Why does my query return nothing?', 'Explain attention simply.',
            'Give me five gift ideas.', 'Translate this into Spanish.', 'What does this error mean?',
            'Write a short poem.', 'Make this email more polite.', 'Summarise chapter one.',
            'How do I index this table?', 'Is this regex right?', 'Suggest a dinner with lentils.']
ASSIST_MSG = ['Here is one way to do it.', 'Sure, here is a shorter version.', 'A JOIN combines rows from two tables.',
              'Day one: the old town and the river.', 'Your WHERE clause filters out every row.',
              'Each word looks at every other word.', 'Here are five ideas.', 'Here is the translation.',
              'The error means a file is missing.', 'Here is a short poem.', 'Here is a politer version.',
              'Chapter one introduces the narrator.', 'Add an index on the column you filter by.',
              'Almost: escape the dot.', 'Try a lentil curry.']

def ts(dt): return dt.strftime('%Y-%m-%d %H:%M:%S')

T0 = datetime.datetime(2026, 1, 1, 8, 0, 0)
users = []
names = set()
for uid in range(1, 51):
    while True:
        f, l = R.choice(FIRST), R.choice(LAST)
        if (f, l) not in names: names.add((f, l)); break
    plan = R.choices(['free', 'pro', 'team'], weights=[60, 30, 10])[0]
    country = None if R.random() < 0.12 else R.choice(COUNTRIES)
    created = T0 + datetime.timedelta(minutes=R.randrange(0, 180 * 24 * 60))
    users.append([uid, f'{f.lower()}.{l.lower()}@example.com', f'{f} {l}', plan, country, ts(created)])

# users with no chats: pick 6
no_chat = set(R.sample(range(1, 51), 6))
active = [u for u in users if u[0] not in no_chat]
chats = []
first = active[:]; R.shuffle(first)  # every active user gets at least one chat
for cid in range(1, 201):
    u = first[cid - 1] if cid <= len(first) else R.choice(active)
    ucreated = datetime.datetime.strptime(u[5], '%Y-%m-%d %H:%M:%S')
    created = ucreated + datetime.timedelta(minutes=R.randrange(10, 60 * 24 * 90))
    title = None if R.random() < 0.15 else R.choice(TITLES)
    model = R.choices(MODELS, weights=[50, 35, 15])[0]
    chats.append([cid, u[0], title, model, ts(created)])
# every active user should own at least one chat
owners = {c[1] for c in chats}
assert owners == {u[0] for u in active}, 'rerun with another seed'

# messages: 2000 over 192 chats (8 chats stay empty), at least 2 per non-empty chat
empty = set(R.sample(range(1, 201), 8))
nonempty = [c for c in chats if c[0] not in empty]
counts = {c[0]: 2 for c in nonempty}
left = 2000 - 2 * len(nonempty)
for _ in range(left): counts[R.choice(nonempty)[0]] += 1
msgs = []
mid = 0
# insert in time order across chats so ids grow with time inside each chat
rows = []
for c in nonempty:
    t = datetime.datetime.strptime(c[4], '%Y-%m-%d %H:%M:%S')
    topic = R.randrange(len(USER_MSG))
    for k in range(counts[c[0]]):
        role = 'user' if k % 2 == 0 else 'assistant'
        t = t + datetime.timedelta(seconds=R.randrange(20, 600))
        idx = (topic + k // 2 * (1 if R.random() < 0.5 else 0)) % len(USER_MSG)
        content = USER_MSG[idx] if role == 'user' else ASSIST_MSG[idx]
        tokens = R.randrange(5, 120) if role == 'user' else R.randrange(40, 900)
        rows.append([c[0], role, content, tokens, ts(t)])
rows.sort(key=lambda r: (r[4], r[0]))
for i, r in enumerate(rows, 1): msgs.append([i] + r)

credits = []
for u in users:
    base = {'free': (0, 120), 'pro': (300, 2000), 'team': (1000, 5000)}[u[3]]
    credits.append([u[0], R.randrange(*base)])
# make the transaction lesson's sender low on credits: user 7 gets 30
credits[6][1] = 30

SCHEMA = """CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'team')),
  country    TEXT,
  created_at TIMESTAMP NOT NULL
);
CREATE TABLE chats (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  title      TEXT,
  model      TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
CREATE TABLE messages (
  id         INTEGER PRIMARY KEY,
  chat_id    INTEGER NOT NULL REFERENCES chats(id),
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  tokens     INTEGER NOT NULL CHECK (tokens >= 0),
  created_at TIMESTAMP NOT NULL
);
CREATE TABLE credits (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL CHECK (balance >= 0)
);
"""
# Postgres: same text; ids come from identity columns so an INSERT without an id gets the next number
SCHEMA_PG = SCHEMA.replace('id         INTEGER PRIMARY KEY', 'id         INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY')

out = {'seed': 20261004, 'users': users, 'chats': chats, 'messages': msgs, 'credits': credits,
       'cols': {'users': ['id', 'email', 'name', 'plan', 'country', 'created_at'],
                'chats': ['id', 'user_id', 'title', 'model', 'created_at'],
                'messages': ['id', 'chat_id', 'role', 'content', 'tokens', 'created_at'],
                'credits': ['user_id', 'balance']}}
json.dump(out, open(os.path.join(HERE, 'data.json'), 'w'), separators=(',', ':'))
open(os.path.join(HERE, 'schema_sqlite.sql'), 'w').write(SCHEMA)
open(os.path.join(HERE, 'schema_pg.sql'), 'w').write(SCHEMA_PG)
print('users', len(users), 'chats', len(chats), 'messages', len(msgs), 'credits', len(credits),
      'no-chat users', sorted(no_chat), 'empty chats', sorted(empty), 'null country', sum(u[4] is None for u in users))
