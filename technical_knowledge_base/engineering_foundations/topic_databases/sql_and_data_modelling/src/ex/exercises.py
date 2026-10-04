"""The Exercises lab: graded exercises on the chat data (the root page's dataset plus messages.parent_id), run in the
page's SQLite. The page grades a reader's query by running it and the reference solution on fresh copies of the data and
comparing the last result set: same number of columns, same rows (in order when 'ordered' is set, as a multiset otherwise),
numbers equal to 6 decimal places. Column names are not compared.
check.py runs every solution in Python's sqlite3 and stores the expected results (fallback and audit)."""

X = []
def x(id, level, topic, title, prompt, hint, sol, ordered=False):
    X.append(dict(id=id, level=level, topic=topic, title=title, prompt=prompt, hint=hint, sol=sol.strip(), ordered=ordered))

# level 1: warm-up
x('pro_de', 1, 'SELECT, WHERE', 'Pro users in Germany',
  "List the id and name of every user on the 'pro' plan whose country is 'DE', by id.",
  "Two conditions joined with AND.",
  "SELECT id, name FROM users WHERE plan = 'pro' AND country = 'DE' ORDER BY id;", True)
x('no_country', 1, 'NULL', 'Users with no country',
  "How many users have no country recorded? Return one number.",
  "country = NULL is never true; use IS NULL.",
  "SELECT COUNT(*) FROM users WHERE country IS NULL;")
x('longest', 1, 'ORDER BY, LIMIT', 'The five longest replies',
  "Return the id and tokens of the five assistant messages with the most tokens, longest first; break ties by the smaller id.",
  "ORDER BY tokens DESC, id, then LIMIT 5.",
  "SELECT id, tokens FROM messages WHERE role = 'assistant' ORDER BY tokens DESC, id LIMIT 5;", True)
x('per_model', 1, 'GROUP BY', 'Chats per model',
  "For each model, how many chats use it? Return model and count.",
  "GROUP BY model with COUNT(*).",
  "SELECT model, COUNT(*) FROM chats GROUP BY model;")
x('owners', 1, 'JOIN', 'Who owns chats 1 to 5',
  "For chats 1 to 5, return the chat id, its title (NULL if untitled) and the owner's name, by chat id.",
  "Join chats to users on chats.user_id = users.id.",
  "SELECT c.id, c.title, u.name FROM chats c JOIN users u ON u.id = c.user_id WHERE c.id BETWEEN 1 AND 5 ORDER BY c.id;", True)
# level 2: core
x('chats_incl_zero', 2, 'LEFT JOIN', 'Chats per user, zeros included',
  "Return every user's id and number of chats, including users with none (0), by user id.",
  "A LEFT JOIN keeps users with no chats; COUNT(c.id) counts only matched rows, while COUNT(*) would count the NULL row as 1.",
  "SELECT u.id, COUNT(c.id) FROM users u LEFT JOIN chats c ON c.user_id = u.id GROUP BY u.id ORDER BY u.id;", True)
x('never_chatted', 2, 'Anti join', 'Users who never opened a chat',
  "Return the id and name of every user who has no chats.",
  "NOT EXISTS (SELECT 1 FROM chats c WHERE c.user_id = u.id).",
  "SELECT id, name FROM users u WHERE NOT EXISTS (SELECT 1 FROM chats c WHERE c.user_id = u.id);")
x('heavy_users', 2, 'HAVING', 'Users with at least six chats',
  "Return user_id and number of chats for users with six or more chats.",
  "Filter groups with HAVING COUNT(*) >= 6; WHERE cannot see the count.",
  "SELECT user_id, COUNT(*) FROM chats GROUP BY user_id HAVING COUNT(*) >= 6;")
x('empty_chats', 2, 'Anti join', 'Chats with no messages',
  "Return the id of every chat that has no messages.",
  "LEFT JOIN messages and keep rows where the message id IS NULL, or use NOT EXISTS.",
  "SELECT c.id FROM chats c WHERE NOT EXISTS (SELECT 1 FROM messages m WHERE m.chat_id = c.id);")
