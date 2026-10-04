"""Every runnable example on the Reading tab: one source for the page (gen_js.py) and for the offline runs (pg/run_examples.py).
Each example: sql (SQLite, run live in the page and offline in Python's sqlite3 and the page's own sql.js),
pg (the PostgreSQL text when it differs; run offline on PostgreSQL 16 and the result stored), only='pg' when SQLite cannot run it.
Data: the root page's chat dataset plus messages.parent_id (see pg/pgc.py PARENT_SQL)."""

EX = {}
def ex(id, sql, pg=None, only=None, note=''):
    EX[id] = dict(id=id, sql=sql.strip(), pg=(pg.strip() if pg else None), only=only, note=note)

# ---------- 1. logical order ----------
ex('q_alias', """SELECT id, tokens * 2 AS doubled
FROM messages
WHERE doubled > 1780
ORDER BY id;""")
ex('q_where_having', """-- WHERE filters rows before grouping; HAVING filters groups after
SELECT user_id, COUNT(*) AS chats
FROM chats
WHERE model <> 'mini'
GROUP BY user_id
HAVING COUNT(*) >= 4
ORDER BY chats DESC, user_id;""")

# ---------- 2. joins ----------
ex('j_left_trap', """-- Same LEFT JOIN, the model filter in two places
SELECT COUNT(DISTINCT u.id) AS users_left
FROM users u LEFT JOIN chats c ON c.user_id = u.id
WHERE c.model = 'reasoning';

SELECT COUNT(DISTINCT u.id) AS users_left
FROM users u LEFT JOIN chats c ON c.user_id = u.id AND c.model = 'reasoning';""")
ex('j_full', """WITH markets(code, name) AS (
  VALUES ('US', 'United States'), ('GB', 'United Kingdom'), ('DE', 'Germany'),
         ('IN', 'India'), ('ES', 'Spain'), ('MX', 'Mexico')
)
SELECT k.code, k.name, u.country, COUNT(u.id) AS users
FROM markets k
FULL OUTER JOIN users u ON u.country = k.code
GROUP BY k.code, k.name, u.country
ORDER BY COALESCE(k.code, u.country, 'zz');""")
ex('j_cross', """-- every plan x every model, even the empty combinations
SELECT p.plan, m.model, COUNT(c.id) AS chats
FROM (SELECT DISTINCT plan FROM users) p
CROSS JOIN (SELECT DISTINCT model FROM chats) m
LEFT JOIN users u ON u.plan = p.plan
LEFT JOIN chats c ON c.user_id = u.id AND c.model = m.model
GROUP BY p.plan, m.model
ORDER BY p.plan, m.model;""")
ex('j_self', """-- each reply next to the prompt it answers: messages joined to messages
SELECT a.id AS reply_id, q.content AS prompt, a.content AS reply, a.tokens
FROM messages a
JOIN messages q ON q.id = a.parent_id
WHERE a.role = 'assistant' AND a.chat_id = 11
ORDER BY a.id;""")
ex('j_semi', """-- users with at least one 'reasoning' chat
SELECT COUNT(*) AS rows_from_join
FROM users u JOIN chats c ON c.user_id = u.id
WHERE c.model = 'reasoning';

SELECT COUNT(*) AS users_from_exists
FROM users u
WHERE EXISTS (SELECT 1 FROM chats c WHERE c.user_id = u.id AND c.model = 'reasoning');""")
ex('j_anti', """-- users with no chats, three ways
SELECT COUNT(*) AS not_exists FROM users u
WHERE NOT EXISTS (SELECT 1 FROM chats c WHERE c.user_id = u.id);

SELECT COUNT(*) AS left_join_is_null FROM users u
LEFT JOIN chats c ON c.user_id = u.id
WHERE c.id IS NULL;

SELECT COUNT(*) AS not_in FROM users
WHERE id NOT IN (SELECT user_id FROM chats);""")
ex('j_notin_null', """-- users in a country where no team-plan user lives
SELECT COUNT(*) AS not_in FROM users
WHERE country NOT IN (SELECT country FROM users WHERE plan = 'team');

SELECT COUNT(*) AS not_exists FROM users u
WHERE NOT EXISTS (SELECT 1 FROM users t
                  WHERE t.plan = 'team' AND t.country = u.country);""")
