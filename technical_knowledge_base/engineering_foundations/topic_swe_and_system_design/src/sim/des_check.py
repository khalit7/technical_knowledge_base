"""Check the queueing maths of the Scale simulator against a discrete-event simulation.

1. Erlang C (probability of waiting), mean wait and p99 time in system for M/M/c, against a
   first-come-first-served simulation of the same queue (exact algorithm: each arrival takes the
   server that frees up first).
2. The same formulas when service is NOT exponential (the GPU slot: fixed prefill plus a fixed
   decode time): how far M/M/c is from M/D/c and M/G/c, i.e. how conservative the page is.
3. A line of two queues (app server then database): end-to-end p99 from the page's method
   (independent stations, Monte Carlo) against simulating the line itself.
Writes des_check.json. Run: python3 des_check.py (about a minute).
"""
import heapq, json, math, os, random
import model as M

random.seed(7)


def sim_mmc(lam, c, sample_service, n=400000, warm=20000):
    free = [0.0] * c
    heapq.heapify(free)
    t = 0.0
    waits, soj = [], []
    for i in range(n):
        t += random.expovariate(lam)
        f = heapq.heappop(free)
        start = max(t, f)
        s = sample_service()
        heapq.heappush(free, start + s)
        if i >= warm:
            waits.append(start - t)
            soj.append(start - t + s)
    k = len(waits)
    soj.sort()
    return dict(p_wait=sum(1 for w in waits if w > 1e-12) / k, mean_wait=sum(waits) / k,
                p50=soj[int(0.5 * k)], p99=soj[int(0.99 * k)])


def formula(lam, c, S):
    st = M.station(lam, c, S)
    nu = 1 / S
    return dict(p_wait=st['C'], mean_wait=st['Wq'], p50=M.quantile_sojourn(0.5, st['C'], st['theta'], nu),
                p99=M.quantile_sojourn(0.99, st['C'], st['theta'], nu))


out = {'mmc': [], 'non_exponential': [], 'tandem': None}
for c, rho, S in [(1, 0.5, 0.01), (1, 0.9, 0.01), (4, 0.8, 0.005), (8, 0.95, 0.002), (64, 0.9, 1.0)]:
    lam = rho * c / S
    f = formula(lam, c, S)
    s = sim_mmc(lam, c, lambda: random.expovariate(1 / S))
    out['mmc'].append(dict(c=c, rho=rho, S=S, formula=f, sim=s))
    print('M/M/%d rho %.2f' % (c, rho), {k: (round(f[k], 5), round(s[k], 5)) for k in f})

# GPU-like slot: service = prefill + decode, both fixed (M/D/c), at the page's default replica
st = dict(M.BASE, users=1e5, gpu_r=2)
g = M.gpu_consts(st)
B, pf, a, b, osl = g['B'], g['pf'], g['a'], g['b'], st['osl']
S = B * pf + osl * (a + b * B)
for rho in [0.7, 0.9, 0.97]:
    c = 2 * B
    lam = rho * c / S
    f = formula(lam, c, S)
    s_det = sim_mmc(lam, c, lambda: S, n=300000)
    s_var = sim_mmc(lam, c, lambda: pf * B + random.uniform(0.5, 1.5) * (S - pf * B), n=300000)
    out['non_exponential'].append(dict(c=c, rho=rho, S=S, formula=f, sim_deterministic=s_det, sim_uniform_decode=s_var))
    print('GPU c=%d rho %.2f' % (c, rho), 'P(wait) M/M/c %.3f  M/D/c %.3f  M/G/c %.3f' % (f['p_wait'], s_det['p_wait'], s_var['p_wait']),
          'mean wait %.3f %.3f %.3f' % (f['mean_wait'], s_det['mean_wait'], s_var['mean_wait']))

# tandem: app (M/M/4) then DB (M/M/2), exponential services, FIFO
lam, S1, c1, S2, c2 = 600.0, 0.005, 4, 0.0015, 2
n, warm = 400000, 20000
# station 1 in arrival order, then station 2 in order of arrival AT station 2 (a multi-server
# station can finish customers out of order, so the second pass must be sorted)
f1 = [0.0] * c1
t, recs = 0.0, []
for i in range(n):
    t += random.expovariate(lam)
    f = heapq.heappop(f1); st1 = max(t, f); d1 = st1 + random.expovariate(1 / S1); heapq.heappush(f1, d1)
    recs.append((d1, t, i))
recs.sort()
f2 = [0.0] * c2
e2e = []
for d1, t0, i in recs:
    f = heapq.heappop(f2); st2 = max(d1, f); d2 = st2 + random.expovariate(1 / S2); heapq.heappush(f2, d2)
    if i >= warm:
        e2e.append(d2 - t0)
e2e.sort()
k = len(e2e)
a1, a2 = M.station(lam, c1, S1), M.station(lam, c2, S2)
rnd = M.Mulberry32(12345)
mc = []
for _ in range(20000):
    x = 0.0
    for q, Sx in ((a1, S1), (a2, S2)):
        u1, u2, u3 = rnd(), rnd(), rnd()
        x += (-math.log(1 - u2) / q['theta'] if u1 < q['C'] else 0.0) - math.log(1 - u3) * Sx
    mc.append(x)
mc.sort()
out['tandem'] = dict(lam=lam, stations=[[c1, S1], [c2, S2]], sim_p50=e2e[int(0.5 * k)], sim_p99=e2e[int(0.99 * k)],
                     page_p50=mc[10000], page_p99=mc[19800])
print('tandem', out['tandem'])
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'des_check.json'), 'w'), indent=1)
