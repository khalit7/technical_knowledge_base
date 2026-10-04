"""The Scale simulator's model, in Python, written line for line like parts/31_js_sim_model.js.

Every component is a queue: arrivals at rate lam (requests per second), c servers (CPU cores,
GPU batch slots), each serving one request in a mean time S. Utilisation rho = lam * S / c.
Waiting uses M/M/c (Poisson arrivals, exponential service, c servers, first come first served),
whose probability of waiting is Erlang C. End-to-end latency is sampled by Monte Carlo from the
exact M/M/c sojourn distribution of every component on the path, treating components as
independent (exact for a line of M/M/1 queues by Burke's and Reich's theorems; an approximation
otherwise). The random numbers come from mulberry32 so Python and JS draw identical samples.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'defaults.json')))


def v(x):
    return x['v'] if isinstance(x, dict) else x


# ---------------------------------------------------------------- queueing maths
def erlang_c(A, c):
    """Probability an arrival waits in M/M/c with offered load A = lam*S (in servers)."""
    if c <= 0:
        return 1.0
    if A <= 0:
        return 0.0
    if A >= c:
        return 1.0
    B = 1.0
    for k in range(1, c + 1):
        B = A * B / (k + A * B)
    rho = A / c
    return B / (1 - rho * (1 - B))


def tail_sojourn(t, C, theta, nu):
    """P(W + S > t): W is 0 w.p. 1-C, else Exp(theta); S ~ Exp(nu)."""
    a = math.exp(-nu * t)
    if abs(theta - nu) < 1e-12 * max(theta, nu):
        h = math.exp(-nu * t) * (1 + nu * t)
    else:
        h = (nu * math.exp(-theta * t) - theta * math.exp(-nu * t)) / (nu - theta)
    return (1 - C) * a + C * h


def quantile_sojourn(q, C, theta, nu):
    lo, hi = 0.0, 1.0 / nu + (1.0 / theta if theta > 0 else 0)
    while tail_sojourn(hi, C, theta, nu) > 1 - q:
        hi *= 2
    for _ in range(100):
        mid = (lo + hi) / 2
        if tail_sojourn(mid, C, theta, nu) > 1 - q:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


_FAST = [False]


def station(lam, c, S):
    """M/M/c summary. S = mean service time of one request. In fast mode (utilisation only) Erlang C is skipped."""
    A = lam * S
    rho = A / c if c > 0 else float('inf')
    if lam <= 0:
        return dict(lam=0.0, c=c, S=S, rho=0.0, C=0.0, theta=c / S, Wq=0.0, W=S, L=0.0, Lq=0.0)
    if rho >= 1:
        return dict(lam=lam, c=c, S=S, rho=rho, C=1.0, theta=0.0, Wq=float('inf'), W=float('inf'), L=float('inf'), Lq=float('inf'))
    if _FAST[0]:
        return dict(lam=lam, c=c, S=S, rho=rho, C=0.0, theta=c / S - lam, Wq=0.0, W=S, L=lam * S, Lq=0.0)
    C = erlang_c(A, c)
    theta = c / S - lam
    Wq = C / theta
    W = Wq + S
    return dict(lam=lam, c=c, S=S, rho=rho, C=C, theta=theta, Wq=Wq, W=W, L=lam * W, Lq=lam * Wq)


# ---------------------------------------------------------------- random numbers (same as JS)
class Mulberry32:
    def __init__(self, seed):
        self.a = seed & 0xffffffff

    def __call__(self):
        self.a = (self.a + 0x6D2B79F5) & 0xffffffff
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296


# ---------------------------------------------------------------- the product
def gpu_consts(st):
    g = D['gpu']
    isl, osl, B = st['isl'], st['osl'], st['batch']
    n = g['gpus_per_replica']
    a = (g['weight_bytes'] / n) / g['hbm_bw']                     # s per decode step to read the weights
    kv_tok = 2 * g['layers'] * g['kv_heads'] * g['head_dim'] * g['kv_bytes']
    kv_avail = v(g['kv_mem_fraction']) * (n * g['hbm_bytes'] - g['weight_bytes'])
    bmax = int(kv_avail // (kv_tok * (isl + osl)))
    flops = n * g['fp8_dense_flops'] * v(g['prefill_mfu'])
    pf = 2 * g['params'] * isl / flops                              # s of whole-replica time per prefill
    # b: fitted so that at ISL/OSL 1000/1000 and the memory-limited batch the replica makes the published tokens/s
    pf0 = 2 * g['params'] * 1000 / flops
    bmax0 = int(kv_avail // (kv_tok * 2000))
    tps0 = n * v(g['published_tps_per_gpu'])
    b = 1.0 / tps0 - pf0 / 1000 - a / bmax0
    Bc = max(1, min(B, bmax))
    return dict(a=a, b=b, pf=pf, bmax=bmax, kv_tok=kv_tok, kv_avail=kv_avail, B=Bc, pf0=pf0, bmax0=bmax0, tps0=tps0)


def rates(st):
    w = D['workload']
    U = st['users']
    msg_avg = U * v(w['msgs_per_user_day']) / 86400
    msg = msg_avg * st.get('peak', v(w['peak_factor']))
    req = msg * (1 + v(w['api_per_msg']))
    return dict(msg_avg=msg_avg, msg=msg, req=req, reads=req * v(w['reads_per_req']),
                writes=msg * v(w['writes_per_msg']), jobs=msg * v(w['jobs_per_msg']),
                jobs_avg=msg_avg * v(w['jobs_per_msg']))


def evaluate(st, mc=True, N=20000, seed=12345):
    _FAST[0] = not mc
    try:
        return _evaluate(st, mc, N, seed)
    finally:
        _FAST[0] = False


def _evaluate(st, mc, N, seed):
    w, ap, db, ca, g = D['workload'], D['app'], D['db'], D['cache'], D['gpu']
    r = rates(st)
    U = st['users']
    out = dict(rates=r)
    # app tier
    job_cpu = v(w['job_cpu_s'])
    extra_msg = v(w['jobs_per_msg']) * (v(ap['enqueue_cpu_s']) if st['async'] else job_cpu)
    s_app = v(ap['cpu_per_req_s'])
    S_app = s_app + r['msg'] * extra_msg / r['req'] if r['req'] > 0 else s_app
    app = station(r['req'] / st['app_n'], ap['vcpu'], S_app)
    app['s_msg'] = s_app + extra_msg
    # cache
    K = st['cache_n']
    h = st['hit'] if K > 0 else 0.0
    miss = r['reads'] * (1 - h)
    if K > 0:
        ops = r['reads'] + miss + r['writes']
        cache = station(ops / K, 1, 1.0 / v(ca['ops_per_s']))
    else:
        cache = None
    # database
    S, R = st['shards'], st['replicas']
    vc = db['sizes'][st['db_size']][1]
    if st['idx']:
        s_read = v(db['read_cpu_s'])
    else:
        s_read = v(db['rows_per_user']) * U / S / v(db['scan_rows_per_s'])
    s_write, s_apply = v(db['write_cpu_s']), v(db['replica_apply_cpu_s'])
    rd, wr = miss / S, r['writes'] / S

    def mix(lr, lw, sw):
        lam = lr + lw
        return station(lam, vc, (lr * s_read + lw * sw) / lam if lam > 0 else s_read)
    if R == 0:
        prim = mix(rd, wr, s_write)
        rep = None
        read_node = prim
    else:
        prim = mix(0.0, wr, s_write)
        rep = mix(rd / R, wr, s_apply)
        read_node = rep
    read_node_sread = s_read
    # queue and workers
    if st['async']:
        cw = st['workers_n'] * D['workers']['vcpu']
        work = station(r['jobs'], cw, job_cpu)
        work['rho_avg'] = r['jobs_avg'] * job_cpu / cw
    else:
        work = None
    # GPU pool
    gc = gpu_consts(st)
    Bc, a, b, pf, osl = gc['B'], gc['a'], gc['b'], gc['pf'], st['osl']
    Sslot = Bc * pf + osl * (a + b * Bc)
    mu_rep = Bc / Sslot
    gpu = station(r['msg'], st['gpu_r'] * Bc, Sslot)
    lam_rep = r['msg'] / st['gpu_r']
    den = 1 - lam_rep * (pf + osl * b)
    n_eff = Bc if den <= 0 else min(Bc, max(1.0, lam_rep * osl * a / den))
    d_eff = (n_eff - 1) * pf + osl * (a + b * n_eff)
    gpu.update(mu_rep=mu_rep, tps_rep=mu_rep * osl, n_eff=n_eff, d_eff=d_eff, pf=pf,
               speed=osl / d_eff, bmax=gc['bmax'], B=Bc, kv_used=n_eff * gc['kv_tok'] * (st['isl'] + osl))
    out.update(app=app, cache=cache, prim=prim, rep=rep, work=work, gpu=gpu, gc=gc, s_read=s_read)
    # cost per month
    H = D['hours_per_month']
    cost = dict(
        app=st['app_n'] * ap['price_h'] * H,
        lb=(D['lb']['price_h'] + r['msg_avg'] * (1 + v(w['api_per_msg'])) / D['lb']['new_conn_per_lcu'] * D['lb']['lcu_h']) * H if st['app_n'] > 1 else 0.0,
        db=S * (1 + R) * vc * db['price_per_vcpu_h'] * H,
        cache=K * ca['price_h'] * H,
        workers=(st['workers_n'] * D['workers']['price_h'] * H) if st['async'] else 0.0,
        queue=(max(0.0, r['jobs_avg'] * D['queue']['calls_per_job'] * H * 3600 / 1e6 - D['queue']['free_million']) * D['queue']['price_per_million']) if st['async'] else 0.0,
        gpu=st['gpu_r'] * g['gpus_per_replica'] * v(g['price_gpu_h']) * H)
    cost['total'] = sum(cost.values())
    out['cost'] = cost
    # utilisation list (the bars)
    comps = [('app', app), ('cache', cache), ('prim', prim), ('rep', rep), ('work', work), ('gpu', gpu)]
    out['rho'] = {k: (x['rho'] if x else None) for k, x in comps}
    if not mc:
        return out
    # end-to-end latency for one chat message, by Monte Carlo
    path = [app, prim, gpu] + ([cache] if cache else []) + [read_node]
    if any(x['rho'] >= 1 for x in path):
        out['lat'] = dict(ttft50=float('inf'), ttft99=float('inf'), rep50=float('inf'), rep99=float('inf'))
        return out
    rnd = Mulberry32(seed)
    nr = v(w['reads_per_req'])
    tt, rp = [], []
    for _ in range(N):
        t = 0.0
        u1, u2, u3 = rnd(), rnd(), rnd()
        t += (-math.log(1 - u2) / app['theta'] if u1 < app['C'] else 0.0) - math.log(1 - u3) * app['s_msg']
        for _k in range(nr):
            u1, u2, u3, u4, u5, u6, u7 = rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()
            if cache:
                t += (-math.log(1 - u2) / cache['theta'] if u1 < cache['C'] else 0.0) - math.log(1 - u3) * cache['S']
            if u4 >= h:
                t += (-math.log(1 - u6) / read_node['theta'] if u5 < read_node['C'] else 0.0) - math.log(1 - u7) * read_node_sread
        u1, u2, u3 = rnd(), rnd(), rnd()
        t += (-math.log(1 - u2) / prim['theta'] if u1 < prim['C'] else 0.0) - math.log(1 - u3) * s_write
        u1, u2, u3 = rnd(), rnd(), rnd()
        t += (-math.log(1 - u2) / gpu['theta'] if u1 < gpu['C'] else 0.0) + pf
        tt.append(t)
        rp.append(t + d_eff)
    tt.sort(); rp.sort()
    i50, i99 = int(0.5 * N), int(0.99 * N)
    out['lat'] = dict(ttft50=tt[i50], ttft99=tt[i99], rep50=rp[i50], rep99=rp[i99])
    return out


BASE = dict(users=1, peak=v(D['workload']['peak_factor']), app_n=1, idx=True, db_size=0, replicas=0, shards=1, cache_n=0, hit=0.9,
            **{'async': False}, workers_n=1, gpu_r=1, batch=64, isl=1000, osl=400)


# ---------------------------------------------------------------- the suggested fix (same rules as JS)
HOT, TARGET = 0.7, 0.6
NAMES = dict(app='App servers', cache='Cache', prim='DB primary', rep='DB read replicas', work='Queue workers', gpu='GPU pool')


def hot_value(o, k):
    x = o[k] if k in ('app', 'cache', 'prim', 'rep', 'work', 'gpu') else None
    if x is None:
        return -1.0
    return x['rho_avg'] if k == 'work' else x['rho']


def smallest(st, key, vals, comp):
    """First value of knob `key` that brings component `comp` to TARGET or below; else the last value."""
    for x in vals:
        s2 = dict(st, **{key: x})
        if hot_value(evaluate(s2, mc=False), comp) <= TARGET:
            return x
    return vals[-1]


def smallest_gallop(st, key, a, b, comp):
    """Smallest x in [a, b) with the component at TARGET or below, assuming more of `key` only helps;
    gallops then bisects, so it is fast for thousands of replicas. Returns b - 1 if none."""
    ok = lambda x: hot_value(evaluate(dict(st, **{key: x}), mc=False), comp) <= TARGET
    if ok(a):
        return a
    lo, step = a, 1
    while True:
        hi = lo + step
        if hi >= b - 1:
            hi = b - 1
            if not ok(hi):
                return b - 1
            break
        if ok(hi):
            break
        lo, step = hi, step * 2
    while hi - lo > 1:
        m = (lo + hi) // 2
        if ok(m):
            hi = m
        else:
            lo = m
    return hi


def suggest_fix(st):
    o = evaluate(st, mc=False)
    ks = ['app', 'cache', 'prim', 'rep', 'work', 'gpu']
    k = max(ks, key=lambda q: hot_value(o, q))
    r = hot_value(o, k)
    if r < HOT:
        if st['app_n'] == 1:
            return dict(st, app_n=2), 'avail', None
        return None, 'none', None
    if k == 'app':
        a = o['rates']
        job_share = a['msg'] * D['workload']['jobs_per_msg']['v'] * D['workload']['job_cpu_s']['v'] / (a['req'] * o['app']['S'])
        if not st['async'] and job_share > 0.3:
            s2 = dict(st, **{'async': True})
            n = smallest_gallop(s2, 'workers_n', 1, 5001, 'work')
            return dict(s2, workers_n=n), 'async', k
        return dict(st, app_n=smallest_gallop(st, 'app_n', st['app_n'] + 1, 20001, 'app')), 'app_n', k
    if k == 'cache':
        return dict(st, cache_n=smallest_gallop(st, 'cache_n', st['cache_n'] + 1, 1025, 'cache')), 'cache_n', k
    if k == 'work':
        return dict(st, workers_n=smallest_gallop(st, 'workers_n', st['workers_n'] + 1, 20001, 'work')), 'workers_n', k
    if k == 'gpu':
        return dict(st, gpu_r=smallest_gallop(st, 'gpu_r', st['gpu_r'] + 1, 100001, 'gpu')), 'gpu_r', k
    # database
    if not st['idx']:
        return dict(st, idx=True), 'idx', k
    x = o[k]
    read_cpu = (x['lam'] * x['S'] - (o['rates']['writes'] / st['shards']) * (D['db']['write_cpu_s']['v'] if k == 'prim' else D['db']['replica_apply_cpu_s']['v']))
    read_share = read_cpu / (x['lam'] * x['S'])
    if read_share > 0.5:
        if st['cache_n'] == 0:
            s2 = dict(st, cache_n=1)
            return dict(s2, cache_n=smallest_gallop(s2, 'cache_n', 1, 1025, 'cache')), 'cache', k
        if st['replicas'] < 5:
            s2 = dict(st, replicas=max(1, st['replicas']))
            return dict(st, replicas=smallest(st, 'replicas', list(range(max(1, st['replicas'] + 1), 6)), 'rep')), 'replicas', k
    if st['db_size'] < 4:
        s2 = dict(st, db_size=smallest(st, 'db_size', list(range(st['db_size'] + 1, 5)), k))
        if hot_value(evaluate(s2, mc=False), k) <= TARGET:
            return s2, 'db_size', k
    sh = [2 ** i for i in range(1, 11) if 2 ** i > st['shards']]
    return dict(st, shards=smallest(st, 'shards', sh, k)), 'shards', k


def fix_until_calm(st, limit=20):
    steps = []
    for _ in range(limit):
        s2, what, comp = suggest_fix(st)
        if s2 is None or what == 'avail' and st['app_n'] > 1:
            break
        steps.append((what, comp))
        st = s2
        if what == 'avail':
            continue
    return st, steps