ex('j_fanout', """-- wrong: chats are counted once per message
SELECT u.id, COUNT(c.id) AS chats, SUM(m.tokens) AS tokens
FROM users u
JOIN chats c ON c.user_id = u.id
JOIN messages m ON m.chat_id = c.id
WHERE u.id IN (1, 2, 3)
GROUP BY u.id ORDER BY u.id;

-- right: aggregate each child table on its own, then join
WITH c AS (SELECT user_id, COUNT(*) AS chats FROM chats GROUP BY user_id),
     t AS (SELECT c.user_id, SUM(m.tokens) AS tokens
           FROM messages m JOIN chats c ON c.id = m.chat_id GROUP BY c.user_id)
SELECT u.id, c.chats, t.tokens
FROM users u JOIN c ON c.user_id = u.id JOIN t ON t.user_id = u.id
WHERE u.id IN (1, 2, 3)
ORDER BY u.id;""")

# ---------- 3. aggregation ----------
ex('a_filter', """SELECT c.model,
       COUNT(*)                                           AS messages,
       COUNT(*)       FILTER (WHERE m.role = 'assistant') AS replies,
       SUM(m.tokens)  FILTER (WHERE m.role = 'assistant') AS reply_tokens,
       COUNT(DISTINCT c.user_id)                          AS users
FROM messages m
JOIN chats c ON c.id = m.chat_id
GROUP BY c.model
ORDER BY c.model;""")
ex('a_rollup', None or """SELECT u.plan, c.model, COUNT(*) AS chats
FROM chats c JOIN users u ON u.id = c.user_id
GROUP BY ROLLUP (u.plan, c.model)
ORDER BY u.plan NULLS LAST, c.model NULLS LAST;""", only='pg')

# ---------- 4. windows ----------
ex('w_rank', """SELECT user_id, COUNT(*) AS chats,
       ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, user_id) AS row_number,
       RANK()       OVER (ORDER BY COUNT(*) DESC)          AS rank,
       DENSE_RANK() OVER (ORDER BY COUNT(*) DESC)          AS dense_rank
FROM chats
GROUP BY user_id
ORDER BY chats DESC, user_id
LIMIT 10;""")
ex('w_lag', """-- seconds from each prompt to its reply in chat 11
SELECT id, role, created_at,
       ROUND((julianday(created_at) - julianday(LAG(created_at) OVER w)) * 86400)
         AS seconds_since_previous
FROM messages
WHERE chat_id = 11
WINDOW w AS (ORDER BY id)
ORDER BY id
LIMIT 8;""", pg="""-- seconds from each prompt to its reply in chat 11
SELECT id, role, created_at,
       EXTRACT(EPOCH FROM created_at - LAG(created_at) OVER w)
         AS seconds_since_previous
FROM messages
WHERE chat_id = 11
WINDOW w AS (ORDER BY id)
ORDER BY id
LIMIT 8;""")
ex('w_running', """SELECT id, role, tokens,
       SUM(tokens) OVER (ORDER BY id)                    AS running_total,
       ROUND(AVG(tokens) OVER (ORDER BY id
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS avg_last_3
FROM messages
WHERE chat_id = 11
ORDER BY id;""")
ex('w_last', """SELECT id, content,
       LAST_VALUE(content) OVER (ORDER BY id) AS last_default_frame,
       LAST_VALUE(content) OVER (ORDER BY id
         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_whole_chat
FROM messages
WHERE chat_id = 11
ORDER BY id
LIMIT 4;""")
ex('w_range', """-- user 35's chats: two of them were opened on the same day
SELECT id, date(created_at) AS day,
       COUNT(*) OVER (ORDER BY date(created_at))                   AS range_default,
       COUNT(*) OVER (ORDER BY date(created_at) ROWS UNBOUNDED PRECEDING) AS rows_frame
FROM chats
WHERE user_id = 35
ORDER BY day, id;""", pg="""-- user 35's chats: two of them were opened on the same day
SELECT id, created_at::date AS day,
       COUNT(*) OVER (ORDER BY created_at::date)                   AS range_default,
       COUNT(*) OVER (ORDER BY created_at::date ROWS UNBOUNDED PRECEDING) AS rows_frame
FROM chats
WHERE user_id = 35
ORDER BY day, id;""")
ex('w_topn', """-- each user's two biggest chats by tokens (users 1 to 3)
SELECT user_id, chat_id, tokens, rn
FROM (
  SELECT c.user_id, c.id AS chat_id, SUM(m.tokens) AS tokens,
         ROW_NUMBER() OVER (PARTITION BY c.user_id
                            ORDER BY SUM(m.tokens) DESC, c.id) AS rn
  FROM chats c JOIN messages m ON m.chat_id = c.id
  WHERE c.user_id IN (1, 2, 3)
  GROUP BY c.user_id, c.id
) ranked
WHERE rn <= 2
ORDER BY user_id, rn;""")

