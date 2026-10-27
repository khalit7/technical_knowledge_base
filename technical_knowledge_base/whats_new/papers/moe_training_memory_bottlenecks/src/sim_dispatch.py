"""Replay PipelinedLLEP's chunk membership on the paper's own synthetic routing profiles (Appendix B.2)
with LLEP's released assignment plan, and measure the per-chunk send ratio of Table 8.

  python3 sim_dispatch.py            -> prints a report, writes inputs/sim_dispatch.json

What is the paper's and what is ours:
- Routing profiles r/h: exactly as defined in Appendix B.2 (hot positions first, hot tokens cycle over the
  hot set, cold tokens walk the cold set, balanced = (i + j) mod E). Every rank routes identically, since
  B.2 defines the profile by position only.
- LLEP plan: a line-by-line port of compute_llep_lpt_plan and llep_lpt_plan_to_compute_ranks from
  github.com/SalesforceAIResearch/LeastLoadedEP (llep/gpt_oss_llep.py, Apache-2.0). The paper does not say
  which plan settings it used. With the file's default capacity factor (max_tokens_factor 1.1) the send ratios
  do not match Table 8; with factor 1.0 (each rank capped at exactly the mean load) all six of Table 8's send
  ratios and the 12.5% / 17.1% fractions of the bound come out to the printed precision, so 1.0 is the default
  here and both are reported. min_tokens_per_gemm stays at the file's 1024 (it does not change the result).
- Chunk membership: contiguous = positions [i c, (i + 1) c); strided = {i, i + K, i + 2K, ...} (Section 3.1, B.1).
- Send ratio: per chunk and per sending rank, the largest send to one destination over the mean send per
  destination; the maximum over chunks and ranks (Table 8's caption, read literally).
The paper's own PipelinedLLEP code is not released, so this is a reimplementation, not a rerun.
"""
import json, os
import numpy as np

FACTOR = 1.0
HERE = os.path.dirname(os.path.abspath(__file__))


def routes(profile, N, E, k):
    """(N, k) expert ids for one rank, Appendix B.2."""
    i = np.arange(N)[:, None]; j = np.arange(k)[None, :]
    if profile == 'balanced':
        return (i + j) % E
    r, h = profile
    hot = int(np.floor(r * N))
    R = np.empty((N, k), dtype=np.int64)
    R[:hot] = (np.arange(k) % h)[None, :]
    R[hot:] = h + ((i[hot:] + j) % (E - h))
    return R


