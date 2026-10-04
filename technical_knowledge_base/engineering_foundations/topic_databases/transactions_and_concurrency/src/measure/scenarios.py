"""The anomaly scenarios, on the chat product's tables, written once for Postgres and MySQL.
Sessions are called A, B (and C). Each scenario: the tables it needs, the interleaving, what it reads at the end,
and a checker that decides from the recorded results whether the anomaly actually happened.
Users 7 and 12 are the SQL playground's (30 and 20 credits); user 7 has used 2 of a daily quota of 3 messages."""

RESET = [
    'DROP TABLE IF EXISTS credits', 'DROP TABLE IF EXISTS messages', 'DROP TABLE IF EXISTS oncall',
    'DROP TABLE IF EXISTS billing', 'DROP TABLE IF EXISTS purchases', 'DROP TABLE IF EXISTS users',
    'CREATE TABLE users (id int PRIMARY KEY, name varchar(20) NOT NULL, daily_quota int NOT NULL)',
    "INSERT INTO users VALUES (7, 'Ava', 3), (12, 'Ben', 3)",
    'CREATE TABLE credits (user_id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0), version int NOT NULL DEFAULT 1)',
    'INSERT INTO credits (user_id, balance) VALUES (7, 30), (12, 20)',
    'CREATE TABLE messages (id int PRIMARY KEY, user_id int NOT NULL, day int NOT NULL)',
    'CREATE INDEX messages_user_day ON messages (user_id, day)',
    'INSERT INTO messages VALUES (1, 7, 20261004), (2, 7, 20261004), (3, 12, 20261004)',
    'CREATE TABLE oncall (engineer varchar(10) PRIMARY KEY, on_call boolean NOT NULL)',
    "INSERT INTO oncall VALUES ('ana', true), ('raj', true)",
    'CREATE TABLE billing (id int PRIMARY KEY, open_batch int NOT NULL)', 'INSERT INTO billing VALUES (1, 1)',
    'CREATE TABLE purchases (id int PRIMARY KEY, batch int NOT NULL, credits int NOT NULL)',
    'INSERT INTO purchases VALUES (1, 1, 100)',
]
BAL = 'SELECT balance FROM credits WHERE user_id = 7'

def v(named, key, default=None):
    """first value of a recorded read"""
    r = named.get(key)
    try: return r['rows'][0][0]
    except Exception: return default

def ok(named, key):
    r = named.get(key); return bool(r) and not r.get('error')

def err(named, key):
    r = named.get(key); return r.get('code') if r and r.get('error') else None

S = {}

# 1. Dirty read: B reads a debit that A later rolls back
S['dirty'] = dict(
    title='Dirty read', names=['A', 'B'],
    story='Tab A debits all 30 of user 7\'s credits for a long reply, then the model call fails and A rolls back. Meanwhile a billing check in B reads the balance.',
    steps=lambda L: [
        dict(s='A', begin=L), dict(s='A', sql='UPDATE credits SET balance = 0 WHERE user_id = 7', note='debit, not committed'),
        dict(s='B', begin=L), dict(s='B', sql=BAL, key='b_read', note='B reads while A is undecided'),
        dict(s='A', sql='ROLLBACK', note='the model call failed'), dict(s='B', sql='COMMIT')],
    final={'balance': BAL},
    check=lambda n, f: (v(n, 'b_read') == 0, 'B read %s; the committed balance was always 30' % v(n, 'b_read')))

# 2. Non-repeatable read: B reads the same row twice and gets two values
S['nonrepeatable'] = dict(
    title='Non-repeatable read', names=['A', 'B'],
    story='B builds an invoice: it reads user 7\'s balance at the top and again at the bottom. In between, A spends 10 credits and commits.',
    steps=lambda L: [
        dict(s='B', begin=L), dict(s='B', sql=BAL, key='b1', note='first read'),
        dict(s='A', begin=L), dict(s='A', sql='UPDATE credits SET balance = balance - 10 WHERE user_id = 7'),
        dict(s='A', sql='COMMIT'), dict(s='B', sql=BAL, key='b2', note='second read, same row'), dict(s='B', sql='COMMIT')],
    final={'balance': BAL},
    check=lambda n, f: (v(n, 'b1') != v(n, 'b2'), 'B read %s, then %s' % (v(n, 'b1'), v(n, 'b2'))))

# 3. Phantom: a count over a condition changes because a row was inserted
S['phantom'] = dict(
    title='Phantom', names=['A', 'B'],
    story='B counts user 7\'s messages today twice. In between, A saves a new message and commits.',
    steps=lambda L: [
        dict(s='B', begin=L), dict(s='B', sql='SELECT count(*) FROM messages WHERE user_id = 7 AND day = 20261004', key='b1'),
        dict(s='A', begin=L), dict(s='A', sql='INSERT INTO messages VALUES (10, 7, 20261004)'),
        dict(s='A', sql='COMMIT'), dict(s='B', sql='SELECT count(*) FROM messages WHERE user_id = 7 AND day = 20261004', key='b2'),
        dict(s='B', sql='COMMIT')],
    final={'count': 'SELECT count(*) FROM messages WHERE user_id = 7 AND day = 20261004'},
    check=lambda n, f: (v(n, 'b1') != v(n, 'b2'), 'B counted %s, then %s' % (v(n, 'b1'), v(n, 'b2'))))

