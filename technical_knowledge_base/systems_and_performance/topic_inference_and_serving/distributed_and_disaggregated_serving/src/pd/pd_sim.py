"""Colocated against disaggregated serving on the root's Serving simulator (src/sim/sim.py, imported unchanged).

The root's running example: Llama 3.1 70B, FP8 weights, BF16 KV cache, on H200s. Step times use the simulator's
roofline with its NIM-fitted H100 efficiencies (calib_h100_optimistic_0.json: compute and memory efficiency, per-step and
per-sequence overhead), applied to the H200's peak and bandwidth; weights and the KV pool per GPU come from the Capacity
planner's setup() (src/plan/plan.py). For a fixed number of GPUs (each GPU one engine, TP 1), compare N colocated replicas (chunked prefill, round robin)
with every split xP + yD (x + y = N), at a range of Poisson arrival rates, and report SLO attainment (share of
requests meeting both TTFT and TPOT targets) and goodput (DistServe: the highest rate whose attainment >= 90%).
Usage: python3 -I pd_sim.py [quick]   writes out/pd_grid.json
"""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
SIM = os.path.join(HERE, '..', '..', '..', 'src', 'sim')
sys.path.insert(0, SIM)
import sim as S  # noqa: E402
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'src', 'plan'))
import plan as PL  # noqa: E402

CAL = json.load(open(os.path.join(SIM, 'out', 'calib_h100_optimistic_0.json')))
HW = dict(CAL['hw'])
CH = PL.CHIPS['h200']
HW['peak'], HW['bw'] = CH['peak']['fp8'] * 1e12, CH['bw'] * 1e9
PO = dict(PL.DEFAULT)  # running example: l70, h200, fp8 weights, kvb 2, tb 8192
SU = PL.setup(PO)
PM = PL.MODELS['l70']
M = dict(name='Llama 3.1 70B, FP8 weights, BF16 KV', L=PM['L'], nq=PM['nh'], hd=PM['dqk'], P=PM['P'], Pact=PM['P'] - PM['V'] * PM['h'],  # untied: every matmul except the input embedding lookup
        
         Plm=PM['V'] * PM['h'], wbytes=SU['w_gpu'], kvtok=SU['kv_tok'], wb=1, kvb=2)
ENG = dict(CAL['eng'])
ENG['nblocks'] = int(SU['pool'] // (SU['kv_tok'] * ENG['bs']))
ENG['budget'] = PO['tb']
QUICK = len(sys.argv) > 1 and sys.argv[1] == 'quick'
N_REQ = 400 if QUICK else 1200
NG = 8  # GPUs: one HGX H200 server
XBWS = {'nic400': 50e9, 'nic50': 6.25e9}  # KV transfer bytes/s: one 400 Gb/s NIC; a 50 Gb/s link
TTFTS = [0.5, 1.0, 2.0]
TPOTS = [0.025, 0.035, 0.05, 0.075]

WORKLOADS = {
    'chat': dict(name='Chat: 2,000-token prompts, 300-token answers', plo=1500, phi=2500, olo=200, ohi=400),
    'rag': dict(name='Long documents: 8,000-token prompts, 150-token answers', plo=6000, phi=10000, olo=100, ohi=200),
    'gen': dict(name='Short prompts, long answers: 300 in, 800 out', plo=200, phi=400, olo=600, ohi=1000),
}


def wl(w, rate, seed=11):
    return dict(n=N_REQ, rate=rate, plo=w['plo'], phi=w['phi'], olo=w['olo'], ohi=w['ohi'], maxtok=w['ohi'],
                sys=0, share=0, groups=1, turns=1, gap=0, seed=seed)


def one(w, rate, layout, xbw=50e9):
    cfg = dict(w=wl(w, rate), hw=HW, m=M, c=dict(ENG), slo=[TTFTS[-1], TPOTS[-1]], xbw=xbw)
    if layout[0] == 'co':
        cfg['reps'] = NG
    else:
        cfg['disagg'] = True
        cfg['np'], cfg['nd'] = layout[1], layout[2]
    reqs, engs, _ = S.run(cfg)
    skip = int(N_REQ * 0.1)
    mt = S.metrics(reqs, engs, cfg['slo'], skip=skip)
    pairs = []
    for q in reqs:
        if q['id'] < skip:
            continue
        if q.get('rej') or q['done'] < 0:
            pairs.append((1e9, 1e9))
            continue
        tp = (q['times'][-1] - q['first']) / (q['O'] - 1) if q['O'] > 1 else 0.0
        pairs.append((q['first'] - q['arr'], tp))
    # attainment for every (TTFT, TPOT) target pair: share of measured requests meeting both
    att = [[round(sum(1 for a, t in pairs if a <= A and t <= T) / len(pairs), 4) for T in TPOTS] for A in TTFTS]
    r = lambda x: float('%.5g' % x)
    return dict(att=att, ttft=[r(v) for v in mt['ttft'][:3]], tpot=[r(v) for v in mt['tpot'][:3]], tps=r(mt['tps']), rej=mt['rej'])


def main():
    layouts = [('co',)] + [('pd', x, NG - x) for x in range(1, NG)]
    out = dict(model=M['name'], hw='H200 SXM (peak and bandwidth) with the simulator efficiencies fitted on NVIDIA NIM H100 measurements (vendor)',
               gpus=NG, xbws=XBWS, n=N_REQ, ttfts=TTFTS, tpots=TPOTS, eng=ENG, kvtok=M['kvtok'], wbytes=M['wbytes'], workloads={})
    t0 = time.time()
    for wk, w in WORKLOADS.items():
        rates = {'chat': [2 * i for i in range(1, 17)], 'rag': [0.5 * i for i in range(1, 17)], 'gen': [4 * i for i in range(1, 17)]}[wk]
        res = {}
        for lay in layouts:
            for xk, xb in XBWS.items():
                if lay[0] == 'co' and xk != 'nic400':
                    continue
                key = 'co' if lay[0] == 'co' else '%dP%dD:%s' % (lay[1], lay[2], xk)
                res[key] = [one(w, rt, lay, xb) for rt in rates]
                print(wk, key, [x['att'][1][2] for x in res[key]], '%.0fs' % (time.time() - t0), flush=True)
        out['workloads'][wk] = dict(name=w['name'], rates=rates, res=res)
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, 'out', 'pd_grid%s.json' % ('_quick' if QUICK else '')), 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
