"""Every formula and simulation on the page, in Python, written line for line like parts/21_js_model.js.
recompute.py calls these and writes recompute_out.json; check_model.mjs runs the JS on the same inputs
and compares. Units: seconds unless a name says ms."""
import math


# ------------------------------------------------------------ random numbers (same as the root's sim)
class Mulberry32:
    def __init__(self, seed):
        self.a = seed & 0xffffffff

    def __call__(self):
        self.a = (self.a + 0x6D2B79F5) & 0xffffffff
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296


def expo(rnd, mean):
    return -mean * math.log(1 - rnd())


def service(rnd, dist, mean, cv):
    """One service time: exp (cv 1), const (cv 0), or lognormal with the given cv."""
    if dist == 'const':
        return mean
    if dist == 'exp':
        return expo(rnd, mean)
    s2 = math.log(1 + cv * cv)
    u1 = 1 - rnd()
    u2 = rnd()
    z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
    return math.exp(math.log(mean) - s2 / 2 + math.sqrt(s2) * z)


# ------------------------------------------------------------ percentiles and the tail at scale
def fanout(p, n):
    """Probability that a request fanning out to n servers waits for at least one slow one."""
    return 1 - (1 - p) ** n


def mean(xs):
    """Plain left-to-right sum (Python 3.12's sum() compensates rounding; JavaScript does not)."""
    s = 0.0
    for x in xs:
        s += x
    return s / len(xs)


def pct(sorted_xs, q):
    """Nearest-rank percentile of an ascending list."""
    k = max(0, min(len(sorted_xs) - 1, math.ceil(q * len(sorted_xs)) - 1))
    return sorted_xs[k]


# ------------------------------------------------------------ queueing formulas
def erlang_c(A, c):
    """Probability an arrival waits in M/M/c with offered load A = lam*S (the root's sim, same code)."""
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


def mmc(rho, c, S):
    """M/M/c with utilisation rho: probability of waiting, mean wait, mean time in system."""
    lam = rho * c / S
    if rho >= 1:
        return dict(C=1.0, Wq=float('inf'), W=float('inf'))
    C = erlang_c(lam * S, c)
    Wq = C / (c / S - lam)
    return dict(C=C, Wq=Wq, W=Wq + S)


def tail_sojourn(t, C, theta, nu):
    a = math.exp(-nu * t)
    if abs(theta - nu) < 1e-12 * max(theta, nu):
        h = math.exp(-nu * t) * (1 + nu * t)
    else:
        h = (nu * math.exp(-theta * t) - theta * math.exp(-nu * t)) / (nu - theta)
    return (1 - C) * a + C * h


def mmc_quantile(q, rho, c, S):
    """q-quantile of the time in system of M/M/c (exact; bisection like the root's sim)."""
    if rho >= 1:
        return float('inf')
    lam = rho * c / S
    C = erlang_c(lam * S, c)
    theta, nu = c / S - lam, 1 / S
    lo, hi = 0.0, 1.0 / nu + 1.0 / theta
    while tail_sojourn(hi, C, theta, nu) > 1 - q:
        hi *= 2
    for _ in range(100):
        mid = (lo + hi) / 2
        if tail_sojourn(mid, C, theta, nu) > 1 - q:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def kingman_wait(rho, ca2, cs2, S):
    """Kingman's approximation of the mean wait in a G/G/1 queue (exact for M/M/1 when ca2 = cs2 = 1)."""
    if rho >= 1:
        return float('inf')
    return rho / (1 - rho) * (ca2 + cs2) / 2 * S


def supermarket(lam, d):
    """Mitzenmacher's limit: mean time in system (in units of the mean service time) when each arrival
    joins the shorter of d queues chosen at random, n -> infinity, exponential service."""
    if d == 1:
        return 1 / (1 - lam)
    s, i = 0.0, 1
    while True:
        e = (d ** i - d) / (d - 1)
        term = lam ** e
        s += term
        if term < 1e-15 or i > 60:
            return s
        i += 1


