"""Recompute every number the Reading tab's animations show (Topic: swe-and-system-design).
All traffic in the animations is illustrative (labelled on the page); this script checks that the
JavaScript computes what the captions say. Run: python3 recompute.py  (prints JSON; check_read.mjs compares)."""
import json, math

# ---- A1: one server against a load balancer (one dot = 100 requests) ----
A1_ARR = [6, 7, 5, 8, 6, 7, 6, 5, 7, 6]
A1_CAP = 4  # dots per tick per server
def a1(n_servers):
    q = [0] * n_servers; rows = []; rr = 0
    for a in A1_ARR:
        for _ in range(a):  # round robin
            q[rr % n_servers] += 1; rr += 1
        served = [min(x, A1_CAP) for x in q]
        q = [x - s for x, s in zip(q, served)]
        w = sum(q)
        rows.append({'arr': a, 'served': sum(served), 'waiting': w, 'wait_s': round(max(q) / A1_CAP, 2)})
    return rows

# ---- A2: every read to the database, then cache-aside (one square = 50 reads per second) ----
A2_READS = 20; A2_DBCAP = 12
A2_HITS = [0, 10, 16, 18, 18, 17, 18, 18, 16, 18]
def a2(cache):
    backlog = 0; rows = []
    for t in range(10):
        hits = A2_HITS[t] if cache else 0
        miss = A2_READS - hits
        load = miss + backlog
        served = min(load, A2_DBCAP); backlog = load - served
        rows.append({'hits': hits, 'db': miss, 'backlog': backlog})
    return rows

# ---- A3: slow work in the request, then on a queue ----
A3_THREADS = 4; A3_CHAT = 3; A3_UPLOAD_AT = [1, 2, 2, 4, 5]; A3_UP_LEN = 4; A3_WORKERS = 2; A3_T = 12
def a3(queued):
    threads = [None] * A3_THREADS  # each: [kind, remaining, arrival]
    workers = [None] * A3_WORKERS
    fifo = []; wq = []; rows = []; chat_waits = []
    for t in range(A3_T):
        if t < 10:
            for i in range(A3_CHAT): fifo.append(['chat', 1, t])
            for _ in range(A3_UPLOAD_AT.count(t)):
                if queued: wq.append(['up', A3_UP_LEN, t])  # the request itself only enqueues: returns at once
                else: fifo.append(['up', A3_UP_LEN, t])
        for i in range(A3_THREADS):
            if threads[i] is None and fifo:
                job = fifo.pop(0); threads[i] = job
                if job[0] == 'chat': chat_waits.append(t - job[2])
        for i in range(A3_WORKERS):
            if workers[i] is None and wq: workers[i] = wq.pop(0)
        busy_up = sum(1 for x in threads if x and x[0] == 'up')
        rows.append({'waiting_chat': sum(1 for x in fifo if x[0] == 'chat'), 'threads_on_uploads': busy_up,
                     'queue': len(wq), 'workers_busy': sum(1 for x in workers if x)})
        for arr in (threads, workers):
            for i, x in enumerate(arr):
                if x:
                    x[1] -= 1
                    if x[1] == 0: arr[i] = None
    return rows, round(sum(chat_waits) / len(chat_waits), 2), max(chat_waits)

# ---- A4a: retry storm. Before: every failure retried 1 tick later (no backoff, no jitter).
# After: exponential backoff with full jitter, delay drawn uniformly from 1..2^k ticks after try k.
# Overload model (illustrative choice): above capacity the server wastes effort on requests whose
# clients have already timed out, so useful work = max(0.4*CAP, CAP - ceil(0.3*(load - CAP))).
def lcg(seed):
    s = seed
    def r():
        nonlocal s
        s = (s * 1103515245 + 12345) % 2147483648
        return s / 2147483648
    return r
A4_NEW = 12; A4_CAP = 20; A4_DOWN = (3, 5); A4_T = 22; A4_MAXTRY = 5; A4_WASTE = 0.3; A4_FLOOR = 0.4
def a4(jitter):
    rnd = lcg(42); due = {}; rows = []; gave_up = 0; attempts = 0; ok = 0
    for t in range(A4_T):
        reqs = [1] * A4_NEW + due.pop(t, [])
        L = len(reqs); attempts += L
        if A4_DOWN[0] <= t <= A4_DOWN[1]: good = 0
        elif L <= A4_CAP: good = L
        else: good = max(int(A4_CAP * A4_FLOOR), A4_CAP - math.ceil(A4_WASTE * (L - A4_CAP)))
        reqs.sort(reverse=True)  # older requests (higher try number) first
        failed = reqs[good:]; ok += good
        for k in failed:
            if k >= A4_MAXTRY: gave_up += 1; continue
            d = 1 + int(rnd() * 2 ** k) if jitter else 1
            due.setdefault(t + d, []).append(k + 1)
        rows.append({'load': L, 'good': good})
    return rows, {'attempts': attempts, 'ok': ok, 'gave_up': gave_up, 'peak': max(r['load'] for r in rows),
                  'last_over': max([t for t, r in enumerate(rows) if r['load'] > A4_CAP] or [-1])}

