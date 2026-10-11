"""Expert-parallel load balance on real routing counts (out/counts.json from route.py), with DeepSeek's eplb.py unchanged.

History = the first half of the windows (the balancer's estimate of expert load), traffic = the second half.
For G GPUs and R redundant experts (32 + R physical experts, a multiple of G):
  naive: expert e on GPU e // (32 / G) (R = 0, the default placement in engines without a balancer);
  eplb : eplb.rebalance_experts(history, 32 + R, num_groups=1, num_nodes=1, num_gpus=G) (the global policy);
a replicated expert's tokens are split evenly over its replicas. Imbalance = max GPU load / mean GPU load, per layer,
for each traffic window (one batch of 512 tokens) and for all traffic summed.
Writes out/balance.json (results plus every plan, which check_ep.mjs compares with the page's JavaScript port).
usage: python balance.py COUNTS_JSON OUT_JSON
"""
import json, sys
import torch
import eplb

c = json.load(open(sys.argv[1]))
cnt = torch.tensor(c['counts'], dtype=torch.float64)  # [W, L, E]
W, L, E = cnt.shape
hist, traf = cnt[:W // 2].sum(0), cnt[W // 2:]


def loads(plan_gpu, plan_log, logcnt, x):
    """x: [L, E] token counts -> [L, G] GPU loads."""
    G = int(plan_gpu.max()) + 1
    out = torch.zeros(L, G, dtype=torch.float64)
    for l in range(L):
        share = x[l] / logcnt[l]
        for p in range(plan_log.shape[1]):
            out[l, plan_gpu[p]] += share[plan_log[l, p]]
    return out


def imb(ld):
    return (ld.max(-1).values / ld.mean(-1))


res = []
plans = []
for G in (4, 8):
    for R in (0, G, 2 * G):
        Pn = E + R
        per = Pn // G
        gpu_of = torch.arange(Pn) // per
        phy2log, log2phy, logcnt = eplb.rebalance_experts(hist, Pn, 1, 1, G)
        plans.append(dict(G=G, R=R, phy2log=phy2log.tolist(), logcnt=logcnt.tolist()))
        for kind, lg, lc in ((('naive', torch.arange(E).repeat(L, 1), torch.ones(L, E, dtype=torch.int64)),) if R == 0 else ()) + \
                (('eplb', phy2log, logcnt),):
            per_w = torch.stack([imb(loads(gpu_of, lg, lc, traf[w])) for w in range(traf.shape[0])])  # [Wt, L]
            tot = imb(loads(gpu_of, lg, lc, traf.sum(0)))  # [L]
            hst = imb(loads(gpu_of, lg, lc, hist))
            res.append(dict(G=G, R=R, kind=kind, batch_mean=round(per_w.mean().item(), 4), batch_p90=round(per_w.flatten().quantile(0.9).item(), 4),
                            all_mean=round(tot.mean().item(), 4), all_max=round(tot.max().item(), 4), hist_mean=round(hst.mean().item(), 4),
                            per_layer_batch=[round(v, 4) for v in per_w.mean(0).tolist()]))
res = [r for r in res if r]
# expert popularity: share of all routed tokens taken by the busiest expert, per layer (uniform = 1/32)
share = (cnt.sum(0) / cnt.sum(0).sum(-1, keepdim=True))
top = share.max(-1).values
json.dump(dict(model=c['model'], E=E, L=L, K=c['K'], W=W, window=c['window'], hist=hist.long().tolist(),
               traffic_windows=traf[:8].long().tolist(), traffic_sum=traf.sum(0).long().tolist(),
               top_share=[round(v, 4) for v in top.tolist()], results=res, plans=plans), open(sys.argv[2], 'w'))
for r in res:
    print(r['G'], r['R'], r['kind'], r['batch_mean'], r['batch_p90'], r['all_mean'], r['hist_mean'])
print('top expert share per layer: min %.3f max %.3f (uniform %.3f)' % (top.min(), top.max(), 1 / E))