# ---------- 5. CTEs and recursion ----------
ex('c_up', """-- walk from the last message of chat 11 back to the first
WITH RECURSIVE up(id, parent_id, role, depth) AS (
  SELECT id, parent_id, role, 0 FROM messages WHERE id = (SELECT MAX(id) FROM messages WHERE chat_id = 11)
  UNION ALL
  SELECT m.id, m.parent_id, m.role, up.depth + 1
  FROM messages m JOIN up ON m.id = up.parent_id
)
SELECT * FROM up ORDER BY depth LIMIT 6;""")
ex('c_tree', """-- an org chart: who reports to whom, and how deep each person sits
WITH RECURSIVE staff(id, name, manager_id) AS (
  VALUES (1, 'Ada (CEO)', NULL), (2, 'Ben', 1), (3, 'Chen', 1),
         (4, 'Dara', 2), (5, 'Eli', 2), (6, 'Femi', 3), (7, 'Gita', 6)
),
tree(id, name, depth, path) AS (
  SELECT id, name, 0, name FROM staff WHERE manager_id IS NULL
  UNION ALL
  SELECT s.id, s.name, t.depth + 1, t.path || ' > ' || s.name
  FROM staff s JOIN tree t ON s.manager_id = t.id
)
SELECT depth, path FROM tree ORDER BY path;""", pg="""-- an org chart: who reports to whom, and how deep each person sits
WITH RECURSIVE staff(id, name, manager_id) AS (
  VALUES (1, 'Ada (CEO)', NULL::int), (2, 'Ben', 1), (3, 'Chen', 1),
         (4, 'Dara', 2), (5, 'Eli', 2), (6, 'Femi', 3), (7, 'Gita', 6)
),
tree(id, name, depth, path) AS (
  SELECT id, name, 0, name FROM staff WHERE manager_id IS NULL
  UNION ALL
  SELECT s.id, s.name, t.depth + 1, t.path || ' > ' || s.name
  FROM staff s JOIN tree t ON s.manager_id = t.id
)
SELECT depth, path FROM tree ORDER BY path COLLATE "C";""")
ex('c_days', """-- messages per day, including the days with none
WITH RECURSIVE days(day) AS (
  SELECT '2026-01-24'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2026-02-02'
)
SELECT d.day, COUNT(m.id) AS messages
FROM days d
LEFT JOIN messages m ON date(m.created_at) = d.day
GROUP BY d.day
ORDER BY d.day;""", pg="""-- messages per day, including the days with none
SELECT d::date AS day, COUNT(m.id) AS messages
FROM generate_series(DATE '2026-01-24', DATE '2026-02-02', INTERVAL '1 day') d
LEFT JOIN messages m ON m.created_at::date = d::date
GROUP BY d
ORDER BY d;""")

# ---------- 6. set operations ----------
ex('s_sets', """-- users by the models they have used
SELECT COUNT(*) AS used_both FROM (
  SELECT user_id FROM chats WHERE model = 'mini'
  INTERSECT
  SELECT user_id FROM chats WHERE model = 'reasoning');

SELECT COUNT(*) AS mini_never_reasoning FROM (
  SELECT user_id FROM chats WHERE model = 'mini'
  EXCEPT
  SELECT user_id FROM chats WHERE model = 'reasoning');

SELECT (SELECT COUNT(*) FROM (SELECT user_id FROM chats UNION     SELECT id FROM users)) AS union_rows,
       (SELECT COUNT(*) FROM (SELECT user_id FROM chats UNION ALL SELECT id FROM users)) AS union_all_rows;""",
   pg="""-- users by the models they have used
SELECT COUNT(*) AS used_both FROM (
  SELECT user_id FROM chats WHERE model = 'mini'
  INTERSECT
  SELECT user_id FROM chats WHERE model = 'reasoning') s;

SELECT COUNT(*) AS mini_never_reasoning FROM (
  SELECT user_id FROM chats WHERE model = 'mini'
  EXCEPT
  SELECT user_id FROM chats WHERE model = 'reasoning') s;

SELECT (SELECT COUNT(*) FROM (SELECT user_id FROM chats UNION     SELECT id FROM users) a) AS union_rows,
       (SELECT COUNT(*) FROM (SELECT user_id FROM chats UNION ALL SELECT id FROM users) b) AS union_all_rows;""")