x('plan_nulls', 2, 'Conditional aggregation', 'Missing countries by plan',
  "For each plan, return the plan, its number of users, and how many of them have no country.",
  "COUNT(*) FILTER (WHERE country IS NULL), or SUM(CASE WHEN country IS NULL THEN 1 ELSE 0 END), or COUNT(*) - COUNT(country).",
  "SELECT plan, COUNT(*), COUNT(*) FILTER (WHERE country IS NULL) FROM users GROUP BY plan;")
x('fanout', 2, 'Join fan-out', 'Chats and tokens, counted right',
  "For users 1 to 5, return user id, number of chats, and total tokens across all their messages. Careful: joining chats and messages in one go repeats each chat once per message.",
  "Aggregate chats and messages separately (two CTEs or subqueries), then join, or use COUNT(DISTINCT c.id).",
  """SELECT u.id, (SELECT COUNT(*) FROM chats c WHERE c.user_id = u.id),
       (SELECT SUM(m.tokens) FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.user_id = u.id)
FROM users u WHERE u.id BETWEEN 1 AND 5;""")
x('march_active', 2, 'COUNT DISTINCT', 'Active in March',
  "How many distinct users sent at least one message in March 2026? (created_at is text like '2026-03-15 10:00:00'.)",
  "Join messages to chats for the user; COUNT(DISTINCT c.user_id); filter created_at >= '2026-03-01' AND < '2026-04-01'.",
  "SELECT COUNT(DISTINCT c.user_id) FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.created_at >= '2026-03-01' AND m.created_at < '2026-04-01';")
x('above_role_avg', 2, 'Correlated subquery', 'Above the average for their role',
  "For each role, how many messages have more tokens than the average for that role? Return role and count.",
  "Compare tokens with (SELECT AVG(tokens) FROM messages m2 WHERE m2.role = m.role), or join a per-role average.",
  "SELECT role, COUNT(*) FROM messages m WHERE tokens > (SELECT AVG(tokens) FROM messages m2 WHERE m2.role = m.role) GROUP BY role;")
x('share_by_model', 2, 'Window over a group', 'Share of tokens by model',
  "Return each model and its share of all message tokens as a percentage rounded to 1 decimal.",
  "SUM(tokens) per model divided by SUM(SUM(tokens)) OVER (), times 100.0.",
  "SELECT c.model, ROUND(100.0 * SUM(m.tokens) / SUM(SUM(m.tokens)) OVER (), 1) FROM messages m JOIN chats c ON c.id = m.chat_id GROUP BY c.model;")
# level 3: harder
x('top3_tokens', 3, 'DENSE_RANK', 'Top users by tokens',
  "Rank users by total message tokens (highest first) with DENSE_RANK and return user_id, tokens and rank for ranks 1 to 3, best first.",
  "Aggregate per user in a subquery, rank in the outer query, filter on the rank in a further outer query (a window result cannot be used in WHERE of the same SELECT).",
  """SELECT user_id, tokens, rk FROM (
  SELECT c.user_id, SUM(m.tokens) AS tokens, DENSE_RANK() OVER (ORDER BY SUM(m.tokens) DESC) AS rk
  FROM messages m JOIN chats c ON c.id = m.chat_id GROUP BY c.user_id) t
WHERE rk <= 3 ORDER BY rk, user_id;""", True)
x('gaps', 3, 'LAG', 'Gaps in a conversation',
  "For chat 8, return each message id and the seconds since the previous message in that chat (NULL for the first), in id order.",
  "LAG(created_at) OVER (ORDER BY id); SQLite has no interval type, so convert with julianday() or strftime('%s', ...).",
  "SELECT id, CAST(strftime('%s', created_at) AS INTEGER) - CAST(strftime('%s', LAG(created_at) OVER (ORDER BY id)) AS INTEGER) FROM messages WHERE chat_id = 8 ORDER BY id;", True)