# ---- A5: static against continuous batching ----
A5_LEN = [3, 8, 2, 5, 4, 7, 2, 3, 6, 2]; A5_SLOTS = 4
def a5(continuous):
    n = len(A5_LEN); start = [None] * n; end = [None] * n
    if not continuous:
        t = 0
        for b in range(0, n, A5_SLOTS):
            batch = list(range(b, min(n, b + A5_SLOTS)))
            for i in batch: start[i] = t; end[i] = t + A5_LEN[i]
            t += max(A5_LEN[i] for i in batch)
        total = t
    else:
        free = [0] * A5_SLOTS; nxt = 0
        while nxt < n:
            s = min(range(A5_SLOTS), key=lambda j: (free[j], j))
            start[nxt] = free[s]; end[nxt] = free[s] + A5_LEN[nxt]; free[s] = end[nxt]; nxt += 1
        total = max(end)
    busy = sum(A5_LEN)
    return {'total_ticks': total, 'util_pct': round(100 * busy / (total * A5_SLOTS), 1),
            'mean_done': round(sum(end) / n, 2), 'start': start, 'end': end}

# ---- A6: back-of-envelope for the chat assistant (every input illustrative) ----
E = dict(users=10_000_000, dau_frac=0.10, msgs_per_dau=10, out_tok=500, in_tok=2000, peak_x=2.0,
         tok_per_gpu=2000, stream_s=10, bytes_per_msg=2000, headroom=1.2)
def a6():
    dau = E['users'] * E['dau_frac']; msgs = dau * E['msgs_per_dau']
    avg = msgs / 86400; peak = avg * E['peak_x']
    tok_avg = avg * E['out_tok']; tok_peak = peak * E['out_tok']
    gpu_avg = math.ceil(tok_avg / E['tok_per_gpu']); gpu_peak = math.ceil(tok_peak * E['headroom'] / E['tok_per_gpu'])
    streams = peak * E['stream_s']
    store_day_gb = msgs * 2 * E['bytes_per_msg'] / 1e9
    return dict(dau=dau, msgs=msgs, avg_rps=round(avg, 1), peak_rps=round(peak, 1), tok_avg=round(tok_avg),
                tok_peak=round(tok_peak), gpu_avg=gpu_avg, gpu_peak=gpu_peak, streams=round(streams),
                store_day_gb=round(store_day_gb, 1), store_year_tb=round(store_day_gb * 365 / 1000, 1))
# daily shape (illustrative): fraction of the average per hour, mean 1.0, max 2.0
A6_SHAPE = [0.4, 0.3, 0.25, 0.25, 0.3, 0.4, 0.55, 0.75, 0.95, 1.1, 1.2, 1.25, 1.25, 1.2, 1.15, 1.15, 1.2, 1.3, 1.45, 1.65, 1.85, 2.0, 1.3, 0.8]
def a6_day(gpus):
    r = a6(); cap = gpus * E['tok_per_gpu']
    dem = [s * r['tok_avg'] for s in A6_SHAPE]
    over = sum(1 for d in dem if d > cap)
    idle = sum(max(0, cap - d) for d in dem) / E['tok_per_gpu']
    return {'hours_over': over, 'idle_gpu_hours': round(idle, 1), 'shape_mean': round(sum(A6_SHAPE) / 24, 3)}

if __name__ == '__main__':
    out = {'a1_one': a1(1), 'a1_lb': a1(3), 'a2_db': a2(False), 'a2_cache': a2(True),
           'a3_inline': a3(False), 'a3_queue': a3(True), 'a4_nojit': a4(False), 'a4_jit': a4(True),
           'a5_static': a5(False), 'a5_cont': a5(True), 'a6': a6()}
    r = a6(); out['a6_day_avg'] = a6_day(r['gpu_avg']); out['a6_day_peak'] = a6_day(r['gpu_peak'])
    print(json.dumps(out, indent=1))
