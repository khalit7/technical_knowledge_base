"""Documents: MongoDB 8.0.23 (conda-forge, single-node replica set so transactions work) against PostgreSQL 16.2 jsonb and plain columns.
The same 1M messages as m_wide.py (scratch file wide_msgs.csv, written by m_wide.py pg). Two shapes in each database:
referenced (one record per message) and embedded (one record per chat holding its messages).
About 6 minutes. Writes inputs/doc.json.
"""
import os, sys, time, json, csv, subprocess, shutil, signal, datetime, threading, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pgserver, pymongo
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import BSON

res = machine()
LONG = 7
rows = [(int(r[0]), int(r[1]), r[2], r[3], int(r[4]), r[5], int(r[6])) for r in csv.reader(open(os.path.join(S, 'wide_msgs.csv')))]
def dt(ts): return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).replace(tzinfo=None)

def lat(f, n=200):
    for _ in range(5): f()
    xs = []
    for _ in range(n):
        t = time.perf_counter(); f(); xs.append((time.perf_counter() - t) * 1000)
    return round(pct(xs, .5), 3)

def mongo_part():
    port = free_port(56520); res['mongo_port'] = port
    d = os.path.join(S, 'mongo_data'); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    p = subprocess.Popen([os.path.join(S, 'env', 'bin', 'mongod'), '--port', str(port), '--bind_ip', '127.0.0.1', '--dbpath', d,
                          '--replSet', 'rs0', '--wiredTigerCacheSizeGB', '1', '--logpath', d + '/log'], stdout=subprocess.DEVNULL)
    try:
        wait_port(port, 60)
        c = MongoClient(port=port, directConnection=True)
        c.admin.command('replSetInitiate', {'_id': 'rs0', 'members': [{'_id': 0, 'host': f'127.0.0.1:{port}'}]})
        for _ in range(100):
            if c.admin.command('hello').get('isWritablePrimary'): break
            time.sleep(0.3)
        c.close(); c = MongoClient(port=port, directConnection=True)   # a fresh client sees a replica set member, so sessions work
        m = {'version': c.server_info()['version']}
        db = c.chat
        # referenced: one document per message
        t = time.time()
        docs = [{'_id': r[1], 'chat_id': r[0], 'role': r[2], 'model': r[3], 'tokens': r[4], 'content': r[5], 'created_at': dt(r[6])} for r in rows]
        for i in range(0, len(docs), 20000): db.messages.insert_many(docs[i:i + 20000], ordered=False)
        db.messages.create_index([('chat_id', ASCENDING), ('created_at', DESCENDING)])
        m['load_ref_s'] = round(time.time() - t, 1)
        # embedded: one document per chat with every message inside
        t = time.time(); by = {}
        for dct in docs:
            x = dict(dct); cid = x.pop('chat_id'); x['id'] = x.pop('_id'); by.setdefault(cid, []).append(x)
        emb = [{'_id': cid, 'title': f'Chat {cid}', 'messages': ms} for cid, ms in by.items()]
        for i in range(0, len(emb), 5000): db.chats.insert_many(emb[i:i + 5000], ordered=False)
        m['load_emb_s'] = round(time.time() - t, 1)
        st1, st2 = db.command('collStats', 'messages'), db.command('collStats', 'chats')
        m['sizes'] = {'messages': {'count': st1['count'], 'avgObjSize': st1['avgObjSize'], 'size': st1['size'], 'storageSize': st1['storageSize'], 'indexSize': st1['totalIndexSize']},
                      'chats': {'count': st2['count'], 'avgObjSize': st2['avgObjSize'], 'size': st2['size'], 'storageSize': st2['storageSize'], 'indexSize': st2['totalIndexSize']}}
        m['long_chat_doc_bytes'] = len(BSON.encode(db.chats.find_one({'_id': LONG})))
        m['long_chat_messages'] = len(by[LONG])
        # read the latest 50
        qr = lambda: list(db.messages.find({'chat_id': LONG}).sort('created_at', -1).limit(50))
        qe = lambda: db.chats.find_one({'_id': LONG}, {'messages': {'$slice': -50}})
        ex = db.messages.find({'chat_id': LONG}).sort('created_at', -1).limit(50).explain()['executionStats']
        ee = db.chats.find({'_id': LONG}, {'messages': {'$slice': -50}}).explain()['executionStats']
        m['latest50'] = {'ref': {'ms_p50': lat(qr), 'keysExamined': ex['totalKeysExamined'], 'docsExamined': ex['totalDocsExamined'], 'returned': ex['nReturned']},
                         'emb': {'ms_p50': lat(qe), 'keysExamined': ee['totalKeysExamined'], 'docsExamined': ee['totalDocsExamined'], 'returned': ee['nReturned']}}
        assert [x['_id'] for x in qr()] == [x['id'] for x in qe()['messages']][::-1]
        # append one message: a new document against a $push into a growing document
        nid = [10_000_000]
        def ins():
            nid[0] += 1; db.messages.insert_one({'_id': nid[0], 'chat_id': LONG, 'role': 'user', 'model': 'mini', 'tokens': 20, 'content': 'x' * 80, 'created_at': datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)})
        def push(cid):
            def f():
                nid[0] += 1; db.chats.update_one({'_id': cid}, {'$push': {'messages': {'id': nid[0], 'role': 'user', 'model': 'mini', 'tokens': 20, 'content': 'x' * 80, 'created_at': datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)}}})
            return f
        small = next(cid for cid, ms in by.items() if len(ms) == 10)
        big = 900001
        db.chats.insert_one({'_id': big, 'title': 'big', 'messages': [{'id': -i, 'role': 'user', 'model': 'mini', 'tokens': 20, 'content': 'x' * 80, 'created_at': datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)} for i in range(1, 20001)]})
        m['append'] = {'insert_new_doc_ms': lat(ins), 'push_into_10_msg_doc_ms': lat(push(small)), 'push_into_1000_msg_doc_ms': lat(push(LONG)),
                       'push_into_20000_msg_doc_ms': lat(push(big), 100), 'big_doc_bytes': len(BSON.encode(db.chats.find_one({'_id': big})))}
        print(m['append'], flush=True)
        # the 16 MB limit: keep pushing 1 KB messages into one chat document
        db.chats.insert_one({'_id': 900002, 'messages': []}); n = 0; err = None
        msg = lambda i: {'id': i, 'role': 'assistant', 'model': 'large', 'tokens': 300, 'content': 'y' * 1000, 'created_at': datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)}
        step = 1000
        while err is None:
            try:
                db.chats.update_one({'_id': 900002}, {'$push': {'messages': {'$each': [msg(n + j) for j in range(step)]}}}); n += step
            except pymongo.errors.PyMongoError as e:
                if step > 1: step = max(1, step // 10); continue
                err = f'{type(e).__name__}: {str(e)[:300]}'
        m['limit16'] = {'messages_fitted': n, 'doc_bytes': len(BSON.encode(db.chats.find_one({'_id': 900002}))), 'error': err, 'limit_bytes': 16 * 1024 * 1024}
        print(m['limit16'], flush=True)
        # aggregation pipeline: tokens per model per day
        pipe = [{'$group': {'_id': {'model': '$model', 'day': {'$dateTrunc': {'date': '$created_at', 'unit': 'day'}}}, 'tokens': {'$sum': '$tokens'}, 'n': {'$sum': 1}}},
                {'$sort': {'_id.day': 1, '_id.model': 1}}]
        list(db.messages.aggregate(pipe)); xs = []
        for _ in range(3):
            t = time.time(); out = list(db.messages.aggregate(pipe)); xs.append((time.time() - t) * 1000)
        m['agg'] = {'ms': round(sorted(xs)[1]), 'groups': len(out), 'first': [{'model': o['_id']['model'], 'day': o['_id']['day'].date().isoformat(), 'tokens': o['tokens'], 'n': o['n']} for o in out[:4]], 'pipeline': json.loads(json.dumps(pipe, default=str))}
        # schema validation: the database can still refuse bad documents
        db.create_collection('strict', validator={'$jsonSchema': {'bsonType': 'object', 'required': ['chat_id', 'role'], 'properties': {'role': {'enum': ['user', 'assistant', 'tool']}}}})
        try:
            db.strict.insert_one({'chat_id': 1, 'role': 'admin'}); m['validation'] = 'accepted'
        except pymongo.errors.WriteError as e:
            m['validation'] = f'WriteError {e.code}: ' + str(e.details.get('errmsg'))[:200]
        # transactions: two users' credits, then two transactions racing on the same document
        db.users.insert_many([{'_id': 7, 'credits': 10}, {'_id': 12, 'credits': 0}])
        def transfer(s):
            db.users.update_one({'_id': 7}, {'$inc': {'credits': -1}}, session=s)
            db.users.update_one({'_id': 12}, {'$inc': {'credits': 1}}, session=s)
        with c.start_session() as s: s.with_transaction(transfer)
        m['txn_after'] = {u['_id']: u['credits'] for u in db.users.find()}
        s1, s2 = c.start_session(), c.start_session()
        s1.start_transaction(); s2.start_transaction()
        db.users.update_one({'_id': 7}, {'$inc': {'credits': -1}}, session=s1)
        try:
            db.users.update_one({'_id': 7}, {'$inc': {'credits': -1}}, session=s2); m['txn_conflict'] = 'no conflict'
        except pymongo.errors.OperationFailure as e:
            m['txn_conflict'] = {'code': e.code, 'codeName': e.details.get('codeName'), 'labels': e.details.get('errorLabels'), 'msg': str(e.details.get('errmsg'))[:200]}
        s1.commit_transaction()
        try: s2.abort_transaction()
        except Exception: pass
        m['txn_final'] = {u['_id']: u['credits'] for u in db.users.find()}
        m['defaults'] = {'writeConcern': c.admin.command('getDefaultRWConcern').get('defaultWriteConcern'), 'readConcern': c.admin.command('getDefaultRWConcern').get('defaultReadConcern')}
        res['mongo'] = m; print({k: v for k, v in m.items() if k not in ('agg',)}, flush=True)
    finally:
        p.send_signal(signal.SIGTERM); p.wait(60)

def pg_part():
    B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
    root = os.path.join(S, 'doc_pg'); D = root + '/data'; port = free_port(56540); res['pg_port'] = port
    def psql(sql, db='chat'):
        r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', str(port), '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', '-c', sql, db)
        if r.returncode: raise RuntimeError(r.stderr + sql[:300])
        return r.stdout.strip()
    shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
    sh(f'{B}/initdb', '-D', D, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
    sh(f'{B}/pg_ctl', '-D', D, '-o', f"-p {port} -k '' -h 127.0.0.1", '-l', root + '/log', '-w', 'start')
    try:
        psql('CREATE DATABASE chat', 'postgres'); g = {'version': psql('SHOW server_version', 'postgres')}
        f = os.path.join(S, 'wide_msgs.csv')
        psql(f'''CREATE TABLE m_cols(chat_id bigint, id bigint PRIMARY KEY, role text, model text, tokens int, content text, ts bigint);
COPY m_cols FROM '{f}' WITH (FORMAT csv);
ALTER TABLE m_cols ADD COLUMN created_at timestamptz; UPDATE m_cols SET created_at = to_timestamp(ts); ALTER TABLE m_cols DROP COLUMN ts;''')
        psql('VACUUM FULL m_cols')
        psql(f'''CREATE TABLE m_doc(id bigint PRIMARY KEY, doc jsonb NOT NULL);
INSERT INTO m_doc SELECT id, jsonb_build_object('chat_id', chat_id, 'role', role, 'model', model, 'tokens', tokens, 'content', content, 'created_at', created_at) FROM m_cols;
CREATE TABLE chat_doc(id bigint PRIMARY KEY, doc jsonb NOT NULL);
INSERT INTO chat_doc SELECT chat_id, jsonb_build_object('title', 'Chat ' || chat_id, 'messages',
  jsonb_agg(jsonb_build_object('id', id, 'role', role, 'model', model, 'tokens', tokens, 'content', content, 'created_at', created_at) ORDER BY created_at)) FROM m_cols GROUP BY chat_id;
CREATE INDEX ON m_cols(chat_id, created_at);
CREATE INDEX m_doc_chat ON m_doc(((doc->>'chat_id')::bigint), (doc->>'created_at'));''')
        psql('VACUUM ANALYZE')
        size = lambda t: int(psql(f"SELECT pg_table_size('{t}')"))
        g['sizes'] = {'columns': size('m_cols'), 'jsonb_per_message': size('m_doc'), 'jsonb_per_chat': size('chat_doc')}
        g['long_chat_value_bytes'] = int(psql(f'SELECT pg_column_size(doc) FROM chat_doc WHERE id = {LONG}'))
        def ms(sql, n=30):
            for _ in range(3): psql('EXPLAIN ANALYZE ' + sql)
            xs = [json.loads(psql('EXPLAIN (ANALYZE, FORMAT JSON) ' + sql))[0]['Execution Time'] for _ in range(n)]
            return round(pct(xs, .5), 3)
        g['latest50'] = {'columns': ms(f'SELECT * FROM m_cols WHERE chat_id = {LONG} ORDER BY created_at DESC LIMIT 50'),
                         'jsonb_per_message': ms(f"SELECT doc FROM m_doc WHERE (doc->>'chat_id')::bigint = {LONG} ORDER BY doc->>'created_at' DESC LIMIT 50"),
                         'jsonb_per_chat': ms(f"SELECT e FROM chat_doc, jsonb_array_elements(doc->'messages') WITH ORDINALITY a(e, n) WHERE id = {LONG} ORDER BY n DESC LIMIT 50")}
        agg_c = "SELECT model, date_trunc('day', created_at) d, sum(tokens) FROM m_cols GROUP BY 1, 2"
        agg_j = "SELECT doc->>'model', date_trunc('day', (doc->>'created_at')::timestamptz) d, sum((doc->>'tokens')::int) FROM m_doc GROUP BY 1, 2"
        g['agg_all_ms'] = {'columns': ms(agg_c, 5), 'jsonb_per_message': ms(agg_j, 5)}
        # containment with a GIN index
        psql('CREATE INDEX m_doc_gin ON m_doc USING gin (doc jsonb_path_ops); ANALYZE m_doc')
        cq = """SELECT count(*) FROM m_doc WHERE doc @> '{"model": "large", "role": "user", "tokens": 42}'"""
        g['gin'] = {'ms': ms(cq, 10), 'count': int(psql(cq)), 'index_bytes': int(psql("SELECT pg_relation_size('m_doc_gin')")),
                    'plan': psql('EXPLAIN (COSTS OFF) ' + cq)}
        # append one message to a growing jsonb document: the whole value is rewritten
        def app(cid, n=20):
            for _ in range(2): psql(f"""UPDATE chat_doc SET doc = jsonb_set(doc, '{{messages}}', (doc->'messages') || '[{{"id": 0, "role": "user", "content": "hi"}}]') WHERE id = {cid}""")
            xs = []
            for _ in range(n):
                xs.append(json.loads(psql(f"""EXPLAIN (ANALYZE, FORMAT JSON) UPDATE chat_doc SET doc = jsonb_set(doc, '{{messages}}', (doc->'messages') || '[{{"id": 0, "role": "user", "content": "hi"}}]') WHERE id = {cid}"""))[0]['Execution Time'])
            return round(pct(xs, .5), 3)
        small = int(psql('SELECT id FROM chat_doc WHERE jsonb_array_length(doc->\'messages\') = 10 LIMIT 1'))
        nxt = [20_000_000]
        def ins_sql():
            nxt[0] += 1; return f"INSERT INTO m_cols VALUES ({LONG}, {nxt[0]}, 'user', 'mini', 20, 'hi', now())"
        def ins_ms(n=20):
            xs = []
            for _ in range(n): xs.append(json.loads(psql('EXPLAIN (ANALYZE, FORMAT JSON) ' + ins_sql()))[0]['Execution Time'])
            return round(pct(xs, .5), 3)
        g['append_ms'] = {'insert_row': ins_ms(), 'jsonb_10_msgs': app(small), 'jsonb_1000_msgs': app(LONG)}
        # WAL written per append, averaged over 200 appends in a row (the first write to a page after a checkpoint adds a full-page image)
        upd = lambda cid: f"""UPDATE chat_doc SET doc = jsonb_set(doc, '{{messages}}', (doc->'messages') || '[{{"id": 0, "role": "user", "content": "hi"}}]') WHERE id = {cid}"""
        g['wal_per_append'] = {}
        for lab, sqlf in (('insert_row', lambda: ins_sql()), ('jsonb_10_msgs', lambda: upd(small)), ('jsonb_1000_msgs', lambda: upd(LONG))):
            psql('CHECKPOINT'); psql(sqlf())
            a = psql('SELECT pg_current_wal_insert_lsn()')
            for _ in range(200): psql(sqlf())
            b = psql('SELECT pg_current_wal_insert_lsn()')
            g['wal_per_append'][lab] = round(int(psql(f"SELECT pg_wal_lsn_diff('{b}', '{a}')")) / 200)
        res['pg'] = g; print(g, flush=True)
    finally:
        sh(f'{B}/pg_ctl', '-D', D, '-m', 'fast', '-w', 'stop')

if __name__ == '__main__':
    only = sys.argv[1:] or ['mongo', 'pg']
    if os.path.exists(os.path.join(INPUTS, 'doc.json')): res.update(json.load(open(os.path.join(INPUTS, 'doc.json'))))
    if 'mongo' in only: mongo_part(); save('doc.json', res)
    if 'pg' in only: pg_part(); save('doc.json', res)