x('running_user', 3, 'Running total', "A user's running total",
  "For user 38, return each chat id, that chat's total tokens, and the running total of tokens over the user's chats in the order they were created (ties by id).",
  "Aggregate per chat first, then SUM(...) OVER (ORDER BY created_at, id).",
  """SELECT id, tokens, SUM(tokens) OVER (ORDER BY created_at, id) FROM (
  SELECT c.id, c.created_at, SUM(m.tokens) AS tokens FROM chats c JOIN messages m ON m.chat_id = c.id
  WHERE c.user_id = 38 GROUP BY c.id, c.created_at) t ORDER BY created_at, id;""", True)
x('best_per_model', 3, 'Top N per group', 'The busiest chat of each model',
  "For each model, return the model, the chat with the most messages, and its message count (on a tie, the smaller chat id).",
  "ROW_NUMBER() OVER (PARTITION BY model ORDER BY count DESC, id) and keep rn = 1.",
  """SELECT model, id, n FROM (
  SELECT c.model, c.id, COUNT(*) AS n, ROW_NUMBER() OVER (PARTITION BY c.model ORDER BY COUNT(*) DESC, c.id) AS rn
  FROM chats c JOIN messages m ON m.chat_id = c.id GROUP BY c.model, c.id) t WHERE rn = 1;""")
x('first_chat', 3, 'Top N per group', 'Everyone\'s first chat',
  "For users 1 to 10 who have chats, return user_id and the id of their earliest chat by created_at (ties by id).",
  "ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) = 1.",
  """SELECT user_id, id FROM (
  SELECT user_id, id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) AS rn FROM chats WHERE user_id <= 10) t
WHERE rn = 1;""")
x('depth', 3, 'Recursive CTE', 'How deep is the thread?',
  "Using messages.parent_id, how many ancestors does the last message of chat 163 have? Return one number.",
  "WITH RECURSIVE up(...) starting from that message, joining m.id = up.parent_id; count the rows minus one, or carry a depth column.",
  """WITH RECURSIVE up(id, parent_id, d) AS (
  SELECT id, parent_id, 0 FROM messages WHERE id = (SELECT MAX(id) FROM messages WHERE chat_id = 163)
  UNION ALL SELECT m.id, m.parent_id, up.d + 1 FROM messages m JOIN up ON m.id = up.parent_id)
SELECT MAX(d) FROM up;""")
x('months', 3, 'Calendar CTE', 'Chats per month, empty months too',
  "Return every month from 2026-01 to 2026-09 as 'YYYY-MM' with the number of chats created in it (0 when none), in order.",
  "Generate the months with a recursive CTE (date(m, '+1 month')), then LEFT JOIN chats on strftime('%Y-%m', created_at).",
  """WITH RECURSIVE mo(d) AS (SELECT '2026-01-01' UNION ALL SELECT date(d, '+1 month') FROM mo WHERE d < '2026-09-01')
SELECT strftime('%Y-%m', mo.d), COUNT(c.id) FROM mo LEFT JOIN chats c ON strftime('%Y-%m', c.created_at) = strftime('%Y-%m', mo.d)
GROUP BY mo.d ORDER BY mo.d;""", True)
x('both_plans', 3, 'INTERSECT', 'Countries with free and team users',
  "Return the countries (not NULL) that have at least one 'free' user and at least one 'team' user.",
  "SELECT country ... WHERE plan = 'free' INTERSECT SELECT country ... WHERE plan = 'team'; INTERSECT treats NULLs as equal, so filter them out.",
  "SELECT country FROM users WHERE plan = 'free' AND country IS NOT NULL INTERSECT SELECT country FROM users WHERE plan = 'team';")
x('verbose_replies', 3, 'Self join', 'Replies ten times longer than the question',
  "How many assistant messages have more than 10 times the tokens of the message they reply to (their parent)?",
  "Join messages a to messages q ON q.id = a.parent_id.",
  "SELECT COUNT(*) FROM messages a JOIN messages q ON q.id = a.parent_id WHERE a.role = 'assistant' AND a.tokens > 10 * q.tokens;")
