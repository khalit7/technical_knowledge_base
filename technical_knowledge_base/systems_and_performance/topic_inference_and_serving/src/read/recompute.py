"""Every derived number the Reading tab quotes. Imports the Capacity planner's reference model (src/plan/plan.py),
which imports the hardware root's calculator unchanged, so the three cannot disagree.
Writes out/rd_data.json and ../parts/22_js_rd_data.js (window.RDD). Measured numbers are copied from
src/bench/data.json (facts) so the page quotes exactly what the Engine bench tab shows.
Run: python3 -I recompute.py"""
import json, os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "plan"))
import plan as P  # noqa: E402
HW = P.HW

# the running example: the Capacity planner's "Chat assistant" worked example (Llama 3.1 70B, FP8 weights, BF16 KV, one H200)
BASE = dict(model="l70", chip="h200", fmt="fp8", kvb=2, tp=1, pp=1, ep=0, tb=8192, seqs=1024, util=0.92, ovh=1.5,
            P=2000, O=300, share=0.5, lam=20.0, avg=0.5, slo_ttft=2.0, slo_tpot=0.05, eff_c=0.345, eff_m=0.8,
            tovh=2.5, tseq=0.0, latx=1.0, overlap=0, price=4.47, api="min")
alone = dict(BASE, share=0.0)
sa = P.setup(alone)
pre = P.step(alone, sa, 0, 2000)
dec = P.step(alone, sa, 1, 0)
sc = P.setup(BASE)
pre_c = P.step(BASE, sc, 0, 1000)
r = lambda x, n=4: float(f"{x:.{n}g}")
life = dict(
    weights_gb=r(sa["w_gpu"] / 1e9), kv_tok=sa["kv_tok"], kv_req_mb=r(sa["kv_tok"] * 2300 / 2**20),
    t_pre_ms=r(pre["t"] * 1e3), pre_bound=pre["bound"], pre_fl=pre["fl"], pre_bytes=pre["wr"] + pre["kvr"],
    t_dec_ms=r(dec["t"] * 1e3), dec_bound=dec["bound"], dec_fl=dec["fl"], dec_bytes=dec["wr"] + dec["kvr"],
    t_pre_cached_ms=r(pre_c["t"] * 1e3),
    e2e_s=r((pre["t"] + 299 * dec["t"])),
    tok_s_alone=r(1 / dec["t"]),
    pre_int=r(pre["fl"] / (pre["wr"] + pre["kvr"])), dec_int=r(dec["fl"] / (dec["wr"] + dec["kvr"])),
    ridge=r(P.CHIPS["h200"]["peak"]["fp8"] * 1e12 / (P.CHIPS["h200"]["bw"] * 1e9)),
    seqs_fit=sc["bmax"],
)
# batching: decode step time against batch size, the same replica (prompt context as in the running example)
batch = []
for B in (1, 2, 4, 8, 16, 32, 64, 128, sc["bmax"]):
    t = P.step(BASE, sc, B, 0)["t"]
    batch.append(dict(B=B, t_ms=r(t * 1e3), tot=r(B / t), per=r(1 / t)))
# KV calculator: bytes per sequence at each context, and how many sequences fit on one 8 x H200 server
CTX = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072]
ORDER = ["q06", "l8", "l70", "l405", "q32", "q235", "dsv3", "oss120"]
FMT = {"dsv3": "native", "oss120": "native"}
SERVER = 8 * P.CHIPS["h200"]["mem"] * 1e9 * 0.92
kv = []
for k in ORDER:
    m = P.MODELS[k]
    wn, we = P.weight_split(m, FMT.get(k, "fp8"))
    row = dict(k=k, name=m["name"], src=m.get("src") or m.get("url") or "", w_gb=r((wn + we) / 1e9),
               per_tok={str(b): HW.kv_per_token(m, b) for b in (2, 1)},
               seq={str(b): [HW.kv_seq(m, c, b) for c in CTX] for b in (2, 1)},
               fit={str(b): [max(0, math.floor((SERVER - wn - we) / HW.kv_seq(m, c, b))) for c in CTX] for b in (2, 1)})
    kv.append(row)
# speculative decoding expected tokens per target step (Leviathan et al. 2023), for the animation caption
spec = {f"a{a}_k{k}": r((1 - a ** (k + 1)) / (1 - a)) for a in (0.6, 0.7, 0.8) for k in (3, 4)}
plan_ex = json.load(open(os.path.join(HERE, "..", "plan", "out", "plan_ref.json")))[0]["out"]
cost = dict(gpus=plan_ex["gpus"], cost_h=r(plan_ex["cost"]["cost_h"]), usd_blend=r(plan_ex["cost"]["usd_blend"], 3),
            api_h=r(plan_ex["api"]["api_h"]), api_in=plan_ex["api"]["pin"], api_out=plan_ex["api"]["pout"],
            lam_slo=r(plan_ex["lam_slo"], 3), tpot_ms=r(plan_ex["op"]["tpot"] * 1e3, 3), ttft_p99_s=r(plan_ex["op"]["ttft"]["p99"], 3))
relax = P.plan(dict(json.load(open(os.path.join(HERE, "..", "plan", "out", "plan_ref.json")))[0]["inp"], slo_tpot=0.1))
cost["relax_gpus"], cost["relax_cost_h"] = relax["gpus"], r(relax["cost"]["cost_h"])
bench = json.load(open(os.path.join(HERE, "..", "bench", "data.json")))["facts"]
KEEP = ["date", "pp512_06q4", "tg_06q4", "ppTgRatio", "tg16k_fa", "tg0_fa", "kvMiB16k", "w06q4MiB", "kvTok", "fitBW",
        "bb1", "bb8", "bb64", "bbRatio", "satTok", "ttftLow", "ttftHigh", "pfxOn", "pfxOff", "pfxRatio", "strTtft1",
        "strTtft2", "strGap1", "strGap2", "strGapMax", "vllmKvTok", "vllmPreempt", "vllmTok8", "vllmTok16", "verify4"]
meas = {k: bench[k] for k in KEEP}
bd = json.load(open(os.path.join(HERE, "..", "bench", "data.json")))
st = bd["stream"]["loaded"]
g = sorted(st["gaps"])
stream = dict(run=st["run"], conc=st["conc"], prompt=st["prompt_tokens"], ttft=st["ttft"], gaps=st["gaps"],
              e2e=r(st["ttft"] + sum(st["gaps"])), tpot_ms=r(sum(st["gaps"]) / len(st["gaps"]) * 1e3, 3),
              itl_med_ms=r(g[len(g) // 2] * 1e3, 3), itl_max_ms=r(g[-1] * 1e3, 3),
              cmd=[x["cmd"] for x in bd["runs"] if x["id"] == st["run"]][0])
out = dict(stream=stream, life=life, batch=batch, ctx=CTX, kv=kv, server_gb=r(SERVER / 1e9), spec=spec, cost=cost, meas=meas)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(out, open(os.path.join(HERE, "out", "rd_data.json"), "w"), indent=1)
with open(os.path.join(HERE, "..", "parts", "22_js_rd_data.js"), "w") as f:
    f.write("// ---- Reading tab data: generated by src/read/recompute.py (do not edit) ----\nwindow.RDD=" + json.dumps(out, separators=(",", ":")) + ";\n")
if __name__ == "__main__":
    print(json.dumps(dict(life=life, batch=batch, cost=cost, spec=spec), indent=1))
    for row in kv:
        print(row["name"], row["w_gb"], row["per_tok"], row["fit"]["2"][2], row["fit"]["1"][2])