# ------------------------------------------------------------ the load-balancing simulation (lab and animation)
def lb_sim(o):
    """n servers, one request at a time each, first come first served. Poisson arrivals at utilisation rho.
    Policies: random, rr (round robin), p2c (two random, fewer outstanding), lor (least outstanding,
    ties to the lowest index), shared (one shared queue: M/M/c when service is exponential).
    One server is `slow` times slower when slow > 1. Returns sojourn times (in units of the mean service
    time) of requests after the warm-up, and optionally the queue lengths seen at frame times."""
    n, rho, pol = o['n'], o['rho'], o['policy']
    N, warm = o['N'], o['warm']
    slow = o.get('slow', 1)
    cap = (n - 1) + 1 / slow                          # total service rate in requests per mean service time
    lam = rho * cap
    rnd = Mulberry32(o['seed'])                        # arrivals and service times: identical for every policy
    pick = Mulberry32(o['seed'] + 7919)                # the balancer's own coin flips
    deps = [[] for _ in range(n)]                      # departure times still in the future, per server
    free = [0.0] * n
    head = [0] * n
    rr = -1
    out = []
    frames = o.get('frames')
    fr = []
    fi = 0
    t = 0.0
    for j in range(N):
        t += expo(rnd, 1 / lam)
        s = service(rnd, o['dist'], 1.0, o.get('cv', 2.0))
        while frames is not None and fi < len(frames) and frames[fi] <= t:
            fr.append([sum(1 for x in deps[k][head[k]:] if x > frames[fi]) for k in range(n)])
            fi += 1
        for k in range(n):                               # forget requests that have left
            dk = deps[k]
            while head[k] < len(dk) and dk[head[k]] <= t:
                head[k] += 1
        if pol == 'random':
            k = int(pick() * n)
        elif pol == 'rr':
            rr = (rr + 1) % n
            k = rr
        elif pol == 'p2c':
            a = int(pick() * n)
            b = int(pick() * (n - 1))
            if b >= a:
                b += 1
            k = a if len(deps[a]) - head[a] <= len(deps[b]) - head[b] else b
        elif pol == 'lor':
            k, best = 0, len(deps[0]) - head[0]
            for i in range(1, n):
                q = len(deps[i]) - head[i]
                if q < best:
                    k, best = i, q
        else:                                            # shared queue: the server that frees up first
            k = 0
            for i in range(1, n):
                if free[i] < free[k]:
                    k = i
        if slow > 1 and k == 0:
            s *= slow
        start = t if free[k] < t else free[k]
        free[k] = start + s
        deps[k].append(free[k])
        if j >= warm:
            out.append(free[k] - t)
    return dict(soj=out, frames=fr)


def lb_summary(o):
    r = lb_sim(o)
    xs = sorted(r['soj'])
    return dict(p50=pct(xs, .5), p99=pct(xs, .99), p999=pct(xs, .999), mean=mean(xs))


# ------------------------------------------------------------ caching
def cache_backend(lam, h):
    return (1 - h) * lam


def cache_latency(h, hit_ms, miss_ms):
    """Mean latency of a cache-aside read: a hit costs the cache lookup, a miss the lookup plus the database."""
    return h * hit_ms + (1 - h) * (hit_ms + miss_ms)


def xfetch_early(delta, beta, u):
    """How long before expiry XFetch recomputes, for one uniform draw u in (0, 1]: -delta*beta*ln(u)."""
    return -delta * beta * math.log(u)


def stampede(mode, rate, recompute_s, horizon_s, seed, beta=1.0):
    """A hot key read `rate` times a second, expiring at t = 1 s; recomputing takes recompute_s.
    Returns the database queries made and each request's wait (seconds) in [0, horizon_s).
    none: every request that misses recomputes. coalesce: the first miss recomputes, the others wait
    for it. xfetch: each read before expiry recomputes early with XFetch's test; reads after a
    refresh started are served the old value (no wait); after expiry it is no better than none."""
    rnd = Mulberry32(seed)
    exp_at, ready_at = 1.0, None
    db, waits, starts = 0, [], []
    t, step = 0.0, 1.0 / rate
    pending = None                     # time the in-flight recompute finishes
    while t < horizon_s:
        if pending is not None and pending <= t:
            exp_at = pending + 10.0    # new value, fresh for 10 s
            pending = None
        if mode == 'xfetch' and t < exp_at:
            u = 1 - rnd()
            early = xfetch_early(recompute_s, beta, u)
            if pending is None and t + early >= exp_at:
                db += 1                # this reader recomputes now, before expiry; the others keep
                starts.append(t)       # reading the old value meanwhile
                pending = t + recompute_s
                waits.append(recompute_s)
            else:
                waits.append(0.0)
        elif t < exp_at:
            waits.append(0.0)
        elif mode == 'coalesce':
            if pending is None:
                db += 1
                starts.append(t)
                pending = t + recompute_s
            waits.append(pending - t)
        else:                          # none, or xfetch after expiry: every miss recomputes
            db += 1
            starts.append(t)
            waits.append(recompute_s)
            if pending is None or t + recompute_s < pending:
                pending = t + recompute_s
        t = math.floor((t + step) * 1e9 + 0.5) / 1e9   # like JavaScript Math.round
    return dict(db=db, waits=waits, starts=starts)


# ------------------------------------------------------------ capacity planning
def plan(o):
    """Servers needed: forecast the average, apply the peak factor, divide by what one server may carry
    at the target utilisation, round up, add k spares (N+k)."""
    avg = o['avg_now'] * (1 + o['growth']) ** o['months']
    peak = avg * o['peak_factor']
    per = o['per_server'] * o['target_util']
    need = math.ceil(peak / per - 1e-9)
    total = need + o['spares']
    cost = total * o['price_h'] * 730
    return dict(avg=avg, peak=peak, per=per, need=need, total=total, cost=cost,
                util_peak=peak / (total * o['per_server']), util_avg=avg / (total * o['per_server']),
                util_peak_one_down=peak / ((total - 1) * o['per_server']) if total > 1 else float('inf'))


def pool_size(qps, hold_s):
    """Little's law for a connection pool: connections busy on average = throughput x hold time."""
    return qps * hold_s
