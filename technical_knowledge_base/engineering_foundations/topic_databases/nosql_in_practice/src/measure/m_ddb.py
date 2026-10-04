"""DynamoDB single-table design for the chat product, run on DynamoDB Local 3.3.1 (AWS's downloadable version, OpenJDK 17).
DynamoDB Local runs the API (keys, sort order, GSIs, conditions, transactions, capacity accounting) but not the service's
partitions, throughput limits or latency, so only the logical results are recorded: items returned, items scanned, capacity units.
Data: the same messages as m_wide.py (scratch wide_msgs.csv), chats 1 to 3000, owned by 400 users.
About 3 minutes. Writes inputs/ddb.json.
"""
import os, sys, time, json, csv, subprocess, signal, datetime, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import boto3
from boto3.dynamodb.conditions import Key, Attr

res = machine()
JAVA = os.path.join(S, 'env', 'lib', 'jvm', 'bin', 'java')
DDB = os.path.join(S, 'ddb')
LONG = 7
def owner(chat): return 1 + (chat * 7919) % 400
def iso(ts): return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

if __name__ == '__main__':
    port = free_port(56560); res['port'] = port
    d = os.path.join(S, 'ddb_data'); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    p = subprocess.Popen([JAVA, f'-Djava.library.path={DDB}/DynamoDBLocal_lib', '-jar', f'{DDB}/DynamoDBLocal.jar', '-port', str(port), '-dbPath', d],
                         cwd=DDB, stdout=open(d + '/log', 'w'), stderr=subprocess.STDOUT)
    try:
        wait_port(port, 60)
        ddb = boto3.resource('dynamodb', endpoint_url=f'http://127.0.0.1:{port}', region_name='us-east-1', aws_access_key_id='local', aws_secret_access_key='local')
        cli = ddb.meta.client
        res['ddb_local'] = '3.3.1 (2026-05-28)'
        spec = dict(TableName='app', BillingMode='PAY_PER_REQUEST',
            AttributeDefinitions=[{'AttributeName': a, 'AttributeType': 'S'} for a in ('PK', 'SK', 'GSI1PK', 'GSI1SK')],
            KeySchema=[{'AttributeName': 'PK', 'KeyType': 'HASH'}, {'AttributeName': 'SK', 'KeyType': 'RANGE'}],
            GlobalSecondaryIndexes=[{'IndexName': 'GSI1', 'KeySchema': [{'AttributeName': 'GSI1PK', 'KeyType': 'HASH'}, {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}],
                                     'Projection': {'ProjectionType': 'ALL'}}])
        t = ddb.create_table(**spec); t.wait_until_exists(); res['create_table'] = spec
        rows = [r for r in csv.reader(open(os.path.join(S, 'wide_msgs.csv'))) if int(r[0]) <= 3000]
        chats = {}
        for r in rows:
            c = int(r[0]); ts = int(r[6]); chats.setdefault(c, [ts, ts]); chats[c][1] = max(chats[c][1], ts); chats[c][0] = min(chats[c][0], ts)
        t0 = time.time()
        with t.batch_writer() as bw:
            for u in range(1, 401):
                bw.put_item(Item={'PK': f'USER#{u}', 'SK': 'PROFILE', 'type': 'user', 'email': f'user{u}@example.com', 'plan': 'free'})
                bw.put_item(Item={'PK': f'EMAIL#user{u}@example.com', 'SK': 'EMAIL', 'type': 'email', 'user': u})
            for c, (a, b) in chats.items():
                bw.put_item(Item={'PK': f'USER#{owner(c)}', 'SK': f'CHAT#{c}', 'type': 'chat', 'title': f'Chat {c}', 'created': iso(a),
                                  'GSI1PK': f'USER#{owner(c)}', 'GSI1SK': f'LAST#{iso(b)}#{c}'})
            for r in rows:
                c, mid, ts = int(r[0]), int(r[1]), int(r[6])
                bw.put_item(Item={'PK': f'CHAT#{c}', 'SK': f'MSG#{iso(ts)}#{mid:09d}', 'type': 'message', 'role': r[2], 'model': r[3], 'tokens': int(r[4]), 'content': r[5]})
                day = iso(ts)[:10]
        res['load'] = {'users': 400, 'chats': len(chats), 'messages': len(rows), 'seconds': round(time.time() - t0, 1)}
        # usage counters: one item per user per day, updated with an atomic ADD
        usage = {}
        for r in rows: k = (owner(int(r[0])), iso(int(r[6]))[:10]); usage[k] = usage.get(k, 0) + int(r[4])
        for (u, day), tok in list(usage.items())[:3000]:
            t.update_item(Key={'PK': f'USER#{u}', 'SK': f'USAGE#{day}'}, UpdateExpression='ADD tokens :t SET #ty = :ty', ExpressionAttributeNames={'#ty': 'type'},
                          ExpressionAttributeValues={':t': tok, ':ty': 'usage'})
        U = owner(LONG); res['user'] = U
        def q(label, **kw):
            kw.setdefault('ReturnConsumedCapacity', 'TOTAL')
            r = t.query(**kw) if 'KeyConditionExpression' in kw else t.scan(**kw)
            cc = r.get('ConsumedCapacity', {})
            items = r['Items']
            out = {'label': label, 'op': 'Query' if 'KeyConditionExpression' in kw else 'Scan', 'count': r['Count'], 'scanned': r['ScannedCount'],
                   'capacity': cc.get('CapacityUnits'), 'more_pages': 'LastEvaluatedKey' in r,
                   'sample': [{k: (str(v) if not isinstance(v, (str, int)) else v) for k, v in it.items() if k in ('PK', 'SK', 'GSI1SK', 'tokens', 'email', 'title')} for it in items[:3]]}
            print(label, out['count'], out['scanned'], out['capacity'], flush=True); return out
        ap = []
        r = t.get_item(Key={'PK': f'USER#{U}', 'SK': 'PROFILE'}, ReturnConsumedCapacity='TOTAL')
        ap.append({'label': 'AP1 user profile', 'op': 'GetItem', 'count': 1, 'scanned': 1, 'capacity': r['ConsumedCapacity']['CapacityUnits'], 'sample': [r['Item']]})
        r = t.get_item(Key={'PK': f'EMAIL#user{U}@example.com', 'SK': 'EMAIL'}, ReturnConsumedCapacity='TOTAL')
        ap.append({'label': 'AP2 user by email', 'op': 'GetItem', 'count': 1, 'scanned': 1, 'capacity': r['ConsumedCapacity']['CapacityUnits'], 'sample': [{k: str(v) for k, v in r['Item'].items()}]})
        ap.append(q('AP3 chat list, most recent first', IndexName='GSI1', KeyConditionExpression=Key('GSI1PK').eq(f'USER#{U}') & Key('GSI1SK').begins_with('LAST#'), ScanIndexForward=False, Limit=20))
        ap.append(q('AP4 latest 50 messages', KeyConditionExpression=Key('PK').eq(f'CHAT#{LONG}') & Key('SK').begins_with('MSG#'), ScanIndexForward=False, Limit=50))
        ap.append(q('AP4 latest 50, strongly consistent', KeyConditionExpression=Key('PK').eq(f'CHAT#{LONG}') & Key('SK').begins_with('MSG#'), ScanIndexForward=False, Limit=50, ConsistentRead=True))
        ap.append(q('AP5 messages of one day', KeyConditionExpression=Key('PK').eq(f'CHAT#{LONG}') & Key('SK').between('MSG#2025-09-10', 'MSG#2025-09-11'), ScanIndexForward=True))
        ap.append(q('AP6 usage for September', KeyConditionExpression=Key('PK').eq(f'USER#{U}') & Key('SK').begins_with('USAGE#2025-09')))
        ap.append(q('Wrong: latest 50 by Scan + filter (no key)', FilterExpression=Attr('PK').eq(f'CHAT#{LONG}'), Limit=1000))
        full = t.scan(Select='COUNT', ReturnConsumedCapacity='TOTAL'); sc, cap, pages = full['ScannedCount'], full['ConsumedCapacity']['CapacityUnits'], 1
        while 'LastEvaluatedKey' in full:
            full = t.scan(Select='COUNT', ReturnConsumedCapacity='TOTAL', ExclusiveStartKey=full['LastEvaluatedKey']); sc += full['ScannedCount']; cap += full['ConsumedCapacity']['CapacityUnits']; pages += 1
        ap.append({'label': 'Wrong: one model across all chats (full Scan)', 'op': 'Scan', 'count': None, 'scanned': sc, 'capacity': round(cap, 1), 'pages': pages})
        res['access_patterns'] = ap
        # writes: append a message and move the chat to the top, in one transaction
        now = iso(int(time.time()))
        tw = cli.transact_write_items(TransactItems=[
            {'Put': {'TableName': 'app', 'Item': {'PK': f'CHAT#{LONG}', 'SK': f'MSG#{now}#999999999', 'type': 'message', 'role': 'user', 'tokens': 12, 'content': 'hello again'}}},
            {'Update': {'TableName': 'app', 'Key': {'PK': f'USER#{U}', 'SK': f'CHAT#{LONG}'}, 'UpdateExpression': 'SET GSI1SK = :g', 'ExpressionAttributeValues': {':g': f'LAST#{now}#{LONG}'}}}],
            ReturnConsumedCapacity='TOTAL')
        res['append_txn_capacity'] = tw.get('ConsumedCapacity')
        top = t.query(IndexName='GSI1', KeyConditionExpression=Key('GSI1PK').eq(f'USER#{U}'), ScanIndexForward=False, Limit=1)['Items'][0]['SK']
        res['append_then_top_chat'] = top
        pw = t.put_item(Item={'PK': f'CHAT#{LONG}', 'SK': f'MSG#{now}#999999998', 'type': 'message', 'role': 'user', 'tokens': 12, 'content': 'x' * 100}, ReturnConsumedCapacity='TOTAL')
        res['put_message_capacity'] = pw['ConsumedCapacity']['CapacityUnits']
        # unique email: a registration is two puts that must both succeed, guarded by conditions
        def register(uid, email):
            try:
                cli.transact_write_items(TransactItems=[
                    {'Put': {'TableName': 'app', 'Item': {'PK': f'USER#{uid}', 'SK': 'PROFILE', 'email': email}, 'ConditionExpression': 'attribute_not_exists(PK)'}},
                    {'Put': {'TableName': 'app', 'Item': {'PK': f'EMAIL#{email}', 'SK': 'EMAIL', 'user': uid}, 'ConditionExpression': 'attribute_not_exists(PK)'}}])
                return 'ok'
            except cli.exceptions.TransactionCanceledException as e:
                return {'error': 'TransactionCanceledException', 'reasons': [x.get('Code') for x in e.response.get('CancellationReasons', [])]}
        res['register'] = {'new': register(9001, 'new@example.com'), 'duplicate_email': register(9002, 'new@example.com')}
        # errors worth seeing once
        errs = {}
        try:
            t.query(IndexName='GSI1', KeyConditionExpression=Key('GSI1PK').eq(f'USER#{U}'), ConsistentRead=True)
        except Exception as e: errs['consistent_read_on_gsi'] = str(e)[:300]
        try:
            t.put_item(Item={'PK': 'BIG', 'SK': 'X', 'blob': 'z' * (401 * 1024)})
        except Exception as e: errs['item_over_400kb'] = str(e)[:300]
        try:
            t.query(KeyConditionExpression=Key('SK').begins_with('MSG#'))
        except Exception as e: errs['query_without_partition_key'] = str(e)[:300]
        res['errors'] = errs
        # item sizes as DynamoDB bills them: UTF-8 bytes of attribute names plus values (numbers about 1 byte per 2 digits + 1)
        it = t.query(KeyConditionExpression=Key('PK').eq(f'CHAT#{LONG}'), Limit=200)['Items']
        def isize(i): return sum(len(k.encode()) + (len(v.encode()) if isinstance(v, str) else (len(str(v)) + 1) // 2 + 1) for k, v in i.items())
        sz = [isize(i) for i in it]; res['message_item_bytes'] = {'mean': round(sum(sz) / len(sz)), 'max': max(sz)}
        save('ddb.json', res)
    finally:
        p.send_signal(signal.SIGTERM); p.wait(30)
