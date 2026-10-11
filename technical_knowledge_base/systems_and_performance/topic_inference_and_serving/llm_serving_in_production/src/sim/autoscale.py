"""Autoscaling simulator: the reference for the page's Autoscaling lab (the JavaScript is a line-for-line port,
checked against this file's output by check_sim.mjs).

Model (every input is on the page with its source):
- Arrivals: Poisson (mulberry32 random numbers, seeded) at a rate that steps from `base` to `base*spike`
  at t_spike for `dur` seconds, then back.
- A replica has `slots` sequences of KV room; a request holds one slot for prefill + out*tpot seconds;
  TTFT = wait in the shared queue + prefill. One shared FIFO queue in front of all ready replicas
  (an ideal load balancer).
- Every `period` seconds the autoscaler reads one metric over the last period and applies the Kubernetes
  HPA rule desired = ceil(ready * metric / target), clamped to [min_r, max_r]; scale-down takes the highest
  recommendation of the last `down_window` seconds (HPA's stabilization window). New replicas serve after
  `cold` seconds. Removed replicas finish their running requests but take no new ones.
- Metrics: 'util' = share of the period each replica had at least one request running (what a GPU
  utilization gauge reports for continuous batching); 'queue' = mean waiting requests per ready replica;
  'kv' = mean share of slots in use; 'ttft' = p90 TTFT of requests started in the period over the SLO.
"""
import json, math, sys

DT = 0.05


class Rng:  # mulberry32, identical to the page's JS
    def __init__(self, seed):
        self.a = seed & 0xFFFFFFFF

    def next(self):
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def arrivals(p):
    r = Rng(p['seed']); t = 0.0; out = []
    while True:
        lam = p['base'] * (p['spike'] if p['t_spike'] <= t < p['t_spike'] + p['dur'] else 1.0)
        t += -math.log(1.0 - r.next()) / lam
        if t >= p['T']:
            return out
        out.append(t)


def pct(xs, q):
    if not xs:
        return 0.0
    s = sorted(xs)
    return s[min(len(s) - 1, int(q * len(s)))]


def run(p):
    arr = arrivals(p)
    svc = p['prefill'] + p['out'] * p['tpot']
    n_steps = int(round(p['T'] / DT)); per = int(round(p['period'] / DT))
    ready = p['init']; pending = []          # times at which starting replicas become ready
    running = []                            # end times (unsorted list; small)
    queue = []; qi = 0; ai = 0
    ttft = []; ttft_t = []
    acc = {'busy': 0.0, 'q': 0.0, 'kv': 0.0, 'n': 0}; win_ttft = []
    recs = [(0.0, p['init'])]               # (time, recommendation): the pool has been at `init` for the whole window
    series = []; rep_seconds = 0.0
    for k in range(n_steps):
        t = (k + 1) * DT
        while pending and pending[0] <= t:
            pending.pop(0); ready += 1
        while ai < len(arr) and arr[ai] <= t:
            queue.append(arr[ai]); ai += 1
        running = [e for e in running if e > t]
        cap = ready * p['slots']
        while qi < len(queue) and len(running) < cap:
            a = queue[qi]; qi += 1
            running.append(t + svc)
            w = t - a + p['prefill']; ttft.append(w); ttft_t.append(t); win_ttft.append(w)
        waiting = len(queue) - qi
        acc['busy'] += min(ready, len(running)) / max(1, ready)
        acc['q'] += waiting / max(1, ready)
        acc['kv'] += min(1.0, len(running) / max(1, cap))
        acc['n'] += 1
        rep_seconds += (ready + len(pending)) * DT
        if (k + 1) % per == 0:
            n = acc['n']
            m = {'util': acc['busy'] / n, 'queue': acc['q'] / n, 'kv': acc['kv'] / n,
                 'ttft': pct(win_ttft, 0.9) / p['slo'] if win_ttft else 0.0}[p['metric']]
            if p['metric'] == 'queue' and m == 0:
                m = acc['kv'] / n * p['target']  # no queue: let usage alone drive scale-down
            total = ready + len(pending)
            if abs(m / p['target'] - 1.0) <= p['tol']:
                want = total                                  # within HPA's tolerance: no change
            else:
                want = math.ceil(ready * m / p['target'] - 1e-9)
            want = max(p['min_r'], min(p['max_r'], want, total + max(4, total)))   # scale-up limit: max(100 %, 4 pods) per period
            recs.append((t, want))
            recs = [x for x in recs if x[0] > t - p['down_window']]
            if want > total:
                for _ in range(want - total):
                    pending.append(t + p['cold'])
            else:
                lo = max(x[1] for x in recs)
                if lo < total:
                    drop = total - lo
                    while drop > 0 and pending:
                        pending.pop(); drop -= 1
                    ready = max(p['min_r'], ready - drop)
            series.append({'t': round(t, 2), 'ready': ready, 'starting': len(pending), 'waiting': waiting,
                           'running': len(running), 'metric': round(m, 4), 'want': want,
                           'ttft_p90': round(pct(win_ttft, 0.9), 3), 'rate': round(sum(1 for x in arr if t - p['period'] < x <= t) / p['period'], 3)})
            acc = {'busy': 0.0, 'q': 0.0, 'kv': 0.0, 'n': 0}; win_ttft = []
    ok = sum(1 for x in ttft if x <= p['slo'])
    return {'n': len(ttft), 'unserved': len(arr) - len(ttft), 'ttft_p50': round(pct(ttft, 0.5), 3), 'ttft_p99': round(pct(ttft, 0.99), 3),
            'slo_ok': round(ok / max(1, len(arr)), 4), 'replica_hours': round(rep_seconds / 3600, 3),
            'peak': max(s['ready'] + s['starting'] for s in series), 'series': series}


DEFAULT = {'seed': 7, 'T': 1800.0, 'base': 6.0, 'spike': 3.0, 't_spike': 600.0, 'dur': 600.0,
           'slots': 32, 'prefill': 0.4235, 'out': 300, 'tpot': 0.0468, 'slo': 1.05,
           'init': 3, 'min_r': 1, 'max_r': 16, 'period': 15.0, 'down_window': 300.0, 'tol': 0.1, 'cold': 44.0,
           'metric': 'queue', 'target': 1.0}
TARGETS = {'util': 0.7, 'queue': 1.0, 'kv': 0.8, 'ttft': 1.0}

if __name__ == '__main__':
    out = []
    for metric in ['util', 'queue', 'kv', 'ttft']:
        for cold in [6.0, 44.0, 85.0]:
            p = dict(DEFAULT, metric=metric, target=TARGETS[metric], cold=cold)
            r = run(p)
            out.append({'params': p, 'result': {k: v for k, v in r.items() if k != 'series'}, 'series_head': r['series'][:3]})
            print(metric, cold, {k: v for k, v in r.items() if k != 'series'})
    if len(sys.argv) > 1:
        json.dump(out, open(sys.argv[1], 'w'))