# ---------- 7. writing ----------
ex('u_upsert', """CREATE TABLE usage_daily (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day     DATE    NOT NULL,
  tokens  INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
-- the same statement, run for two requests on the same day
INSERT INTO usage_daily (user_id, day, tokens) VALUES (4, '2026-10-04', 120)
ON CONFLICT (user_id, day) DO UPDATE SET tokens = usage_daily.tokens + excluded.tokens;
INSERT INTO usage_daily (user_id, day, tokens) VALUES (4, '2026-10-04', 80)
ON CONFLICT (user_id, day) DO UPDATE SET tokens = usage_daily.tokens + excluded.tokens;
SELECT * FROM usage_daily;""")
ex('u_nothing', """CREATE TABLE processed_events (event_id TEXT PRIMARY KEY, seen_at TEXT NOT NULL);
-- a webhook delivered twice: the second insert does nothing and returns no row
INSERT INTO processed_events VALUES ('evt_42', '2026-10-04 09:00:00')
ON CONFLICT (event_id) DO NOTHING RETURNING event_id;
INSERT INTO processed_events VALUES ('evt_42', '2026-10-04 09:00:05')
ON CONFLICT (event_id) DO NOTHING RETURNING event_id;
SELECT COUNT(*) AS stored FROM processed_events;""")
ex('u_merge', """-- top up credits: update users who have a row, insert for one who does not
DELETE FROM credits WHERE user_id = 50;
MERGE INTO credits AS t
USING (VALUES (7, 100), (50, 100)) AS s(user_id, amount)
ON t.user_id = s.user_id
WHEN MATCHED THEN UPDATE SET balance = t.balance + s.amount
WHEN NOT MATCHED THEN INSERT (user_id, balance) VALUES (s.user_id, s.amount);
SELECT user_id, balance FROM credits WHERE user_id IN (7, 50) ORDER BY user_id;""", only='pg')

# ---------- 8. JSON ----------
ex('js_ops', """-- tool calls stored as JSON on assistant messages
ALTER TABLE messages ADD COLUMN meta TEXT;
UPDATE messages SET meta = json_object(
  'model', (SELECT model FROM chats WHERE chats.id = messages.chat_id),
  'tool_calls', CASE WHEN id % 7 = 0
    THEN json_array(json_object('name', 'web_search', 'args', json_object('q', 'lisbon')))
    ELSE json_array() END)
WHERE role = 'assistant';
SELECT id, meta ->> '$.model' AS model, meta -> '$.tool_calls[0].name' AS first_tool
FROM messages WHERE role = 'assistant' AND id % 7 = 0 ORDER BY id LIMIT 3;
SELECT COUNT(*) AS with_web_search FROM messages
WHERE EXISTS (SELECT 1 FROM json_each(meta, '$.tool_calls') t
              WHERE t.value ->> '$.name' = 'web_search');""",
   pg="""-- tool calls stored as jsonb on assistant messages
ALTER TABLE messages ADD COLUMN meta jsonb;
UPDATE messages m SET meta = jsonb_build_object(
  'model', c.model,
  'tool_calls', CASE WHEN m.id % 7 = 0
    THEN jsonb_build_array(jsonb_build_object('name', 'web_search', 'args', jsonb_build_object('q', 'lisbon')))
    ELSE '[]'::jsonb END)
FROM chats c WHERE c.id = m.chat_id AND m.role = 'assistant';
SELECT id, meta ->> 'model' AS model, meta -> 'tool_calls' -> 0 -> 'name' AS first_tool
FROM messages WHERE role = 'assistant' AND id % 7 = 0 ORDER BY id LIMIT 3;
SELECT COUNT(*) AS with_web_search FROM messages
WHERE meta @> '{"tool_calls": [{"name": "web_search"}]}';
CREATE INDEX messages_meta_gin ON messages USING gin (meta jsonb_path_ops);
SET enable_seqscan = off;
EXPLAIN (COSTS OFF) SELECT id FROM messages WHERE meta @> '{"tool_calls": [{"name": "web_search"}]}';""")