# 4. Lost update: read, compute in the app, write back
def lost_steps(L, fix=None):
    sel = BAL + (' FOR UPDATE' if fix == 'for_update' else '')
    if fix == 'atomic':
        ua = 'UPDATE credits SET balance = balance - 10 WHERE user_id = 7'
        ub = 'UPDATE credits SET balance = balance - 5 WHERE user_id = 7'
        return [dict(s='A', begin=L), dict(s='B', begin=L),
                dict(s='A', sql=ua, key='a_upd', note='one statement: read and write together'),
                dict(s='B', sql=ub, key='b_upd'), dict(s='A', sql='COMMIT', key='a_commit'), dict(s='B', sql='COMMIT', key='b_commit')]
    return [
        dict(s='A', begin=L), dict(s='A', sql=sel, key='a_read', note='A reads the balance'),
        dict(s='B', begin=L), dict(s='B', sql=sel, key='b_read', note='B reads the balance'),
        dict(s='A', sql=lambda n: 'UPDATE credits SET balance = %s WHERE user_id = 7' % (v(n, 'a_read', 30) - 10), key='a_upd', note='A writes what it read minus 10'),
        dict(s='A', sql='COMMIT', key='a_commit'),
        dict(s='B', sql=lambda n: 'UPDATE credits SET balance = %s WHERE user_id = 7' % (v(n, 'b_read', 30) - 5), key='b_upd', note='B writes what it read minus 5'),
        dict(s='B', sql='COMMIT', key='b_commit')]
def lost_check(n, f):
    bal = f['balance'][0][0]
    both = _committed(n, 'a_commit') and _committed(n, 'b_commit') and ok(n, 'a_upd') and ok(n, 'b_upd')
    return (both and bal != 15, 'final balance %s (both spends counted would be 15)' % bal)
def _committed(n, k):
    r = n.get(k)
    return bool(r) and not r.get('error') and r.get('status') != 'ROLLBACK' and not r.get('tx_failed')
S['lost'] = dict(
    title='Lost update', names=['A', 'B'],
    story='Two requests spend user 7\'s credits at once: A spends 10, B spends 5. Each reads the balance, subtracts in Python, and writes the result back.',
    steps=lost_steps, final={'balance': BAL}, check=lost_check,
    fixes={'for_update': 'SELECT ... FOR UPDATE', 'atomic': 'balance = balance - x in one UPDATE'})

# 5. Read skew: B reads two rows from two different moments
S['readskew'] = dict(
    title='Read skew', names=['A', 'B'],
    story='A moves 10 credits from user 7 to user 12 (the playground\'s transfer); the total stays 50. B, an audit job, reads the two balances one after the other.',
    steps=lambda L: [
        dict(s='B', begin=L), dict(s='B', sql=BAL, key='b7'),
        dict(s='A', begin=L), dict(s='A', sql='UPDATE credits SET balance = balance - 10 WHERE user_id = 7'),
        dict(s='A', sql='UPDATE credits SET balance = balance + 10 WHERE user_id = 12'), dict(s='A', sql='COMMIT'),
        dict(s='B', sql='SELECT balance FROM credits WHERE user_id = 12', key='b12'), dict(s='B', sql='COMMIT')],
    final={'total': 'SELECT sum(balance) FROM credits'},
    check=lambda n, f: ((v(n, 'b7', 0) or 0) + (v(n, 'b12', 0) or 0) != 50, 'B saw 7: %s and 12: %s, a total of %s (always 50)' % (v(n, 'b7'), v(n, 'b12'), (v(n, 'b7', 0) or 0) + (v(n, 'b12', 0) or 0))))

# 6. Write skew: two on-call engineers both go off call
def ws_steps(L, fix=None):
    cnt = 'SELECT count(*) FROM oncall WHERE on_call' if fix != 'for_update' else 'SELECT engineer FROM oncall WHERE on_call FOR UPDATE'
    def off(who, key):
        def f(n):
            r = n.get(key) or {}
            rows = r.get('rows') or []
            c = len(rows) if fix == 'for_update' else (rows[0][0] if rows else 0)
            return "UPDATE oncall SET on_call = false WHERE engineer = '%s'" % who if c >= 2 else "SELECT 'stays on call'"
        return f
    return [dict(s='A', begin=L), dict(s='A', sql=cnt, key='a_cnt', note='Ana: is someone else on call?'),
            dict(s='B', begin=L), dict(s='B', sql=cnt, key='b_cnt', note='Raj asks the same'),
            dict(s='A', sql=off('ana', 'a_cnt'), key='a_upd', note='2 on call, so Ana goes off'),
            dict(s='B', sql=off('raj', 'b_cnt'), key='b_upd', note='Raj also saw 2'),
            dict(s='A', sql='COMMIT', key='a_commit'), dict(s='B', sql='COMMIT', key='b_commit')]