x('histogram', 3, 'CASE and buckets', 'A histogram of reply lengths',
  "Bucket assistant messages by tokens into bins of 200 (0-199 is bin 0, 200-399 is 200, ...). Return bin start and count, by bin.",
  "(tokens / 200) * 200 is integer division in SQLite when both sides are integers.",
  "SELECT (tokens / 200) * 200 AS bin, COUNT(*) FROM messages WHERE role = 'assistant' GROUP BY bin ORDER BY bin;", True)
# level 4: pro
x('impossible', 4, 'Data quality', 'Find the impossible rows',
  "Data checks are queries that should return nothing. Count the chats created before their owner signed up, plus the messages created before their chat was created. Return the two counts as one row.",
  "Two scalar subqueries in one SELECT, each joining the child to its parent and comparing created_at.",
  """SELECT (SELECT COUNT(*) FROM chats c JOIN users u ON u.id = c.user_id WHERE c.created_at < u.created_at),
       (SELECT COUNT(*) FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.created_at < c.created_at);""")
x('upsert_month', 4, 'Upsert', 'A monthly usage table, by upsert',
  "Create usage(user_id, month, tokens) with primary key (user_id, month). Insert one row per message of user 38 using INSERT ... ON CONFLICT ... DO UPDATE to add tokens, then return the table by month.",
  "INSERT INTO usage SELECT c.user_id, strftime('%Y-%m', m.created_at), m.tokens FROM ... WHERE true ON CONFLICT (user_id, month) DO UPDATE SET tokens = usage.tokens + excluded.tokens. In SQLite, an INSERT ... SELECT with ON CONFLICT needs a WHERE clause in the SELECT to parse.",
  """CREATE TABLE usage (user_id INTEGER, month TEXT, tokens INTEGER, PRIMARY KEY (user_id, month));
INSERT INTO usage SELECT c.user_id, strftime('%Y-%m', m.created_at), m.tokens FROM messages m JOIN chats c ON c.id = m.chat_id
WHERE c.user_id = 38 ON CONFLICT (user_id, month) DO UPDATE SET tokens = usage.tokens + excluded.tokens;
SELECT user_id, month, tokens FROM usage ORDER BY month;""", True)
x('median', 4, 'Percentiles by hand', 'The median reply',
  "SQLite has no MEDIAN. Return the median tokens of assistant messages (the average of the two middle values if the count is even).",
  "Number the rows with ROW_NUMBER() OVER (ORDER BY tokens) and COUNT(*) OVER (); keep the row(s) whose number is (n+1)/2 or (n+2)/2 with integer division, and average them.",
  """SELECT AVG(tokens) FROM (
  SELECT tokens, ROW_NUMBER() OVER (ORDER BY tokens) AS rn, COUNT(*) OVER () AS n FROM messages WHERE role = 'assistant') t
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);""")
x('sessions', 4, 'Gaps and islands', 'Sessions in a long chat',
  "In chat 163, a gap of more than 5 minutes (300 seconds) since the previous message starts a new session (the first message starts session 1). How many sessions are there, and how many messages are in the longest one? Return both as one row.",
  "LAG to get the gap, a 0/1 flag for 'starts a session', a running SUM of the flag as the session number, then GROUP BY session.",
  """WITH g AS (
  SELECT id, CAST(strftime('%s', created_at) AS INTEGER) - CAST(strftime('%s', LAG(created_at) OVER (ORDER BY id)) AS INTEGER) AS gap
  FROM messages WHERE chat_id = 163),
s AS (SELECT id, SUM(CASE WHEN gap IS NULL OR gap > 300 THEN 1 ELSE 0 END) OVER (ORDER BY id) AS session FROM g),
n AS (SELECT session, COUNT(*) AS k FROM s GROUP BY session)
SELECT COUNT(*), MAX(k) FROM n;""")