# ---------- 9. time ----------
ex('t_tz', """SET TimeZone = 'UTC';
SELECT TIMESTAMP '2026-10-04 09:00' AS naive, TIMESTAMPTZ '2026-10-04 09:00+02' AS aware;
SET TimeZone = 'Asia/Tokyo';
SELECT TIMESTAMP '2026-10-04 09:00' AS naive, TIMESTAMPTZ '2026-10-04 09:00+02' AS aware;""", only='pg')
ex('t_dst', """SET TimeZone = 'America/New_York';
-- clocks in New York jump from 02:00 to 03:00 on 2026-03-08
SELECT TIMESTAMPTZ '2026-03-07 12:00' + INTERVAL '1 day'   AS plus_1_day,
       TIMESTAMPTZ '2026-03-07 12:00' + INTERVAL '24 hours' AS plus_24_hours,
       TIMESTAMPTZ '2026-03-08 02:30'                       AS a_time_that_never_happened;""", only='pg')
ex('t_day', """-- created_at is stored as UTC wall-clock time (timestamp without time zone)
SELECT 'UTC day' AS bucket, COUNT(*) AS messages
FROM messages WHERE created_at::date = DATE '2026-03-15'
UNION ALL
SELECT 'Tokyo day', COUNT(*)
FROM messages
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date = DATE '2026-03-15';""", only='pg')