def llep_plan(counts, ep, nloc, factor=FACTOR, min_gemm=1024):
    """Port of compute_llep_lpt_plan: expert -> [(gpu, start, end)] over the expert's global token list."""
    E = len(counts); total = int(counts.sum())
    maxt = max(int(factor * (total // ep)), 1)
    pend = [0] * ep
    for e in range(E): pend[e // nloc] += int(counts[e])
    asg = [0] * ep; plan = {}
    for e, n in sorted([(e, int(counts[e])) for e in range(E)], key=lambda x: -x[1]):
        if n == 0: continue
        g0 = e // nloc; pend[g0] -= n
        eff = lambda g: asg[g] + pend[g]
        avail = maxt - eff(g0); a = []
        if avail >= n:
            a.append((g0, 0, n)); asg[g0] += n
        elif avail > 0:
            a.append((g0, 0, avail)); asg[g0] += avail; rem = n - avail; off = avail
            while rem > 0:
                oth = sorted([(g, eff(g), maxt - eff(g)) for g in range(ep) if g != g0], key=lambda x: x[1])
                done = False
                for g, _, av in oth:
                    if av <= 0: continue
                    ch = min(rem, av)
                    if ch < min_gemm and rem > ch: continue
                    a.append((g, off, off + ch)); asg[g] += ch; off += ch; rem -= ch; done = True; break
                if not done:
                    g = oth[0][0]; a.append((g, off, off + rem)); asg[g] += rem; rem = 0
        else:
            oth = sorted([(g, eff(g), maxt - eff(g)) for g in range(ep) if g != g0], key=lambda x: x[1])
            rem = n; off = 0
            for g, _, av in oth:
                if rem <= 0: break
                if av <= 0: continue
                ch = min(rem, av)
                if ch < min_gemm and rem > ch: continue
                a.append((g, off, off + ch)); asg[g] += ch; off += ch; rem -= ch
            if rem > 0:
                g = oth[0][0]; a.append((g, off, off + rem)); asg[g] += rem
        plan[e] = a
    return plan, asg


def destinations(R, rank, ep, nloc, plan, E):
    """Destination rank of every route (token, slot) of one rank, port of llep_lpt_plan_to_compute_ranks."""
    N, k = R.shape
    flat = R.reshape(-1)
    dest = flat // nloc
    cnt = np.bincount(flat, minlength=E)
    goff = cnt * rank  # every rank routes identically, so ranks 0..r-1 hold rank * cnt tokens of each expert
    order = np.argsort(flat, kind='stable')  # within an expert, ascending flat index (token, slot)
    starts = np.concatenate([[0], np.cumsum(cnt)])
    for e, a in plan.items():
        if len(a) == 1:
            dest[order[starts[e]:starts[e + 1]]] = a[0][0]; continue
        pos = goff[e] + np.arange(cnt[e])
        idx = order[starts[e]:starts[e + 1]]
        for g, s, t in a:
            m = (pos >= s) & (pos < t)
            dest[idx[m]] = g
    return dest.reshape(N, k)


def chunk_sends(D, K, c, ep, strided):
    N = D.shape[0]
    out = []
    for i in range(K):
        tok = np.arange(i, N, K) if strided else np.arange(i * c, min(N, (i + 1) * c))
        out.append(np.bincount(D[tok].reshape(-1), minlength=ep))
    return np.array(out)  # (K, ep)


def run(profile, N=65536, E=128, k=8, ep=8, K=10):
    nloc = E // ep
    R = routes(profile, N, E, k)
    counts = np.bincount(R.reshape(-1), minlength=E) * ep
    plan, loads = llep_plan(counts, ep, nloc, FACTOR)
    c = -(-N // K)
    res = {}
    for name, strided in (('strided', True), ('contiguous', False)):
        worst = 0; worst_recv = 0
        recv = np.zeros((K, ep))
        for rank in range(ep):
            D = destinations(R, rank, ep, nloc, plan, E)
            S = chunk_sends(D, K, c, ep, strided)
            recv += S
            ratio = (S.max(1) / (S.sum(1) / ep)).max()
            worst = max(worst, ratio)
        bound = ep * k * c
        res[name] = {'send_ratio': round(float(worst), 3), 'max_recv_frac_of_bound': round(float(recv.max() / bound), 4)}
    res['gpu_loads_over_mean'] = round(max(loads) / (sum(loads) / ep), 3)
    res['std_ep_load_over_mean'] = round(float(counts.reshape(ep, nloc).sum(1).max() / (counts.sum() / ep)), 3)
    return res


PROFILES = (('balanced', 'Balanced'), ((.95, 16), '95% / 16'), ((.80, 16), '80% / 16'), ((.50, 4), '50% / 4'),
            ((.30, 16), '30% / 16'), ((.50, 16), '50% / 16'), ((.30, 4), '30% / 4'))

if __name__ == '__main__':
    out = {}
    for f in (1.0, 1.1):
        FACTOR = f
        out['factor_%.1f' % f] = {lab: run(p) for p, lab in PROFILES}
        print('factor', f); [print(' ', k, v) for k, v in out['factor_%.1f' % f].items()]
    json.dump(out, open(os.path.join(HERE, 'inputs', 'sim_dispatch.json'), 'w'), indent=1)
    raise SystemExit
    for p, lab in (('balanced', 'Balanced'), ((.95, 16), '95% / 16'), ((.80, 16), '80% / 16'), ((.50, 4), '50% / 4'),
                   ((.30, 16), '30% / 16'), ((.50, 16), '50% / 16'), ((.30, 4), '30% / 4')):
        out[lab] = run(p)
        print(lab, out[lab])
    json.dump(out, open(os.path.join(HERE, 'inputs', 'sim_dispatch.json'), 'w'), indent=1)
