"""Fit the planner's two engine constants (compute efficiency eff_c and fixed overhead per step tovh) to MLPerf
Inference v5.1 runs of Llama 3.1 8B whose settings are public, and check the fit on what was not fitted.

For each run: eff_c is solved so the fluid limit's offline throughput equals the published Offline result, for
each candidate tovh; tovh is then chosen so the simulated mean TPOT at the Server run's published arrival rate
equals the measured one. Not fitted, and therefore checks: the Server throughput inside the 2 s / 100 ms targets,
the measured TTFT p50 and p99, a different submitter's single-H200 run, and the H100 constants applied to the
other GPUs. Writes out/calib.json."""
import json, os
from plan import *

H = os.path.dirname(os.path.abspath(__file__))
PUB = dict(h100_off=5777.08, h100_srv=5103.99, h100_srv_qps=39.56, h100_tpot_mean=23.113, h100_tpot_p99=25.129,
           h100_ttft_p50=223.6, h100_ttft_p99=1911.2,
           l40s_off=1642.22, l40s_srv=1207.14, l40s_srv_qps=9.36, l40s_tpot_mean=48.338, l40s_tpot_p99=97.097,
           l40s_ttft_p50=104.2, l40s_ttft_p99=407.2,
           h200_off=66036.8 / 8, h200_srv=64914.57 / 8, h200_srv_qps=503.21 / 8, h200_tpot_mean=74.643, h200_tpot_p99=90.351,
           h200_ttft_p50=170.8, h200_ttft_p99=371.1, h200_1gpu_off=7796.585)
# workload: 778 input tokens (Red Hat's blog); 128.0 output tokens per sample (the logs: 5777.08 / 45.1334)
W = dict(model="l8", fmt="fp8", kvb=1, tp=1, pp=1, ep=0, P=778, O=128, share=0.0, slo_ttft=2.0, slo_tpot=0.1,
         ovh=1.5, eff_m=0.8, tseq=0.0, latx=1.0, overlap=0, lam=1.0, avg=1.0, price=0, api="min")
CASES = {
    "h100_off": dict(W, chip="h100", tb=4096, seqs=1024, util=0.90),   # Red Hat offline command; vLLM 0.10.0 default utilisation 0.90
    "h100_srv": dict(W, chip="h100", tb=1024, seqs=512, util=0.91),    # Red Hat server command
    "l40s_off": dict(W, chip="l40s", tb=16384, seqs=512, util=0.95),
    "l40s_srv": dict(W, chip="l40s", tb=2048, seqs=256, util=0.96),    # vLLM defaults for a 48 GB GPU (not set in the command)
    # TensorRT-LLM (HPE configs/HPE_Cray_XD670_H200_SXM_141GBx8/<scenario>/llama3_1-8b.py): max_num_tokens 12000,
    # gpu_batch_size 2048, kvcache_free_gpu_mem_frac 0.99 (of the memory left after weights; taken here as utilisation 0.98)
    "h200_off": dict(W, chip="h200", tb=12000, seqs=2048, util=0.98),
    "h200_srv": dict(W, chip="h200", tb=12000, seqs=2048, util=0.98),
}


def offline(chip, ec, tv):
    o = dict(CASES[chip + "_off"], eff_c=ec, tovh=tv)
    return max_fluid(o, setup(o)) * o["O"]


def solve_ec(chip, tv):
    lo, hi = 0.05, 1.0
    for _ in range(22):
        mid = (lo + hi) / 2
        if offline(chip, mid, tv) < PUB[chip + "_off"]:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def long_sim(o, lam):
    """Three seeds of 12,000 requests each, averaged: the calibration points sit near the knee, where one short
    run is noisy (validate.py records the spread of the planner's 3,000-request runs)."""
    s = setup(o)
    rs = [simulate(o, s, lam, n=12000, seed=sd) for sd in (7, 11, 23)]
    if any(r is None or not r["stable"] for r in rs):
        return None
    return {k: sum(r[k] for r in rs) / 3 for k in ("tpot", "ttft_p50", "ttft_p99", "B")}


def tpot_at(chip, ec, tv):
    o = dict(CASES[chip + "_srv"], eff_c=ec, tovh=tv)
    r = long_sim(o, PUB[chip + "_srv_qps"])
    return r["tpot"] * 1e3 if r else None


def fit(chip):
    best = None
    def scan(tvs):
        nonlocal best
        for tv in tvs:
            ec = solve_ec(chip, tv)
            tp = tpot_at(chip, ec, tv)
            if tp is None:
                continue
            e = abs(tp / PUB[chip + "_tpot_mean"] - 1)
            if best is None or e < best[0]:
                best = (e, ec, tv)
    scan([2.0 * j for j in range(16)])
    c = best[2]
    scan([max(0.0, c + 0.5 * j) for j in range(-3, 4)])
    _, ec, tv = best
    return round(ec, 3), round(tv, 1)


def check(chip, ec, tv):
    o = dict(CASES[chip + "_srv"], eff_c=ec, tovh=tv)
    s = setup(o)
    lam_off = max_fluid(o, s)
    srv = max_rate(o, s, lam_off) * o["O"]
    r = long_sim(o, PUB[chip + "_srv_qps"])
    out = dict(eff_c=ec, tovh=tv, off=offline(chip, ec, tv), srv=srv, off_res=offline(chip, ec, tv) / PUB[chip + "_off"] - 1,
               srv_res=srv / PUB[chip + "_srv"] - 1)
    if r:
        out.update(tpot_ms=r["tpot"] * 1e3, ttft_p50_ms=r["ttft_p50"] * 1e3, ttft_p99_ms=r["ttft_p99"] * 1e3, B=r["B"])
    return out


if __name__ == "__main__":
    fits = {}
    for chip in ("h100", "l40s", "h200"):
        ec, tv = fit(chip)
        fits[chip] = check(chip, ec, tv)
        print(chip, fits[chip], flush=True)
    h = fits["h100"]
    transfer = {chip: check(chip, h["eff_c"], h["tovh"]) for chip in ("l40s", "h200")}
    f = fits["h200"]
    o1 = dict(CASES["h200_off"], eff_c=f["eff_c"], tovh=f["tovh"])
    one = max_fluid(o1, setup(o1)) * 128
    out = dict(eff_m=0.8, pub=PUB, fits=fits, transfer=transfer,
               h200_single_check=dict(model=one, pub=PUB["h200_1gpu_off"], res=one / PUB["h200_1gpu_off"] - 1))
    json.dump(out, open(os.path.join(H, "out", "calib.json"), "w"), indent=1)
    print(json.dumps(dict(transfer=transfer, single=out["h200_single_check"]), indent=1))
