"""The guided SQL lessons: one source for the page (via gen_js.py) and for recompute.py.
Each lesson has params (menus); every combination of options is one variant, run on real PostgreSQL and SQLite
offline and stored, so the page works even where its in-page engine cannot start.
A param option is [value, label]; {name} in the SQL is replaced by the value."""
import itertools

LESSONS = [
 dict(id='select', title='SELECT and WHERE', params=[
   dict(name='plan', label='Plan', options=[['free', "plan = 'free'"], ['pro', "plan = 'pro'"], ['team', "plan = 'team'"]])],
  sql="""SELECT id, name, plan, country
FROM users
WHERE plan = '{plan}'
ORDER BY id;"""),

 dict(id='order', title='ORDER BY and LIMIT', params=[
   dict(name='dir', label='Direction', options=[['DESC', 'DESC (largest first)'], ['ASC', 'ASC (smallest first)']]),
   dict(name='n', label='LIMIT', options=[['5', '5'], ['10', '10']])],
  sql="""SELECT id, chat_id, tokens
FROM messages
WHERE role = 'assistant'
ORDER BY tokens {dir}, id
LIMIT {n};"""),

 dict(id='join', title='JOIN: inner and left', params=[
   dict(name='kind', label='Join', options=[
     ['INNER JOIN chats c ON c.user_id = u.id\nWHERE u.id IN (2, 4, 5, 9)', 'INNER JOIN'],
     ['LEFT JOIN chats c ON c.user_id = u.id\nWHERE u.id IN (2, 4, 5, 9)', 'LEFT JOIN'],
     ['LEFT JOIN chats c ON c.user_id = u.id\nWHERE u.id IN (2, 4, 5, 9) AND c.id IS NULL', 'LEFT JOIN, keep only the unmatched']])],
  sql="""SELECT u.id, u.name, c.id AS chat_id, c.title
FROM users u
{kind}
ORDER BY u.id, c.id;"""),

 dict(id='group', title='GROUP BY and aggregates', params=[
   dict(name='by', label='Group by', options=[['c.model', 'model'], ['u.plan', 'plan']]),
   dict(name='role', label='Messages', options=[['assistant', 'assistant replies'], ['user', 'user prompts']])],
  sql="""SELECT {by} AS grp, COUNT(*) AS messages, SUM(m.tokens) AS tokens,
       ROUND(AVG(m.tokens), 1) AS avg_tokens
FROM messages m
JOIN chats c ON c.id = m.chat_id
JOIN users u ON u.id = c.user_id
WHERE m.role = '{role}'
GROUP BY {by}
ORDER BY tokens DESC;"""),

 dict(id='groupbare', title='GROUP BY: a column that is not grouped', params=[],
  sql="""SELECT c.model, u.name, COUNT(*) AS chats
FROM chats c
JOIN users u ON u.id = c.user_id
GROUP BY c.model
ORDER BY c.model;"""),

 dict(id='cte', title='Subqueries and CTEs', params=[
   dict(name='k', label='Threshold', options=[['1', 'above the average'], ['1.25', 'above 1.25 x the average'], ['1.5', 'above 1.5 x the average']])],
  sql="""WITH per_user AS (
  SELECT c.user_id, SUM(m.tokens) AS tokens
  FROM messages m
  JOIN chats c ON c.id = m.chat_id
  GROUP BY c.user_id
)
SELECT u.id, u.name, p.tokens
FROM per_user p
JOIN users u ON u.id = p.user_id
WHERE p.tokens > (SELECT AVG(tokens) * {k} FROM per_user)
ORDER BY p.tokens DESC, u.id;"""),

 dict(id='window', title='A window function: the latest message per chat', params=[
   dict(name='n', label='Keep', options=[['1', 'latest message (rn = 1)'], ['2', 'latest two (rn <= 2)']])],
  sql="""SELECT chat_id, id AS message_id, role, content, created_at, rn
FROM (
  SELECT m.*,
         ROW_NUMBER() OVER (PARTITION BY chat_id
                            ORDER BY created_at DESC, id DESC) AS rn
  FROM messages m
) latest
WHERE rn <= {n} AND chat_id <= 5
ORDER BY chat_id, rn;"""),

 dict(id='write', title='INSERT, UPDATE, DELETE', params=[],
  sql="""INSERT INTO chats (user_id, title, model, created_at)
VALUES (4, 'My first chat', 'mini', '2026-10-04 09:00:00')
RETURNING id;
UPDATE chats SET title = 'Renamed chat' WHERE id = 201;
SELECT id, user_id, title, model FROM chats WHERE user_id = 4;
DELETE FROM chats WHERE id = 201;
SELECT COUNT(*) AS chats_of_user_4 FROM chats WHERE user_id = 4;"""),

 dict(id='constraints', title='Constraints reject bad data', params=[
   dict(name='bad', label='Bad row', options=[
     ["INSERT INTO users (id, email, name, plan, created_at)\nVALUES (51, 'new@example.com', NULL, 'free', '2026-10-04 09:00:00');\nSELECT COUNT(*) AS users FROM users;", 'NOT NULL: no name'],
     ["INSERT INTO users (id, email, name, plan, created_at)\nVALUES (51, 'femi.okafor@example.com', 'Femi Two', 'free', '2026-10-04 09:00:00');\nSELECT COUNT(*) AS users FROM users;", 'UNIQUE: email taken'],
     ["INSERT INTO users (id, email, name, plan, created_at)\nVALUES (51, 'new@example.com', 'New User', 'gold', '2026-10-04 09:00:00');\nSELECT COUNT(*) AS users FROM users;", "CHECK: plan 'gold'"],
     ["INSERT INTO chats (user_id, title, model, created_at)\nVALUES (999, 'Orphan', 'mini', '2026-10-04 09:00:00');\nSELECT id, user_id, title FROM chats WHERE user_id = 999;", 'FOREIGN KEY: user 999 does not exist'],
     ["PRAGMA foreign_keys = ON;\nINSERT INTO chats (user_id, title, model, created_at)\nVALUES (999, 'Orphan', 'mini', '2026-10-04 09:00:00');\nSELECT id, user_id, title FROM chats WHERE user_id = 999;", 'FOREIGN KEY, SQLite switch on'],
     ["INSERT INTO messages (chat_id, role, content, tokens, created_at)\nVALUES (1, 'user', 'hi', 'lots', '2026-10-04 09:00:00');\nSELECT id, chat_id, content, tokens FROM messages WHERE id > 2000;", 'Wrong type: tokens = \'lots\'']])],
  sql="""{bad}"""),

 dict(id='txn', title='A transaction with ROLLBACK', params=[
   dict(name='amt', label='Amount', options=[['20', '20 credits (user 7 has 30)'], ['50', '50 credits (more than user 7 has)']]),
   dict(name='mode', label='Wrapping', options=[['none', 'no transaction'], ['commit', 'BEGIN ... COMMIT'], ['rollback', 'BEGIN ... ROLLBACK']])],
  sql="""{begin}UPDATE credits SET balance = balance + {amt} WHERE user_id = 12;
UPDATE credits SET balance = balance - {amt} WHERE user_id = 7;
{end}SELECT user_id, balance FROM credits WHERE user_id IN (7, 12) ORDER BY user_id;"""),

 dict(id='nulls', title='NULL pitfalls', params=[
   dict(name='q', label='Pitfall', options=[
     ["SELECT COUNT(*) AS all_rows, COUNT(country) AS with_country\nFROM users;", 'COUNT(*) vs COUNT(column)'],
     ["SELECT COUNT(*) AS eq_null FROM users WHERE country = NULL;\nSELECT COUNT(*) AS is_null FROM users WHERE country IS NULL;", '= NULL vs IS NULL'],
     ["SELECT COUNT(*) AS not_in_list FROM users\nWHERE country NOT IN ('US', 'GB', NULL);", 'NOT IN with a NULL inside'],
     ["SELECT id, name, country FROM users\nORDER BY country, id\nLIMIT 7;", 'Where NULLs sort'],
     ["SELECT id, name, country FROM users\nORDER BY country NULLS LAST, id\nLIMIT 7;", 'NULLS LAST, said explicitly'],
     ["SELECT id, title || ' (' || model || ')' AS label,\n       COALESCE(title, 'Untitled') || ' (' || model || ')' AS fixed\nFROM chats WHERE id IN (9, 10, 11) ORDER BY id;", 'NULL in a string']])],
  sql="""{q}"""),

 dict(id='danger', title='The UPDATE without a WHERE', params=[
   dict(name='stmt', label='Statement', options=[
     ["UPDATE users SET plan = 'team' WHERE id = 3;", 'with WHERE id = 3'],
     ["UPDATE users SET plan = 'team';", 'WHERE forgotten'],
     ["DELETE FROM chats;", 'DELETE FROM chats, WHERE forgotten']]),
   dict(name='mode', label='Safety net', options=[['none', 'none'], ['rollback', 'inside BEGIN ... ROLLBACK']])],
  sql="""{begin}{stmt}
SELECT plan, COUNT(*) AS users FROM users GROUP BY plan ORDER BY plan;
SELECT COUNT(*) AS chats FROM chats;
{end}SELECT plan, COUNT(*) AS users FROM users GROUP BY plan ORDER BY plan;"""),
]