# ---------- 10. modelling ----------
ex('n_anomaly', """-- one wide table: every message carries its user's name and email
CREATE TABLE chat_log AS
SELECT m.id, m.chat_id, u.id AS user_id, u.name, u.email, u.plan, m.role, m.tokens
FROM messages m JOIN chats c ON c.id = m.chat_id JOIN users u ON u.id = c.user_id;

-- Ines (user 7) changes her name; one code path only updates the chat she is in
UPDATE chat_log SET name = 'Ines Novak-Reyes'
WHERE chat_id = (SELECT MIN(chat_id) FROM chat_log WHERE user_id = 7);

SELECT name, COUNT(*) AS rows FROM chat_log WHERE user_id = 7 GROUP BY name ORDER BY name;""")
ex('m_partial', """ALTER TABLE chats ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
-- at most one pinned chat per user
CREATE UNIQUE INDEX one_pinned_chat ON chats (user_id) WHERE pinned = 1;
UPDATE chats SET pinned = 1 WHERE id = (SELECT MIN(id) FROM chats WHERE user_id = 35);
UPDATE chats SET pinned = 1 WHERE id = (SELECT MAX(id) FROM chats WHERE user_id = 35);
SELECT id, pinned FROM chats WHERE user_id = 35 ORDER BY id;""")
ex('m_soft', """CREATE TABLE accounts (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX accounts_email_live ON accounts (email) WHERE deleted_at IS NULL;
INSERT INTO accounts (id, email) VALUES (1, 'ada@example.com');
UPDATE accounts SET deleted_at = '2026-10-01' WHERE id = 1;    -- soft delete
INSERT INTO accounts (id, email) VALUES (2, 'ada@example.com'); -- she signs up again: allowed
INSERT INTO accounts (id, email) VALUES (3, 'ada@example.com'); -- a second live copy: refused
SELECT id, email, deleted_at FROM accounts ORDER BY id;""")
ex('m_fk', """PRAGMA foreign_keys = ON;   -- SQLite only; Postgres always enforces
CREATE TABLE folders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL);
CREATE TABLE folder_chats (
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  chat_id   INTEGER NOT NULL REFERENCES chats(id)   ON DELETE RESTRICT,
  PRIMARY KEY (folder_id, chat_id)
);
INSERT INTO folders VALUES (1, 35, 'Work');
INSERT INTO folder_chats SELECT 1, id FROM chats WHERE user_id = 35;
DELETE FROM chats WHERE id = (SELECT MIN(chat_id) FROM folder_chats);  -- refused: RESTRICT
DELETE FROM folders WHERE id = 1;                                     -- allowed: CASCADE
SELECT COUNT(*) AS links_left FROM folder_chats;""",
   pg="""-- Postgres always enforces foreign keys
CREATE TABLE folders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL);
CREATE TABLE folder_chats (
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  chat_id   INTEGER NOT NULL REFERENCES chats(id)   ON DELETE RESTRICT,
  PRIMARY KEY (folder_id, chat_id)
);
INSERT INTO folders VALUES (1, 35, 'Work');
INSERT INTO folder_chats SELECT 1, id FROM chats WHERE user_id = 35;
DELETE FROM chats WHERE id = (SELECT MIN(chat_id) FROM folder_chats);  -- refused: RESTRICT
DELETE FROM folders WHERE id = 1;                                     -- allowed: CASCADE
SELECT COUNT(*) AS links_left FROM folder_chats;""")
ex('m_trigger', """ALTER TABLE chats ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;
UPDATE chats SET message_count = (SELECT COUNT(*) FROM messages WHERE chat_id = chats.id);
CREATE TRIGGER messages_count AFTER INSERT ON messages
BEGIN
  UPDATE chats SET message_count = message_count + 1 WHERE id = NEW.chat_id;
END;
INSERT INTO messages (chat_id, role, content, tokens, created_at)
VALUES (11, 'user', 'One more question.', 12, '2026-10-04 09:00:00');
SELECT id, message_count, (SELECT COUNT(*) FROM messages WHERE chat_id = 11) AS counted
FROM chats WHERE id = 11;""",
   pg="""ALTER TABLE chats ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;
UPDATE chats SET message_count = (SELECT COUNT(*) FROM messages WHERE chat_id = chats.id);
CREATE FUNCTION bump_message_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chats SET message_count = message_count + 1 WHERE id = NEW.chat_id;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_count AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION bump_message_count();
INSERT INTO messages (chat_id, role, content, tokens, created_at)
VALUES (11, 'user', 'One more question.', 12, '2026-10-04 09:00:00');
SELECT id, message_count, (SELECT COUNT(*) FROM messages WHERE chat_id = 11) AS counted
FROM chats WHERE id = 11;""")
ex('m_enum', """CREATE TYPE plan_t AS ENUM ('free', 'pro', 'team');
SELECT 'pro'::plan_t < 'team'::plan_t AS pro_sorts_before_team;
ALTER TYPE plan_t ADD VALUE 'enterprise' AFTER 'team';
SELECT enum_range(NULL::plan_t) AS values_now;
ALTER TYPE plan_t DROP VALUE 'pro';""", only='pg')
ex('m_lookup', """CREATE TABLE plans (
  code          TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  monthly_price INTEGER NOT NULL,
  sort_order    INTEGER NOT NULL
);
INSERT INTO plans VALUES ('free', 'Free', 0, 1), ('pro', 'Pro', 20, 2), ('team', 'Team', 30, 3);
-- adding a plan is an INSERT, retiring one can be a column, and the plan now carries data
INSERT INTO plans VALUES ('enterprise', 'Enterprise', 60, 4);
SELECT p.label, p.monthly_price, COUNT(u.id) AS users
FROM plans p LEFT JOIN users u ON u.plan = p.code
GROUP BY p.code, p.label, p.monthly_price, p.sort_order
ORDER BY p.sort_order;""")
ex('m_quote', """CREATE TABLE "ChatTags" ("TagName" text);
SELECT TagName FROM ChatTags;
SELECT "TagName" FROM "ChatTags";""", only='pg')
ex('m_rls', """-- one shared table, rows tagged with their tenant (an organisation)
CREATE TABLE notes (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id integer NOT NULL,
  body      text NOT NULL
);
INSERT INTO notes (tenant_id, body) VALUES (1, 'Acme roadmap'), (1, 'Acme budget'), (2, 'Globex launch plan');
CREATE ROLE app_user LOGIN;
GRANT SELECT, INSERT ON notes TO app_user;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notes
  USING (tenant_id = current_setting('app.tenant_id')::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::integer);
-- the owner (here the superuser) bypasses the policy
SELECT COUNT(*) AS rows_seen_by_owner FROM notes;
-- the application's role, after the request sets its tenant
SET ROLE app_user;
SET app.tenant_id = '2';
SELECT tenant_id, body FROM notes;
INSERT INTO notes (tenant_id, body) VALUES (1, 'sneaky write into Acme');
RESET ROLE;""", only='pg')