S['writeskew'] = dict(
    title='Write skew', names=['A', 'B'],
    story='The chat product\'s incident rota needs at least one engineer on call. Ana and Raj are both on call and both feel ill; each checks that someone else is on call, then signs off (the on-call doctors example of Cahill, Rohm and Fekete, 2008).',
    steps=ws_steps, final={'on_call': 'SELECT count(*) FROM oncall WHERE on_call'},
    check=lambda n, f: (f['on_call'][0][0] == 0, '%s engineers on call at the end (the rule: at least 1)' % f['on_call'][0][0]),
    fixes={'for_update': 'lock the rows read (FOR UPDATE)'})

# 7. Write skew through a phantom: the daily quota
def q_steps(L, fix=None):
    lock = [dict(s='A', sql='SELECT id FROM users WHERE id = 7 FOR UPDATE', note='lock the user row first')] if fix == 'lock_parent' else []
    lockb = [dict(s='B', sql='SELECT id FROM users WHERE id = 7 FOR UPDATE', note='lock the user row first')] if fix == 'lock_parent' else []
    cnt = 'SELECT count(*) FROM messages WHERE user_id = 7 AND day = 20261004'
    def ins(i, key):
        return lambda n: ('INSERT INTO messages VALUES (%d, 7, 20261004)' % i) if (v(n, key, 99) or 0) < 3 else "SELECT 'over quota'"
    return [dict(s='A', begin=L), *lock, dict(s='A', sql=cnt, key='a_cnt', note='2 used of 3?'),
            dict(s='B', begin=L), *lockb, dict(s='B', sql=cnt, key='b_cnt'),
            dict(s='A', sql=ins(20, 'a_cnt'), key='a_ins', note='under quota: send'),
            dict(s='B', sql=ins(21, 'b_cnt'), key='b_ins'),
            dict(s='A', sql='COMMIT', key='a_commit'), dict(s='B', sql='COMMIT', key='b_commit')]
S['quota'] = dict(
    title='Write skew on a quota (phantom)', names=['A', 'B'],
    story='User 7 may send 3 messages a day and has sent 2. Two tabs each count today\'s messages, see 2, and insert one. There is no existing row both could lock: the conflict is over a row that does not exist yet.',
    steps=q_steps, final={'count': 'SELECT count(*) FROM messages WHERE user_id = 7 AND day = 20261004'},
    check=lambda n, f: (f['count'][0][0] > 3, '%s messages today against a quota of 3' % f['count'][0][0]),
    fixes={'lock_parent': 'lock the user row (FOR UPDATE) before counting'})

# 8. Read-only transaction anomaly (Fekete, O'Neil and O'Neil, 2004): three transactions
S['readonly'] = dict(
    title='Read-only anomaly', names=['A', 'B', 'C'],
    story='Credit purchases are filed under the open billing batch. B closes batch 1 (opens batch 2); C, a read-only report, sees batch 1 closed and totals it; A, a purchase that read "batch 1" before the close, commits after the report. The report on a closed batch is wrong, although every transaction alone is correct (the PostgreSQL wiki\'s deposit report example).',
    steps=lambda L: [
        dict(s='A', begin=L), dict(s='A', sql='SELECT open_batch FROM billing WHERE id = 1', key='a_batch', note='purchase: which batch is open?'),
        dict(s='B', begin=L), dict(s='B', sql='UPDATE billing SET open_batch = open_batch + 1 WHERE id = 1', note='close batch 1'),
        dict(s='B', sql='COMMIT', key='b_commit'),
        dict(s='C', begin=L), dict(s='C', sql='SELECT open_batch FROM billing WHERE id = 1', key='c_batch', note='report: batch 1 is closed'),
        dict(s='C', sql='SELECT sum(credits) FROM purchases WHERE batch = 1', key='c_sum', note='total of the closed batch'),
        dict(s='C', sql='COMMIT', key='c_commit'),
        dict(s='A', sql=lambda n: 'INSERT INTO purchases VALUES (2, %s, 50)' % (v(n, 'a_batch', 1) or 1), key='a_ins', note='file the purchase in batch 1'),
        dict(s='A', sql='COMMIT', key='a_commit')],
    final={'batch1': 'SELECT sum(credits) FROM purchases WHERE batch = 1'},
    check=lambda n, f: (_committed(n, 'a_ins') and _committed(n, 'a_commit') and _committed(n, 'c_commit') and v(n, 'c_sum') is not None
                        and int(v(n, 'c_sum')) != int(f['batch1'][0][0]) and v(n, 'c_batch') == 2,
                        'report said batch 1 totals %s; batch 1 now totals %s' % (v(n, 'c_sum'), f['batch1'][0][0])))

LEVELS = ['read uncommitted', 'read committed', 'repeatable read', 'serializable']
ORDER = ['dirty', 'nonrepeatable', 'phantom', 'lost', 'readskew', 'writeskew', 'quota', 'readonly']