def variants(lesson):
    """Every combination of options: [(key, sql)], key = option indexes joined by '-'."""
    ps = lesson['params']
    out = []
    for combo in itertools.product(*[range(len(p['options'])) for p in ps]):
        vals = {p['name']: p['options'][i][0] for p, i in zip(ps, combo)}
        mode = vals.get('mode')
        vals['begin'] = 'BEGIN;\n' if mode in ('commit', 'rollback') else ''
        vals['end'] = {'commit': 'COMMIT;\n', 'rollback': 'ROLLBACK;\n'}.get(mode, '')
        out.append(('-'.join(map(str, combo)) or '0', lesson['sql'].format(**vals)))
    return out

def split(sql):
    """Split a script into statements on ; outside quotes and -- comments (enough for these lessons)."""
    out, cur, q, i = [], '', None, 0
    while i < len(sql):
        ch = sql[i]
        if q:
            cur += ch
            if ch == q: q = None
        elif ch in "'\"":
            q = ch; cur += ch
        elif sql.startswith('--', i):
            j = sql.find('\n', i); j = len(sql) if j < 0 else j
            cur += sql[i:j]; i = j; continue
        elif ch == ';':
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
        i += 1
    if cur.strip(): out.append(cur.strip())
    return [s for s in out if s and not all(l.strip().startswith('--') or not l.strip() for l in s.split('\n'))]

if __name__ == '__main__':
    n = 0
    for l in LESSONS:
        v = variants(l); n += len(v)
        print(l['id'], len(v))
    print('variants', n)
