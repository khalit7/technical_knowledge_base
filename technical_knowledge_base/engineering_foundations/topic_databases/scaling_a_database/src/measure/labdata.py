"""Per-shard load for the Shard-key lab, counted on the chat product's real 10M messages (server "big", port 56401).
For each candidate shard key and each shard count N = 2..16: stored messages per shard, and new messages per shard in the
data's last 7 days (the write load right now). Also the ring resharding counts (3 to 4 shards) for three routing schemes.
Writes ../inputs/lab_data.json. About 1 minute."""
import json, time
from collections import defaultdict
from pgc import *
from ring import Ring, user_key, h32
P = PG('big', 56401); P.start(); q = P.psql
LAST = "timestamptz '2026-08-07 00:00+00'"
# per user: country, stored messages, last-week messages, chats
rows = q(f"""SELECT u.id, u.country, coalesce(s.n, 0), coalesce(s.w, 0), coalesce(s.c, 0) FROM users u LEFT JOIN (
  SELECT c.user_id, count(*) n, count(*) FILTER (WHERE m.created_at >= {LAST}) w, count(DISTINCT c.id) c
  FROM messages m JOIN chats c ON c.id = m.chat_id GROUP BY c.user_id) s ON s.user_id = u.id ORDER BY u.id""").splitlines()
U = [(int(a), b, int(c), int(d), int(e)) for a, b, c, d, e in (r.split('|') for r in rows)]
# per chat: stored and last-week messages
CH = [tuple(map(int, r.split('|'))) for r in q(f"SELECT chat_id, count(*), count(*) FILTER (WHERE created_at >= {LAST}) FROM messages GROUP BY chat_id").splitlines()]
# per month: stored and last-week messages
MO = [(r.split('|')[0], int(r.split('|')[1]), int(r.split('|')[2])) for r in q(f"SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM'), count(*), count(*) FILTER (WHERE created_at >= {LAST}) FROM messages GROUP BY 1 ORDER BY 1").splitlines()]
tot = sum(u[2] for u in U); totw = sum(u[3] for u in U)
countries = sorted({u[1] for u in U})
NU = len(U)
def loads(N):
    out = {}
    def agg(items, shard_of):
        s = [0] * N; w = [0] * N
        for key, n, wk in items:
            k = shard_of(key); s[k] += n; w[k] += wk
        return s, w
    out['user_hash'] = agg([(u[0], u[2], u[3]) for u in U], lambda k: h32(user_key(k)) % N)
    out['user_range'] = agg([(u[0], u[2], u[3]) for u in U], lambda k: min(N - 1, (k - 1) * N // NU))
    out['chat_hash'] = agg(CH, lambda k: h32(f'chat:{k}') % N)
    # time: month buckets spread over shards in order (range by created_at): month i goes to shard floor(i * N / months)
    mi = {m[0]: i for i, m in enumerate(MO)}
    out['month_range'] = agg(MO, lambda k: min(N - 1, mi[k] * N // len(MO)))
    # country: each country to one shard by hash of its code (a list partition chosen without balancing)
    cs = defaultdict(lambda: [0, 0])
    for u in U: cs[u[1]][0] += u[2]; cs[u[1]][1] += u[3]
    out['country'] = agg([(c, v[0], v[1]) for c, v in cs.items()], lambda k: h32(f'country:{k}') % N)
    return {k: {'stored': v[0], 'week': v[1]} for k, v in out.items()}
R = {'date': time.strftime('%Y-%m-%d'), 'total_msgs': tot, 'total_week': totw, 'users': NU, 'chats': len(CH), 'months': MO,
     'by_n': {N: loads(N) for N in range(2, 17)}}
top_u = max(U, key=lambda u: u[2]); top_c = max(CH, key=lambda c: c[1])
cs = defaultdict(int)
for u in U: cs[u[1]] += u[2]
R['top'] = {'user': {'id': top_u[0], 'msgs': top_u[2], 'chats': top_u[4], 'share': top_u[2] / tot},
            'chat': {'id': top_c[0], 'msgs': top_c[1], 'share': top_c[1] / tot},
            'country': sorted(([c, n, n / tot] for c, n in cs.items()), key=lambda x: -x[1])[:5],
            'users_top1pct_share': sum(sorted((u[2] for u in U), reverse=True)[:NU // 100]) / tot,
            'users_zero': sum(1 for u in U if u[2] == 0)}
# resharding 3 to 4: users and messages that change shard, three schemes
def moved(f3, f4):
    k = m = 0
    for u in U:
        if f3(u[0]) != f4(u[0]): k += 1; m += u[2]
    return {'users': k, 'msgs': m, 'users_pct': k / NU, 'msgs_pct': m / tot}
r3, r4 = Ring([0, 1, 2]), Ring([0, 1, 2, 3])
L = 48  # logical shards (buckets) mapped to hosts in contiguous blocks; 3 to 4 hosts moves whole buckets
b3 = lambda b: b * 3 // L
b4 = lambda b: b * 4 // L
R['reshard'] = {'mod': moved(lambda k: h32(user_key(k)) % 3, lambda k: h32(user_key(k)) % 4),
                'ring64': moved(lambda k: r3.shard(user_key(k)), lambda k: r4.shard(user_key(k))),
                'logical48_contig': moved(lambda k: b3(h32(user_key(k)) % L), lambda k: b4(h32(user_key(k)) % L))}
# logical shards done right: keep existing buckets in place, hand 12 buckets (4 from each host) to the new host
own3 = {b: b % 3 for b in range(L)}; own4 = dict(own3)
for h in range(3):
    for b in [b for b in range(L) if own3[b] == h][:4]: own4[b] = 3
R['reshard']['logical48'] = moved(lambda k: own3[h32(user_key(k)) % L], lambda k: own4[h32(user_key(k)) % L])
def bal(f, n):
    s = [0] * n
    for u in U: s[f(u[0])] += u[2]
    return s
R['reshard']['balance'] = {'ring3': bal(lambda k: r3.shard(user_key(k)), 3), 'ring4': bal(lambda k: r4.shard(user_key(k)), 4),
                           'logical48_4': bal(lambda k: own4[h32(user_key(k)) % L], 4), 'mod4': bal(lambda k: h32(user_key(k)) % 4, 4)}
# changing the shard key from user to chat on 3 shards: messages that move
R['key_change_3'] = sum(1 for _ in [])  # placeholder replaced below
cu = dict((int(a), int(b)) for a, b in (r.split('|') for r in q("SELECT id, user_id FROM chats").splitlines()))
mv = sum(n for c, n, w in CH if h32(f'chat:{c}') % 3 != h32(user_key(cu[c])) % 3)
R['key_change_3'] = {'msgs': mv, 'pct': mv / tot}
save('lab_data.json', R); print(json.dumps({k: R[k] for k in ('top', 'reshard', 'key_change_3', 'total_week')}, indent=1))
