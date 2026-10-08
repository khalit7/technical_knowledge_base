"""The M1 Pro row: fit the planner's constants to llama.cpp measured on this laptop by the Engine bench tab, then
check them on that tab's Poisson load runs. Reads the bench tab's results (path given on the command line, or
the snapshot inputs/m1_bench_src.json), writes inputs/m1_bench.json for gen_data.py.

Fit (Qwen3-0.6B Q4_K_M, llama.cpp Metal, flash attention on):
  bandwidth share and per-step overhead from single-stream generation at depths 0 and 16,384 (llama-bench tg32):
  t(d) = (weights + d * KV bytes per token) / (165 GB/s * eff_m) + tovh, two points, two unknowns;
  compute share from prompt processing of 512 tokens (llama-bench pp512): tokens/s * FLOPs per token / 5.0 TFLOP/s.
Check (not fitted): llama-server, 16 slots, Poisson arrivals at 0.5 to 6 requests/s, ~413-token prompts,
128 output tokens: mean TPOT, TTFT p50 and p99 against the planner's simulation."""
import glob, json, os, sys
from plan import *

H = os.path.dirname(os.path.abspath(__file__))
SNAP = os.path.join(H, "inputs", "m1_bench_src.json")


def snapshot(src):
    out = dict(source="Engine bench tab of this page (llama.cpp, Homebrew build 11146, commit 7fe450e19, Metal), measured 2026-10-08 on the Apple M1 Pro", lb=[], lsv=[])
    for f in ("lb_0.6b_tgdepth.json", "lb_0.6b_ppsweep.json", "lb_0.6b_quants.json"):
        d = json.load(open(os.path.join(src, f)))
        for r in d["results"]:
            out["lb"].append(dict(file=f, type=r["model_type"], fa=r["flash_attn"], p=r["n_prompt"], n=r["n_gen"], d=r["n_depth"],
                                  size=r["model_size"], params=r["model_n_params"], ts=r["avg_ts"], sd=r["stddev_ts"], load=d["load_before"]["loadavg"][0]))
    d = json.load(open(os.path.join(src, "bb_0.6b_q4.json")))
    out["bb"] = [dict(rep=r["rep"], pl=r["pl"], pp=r["pp"], tg=r["tg"], t_tg=r["t_tg"], speed_tg=r["speed_tg"], speed_pp=r["speed_pp"]) for r in d["rows"]]
    out["bb_cmd"] = "llama-batched-bench -c 40000 -b 2048 -ub 512 -npp 128 -ntg 128 -npl 1,2,4,8,16,32,64 -fa on -ngl 99 (Qwen3-0.6B-Q4_K_M.gguf)"
    out["bb_load"] = d["load_before"]["loadavg"][0]
    for f in sorted(glob.glob(os.path.join(src, "lsv_0.6b_q4_poisson_*.json"))):
        d = json.load(open(f))
        c, s = d["config"], d["summary"]
        out["lsv"].append(dict(rate=c["rate"], n=c["n"], out=c["max_tokens"], in_per_req=s["in_tok_total"] / max(1, s["n_ok"]),
                               tpot=s["tpot_mean"], ttft_p50=s["ttft_p50"], ttft_p99=s["ttft_p99"], out_tps=s["out_tok_per_s"],
                               load=d["load_before"]["loadavg"][0], server="llama-server -c 32768 -np 16 -fa on -ngl 99 (Qwen3-0.6B-Q4_K_M.gguf)"))
    json.dump(out, open(SNAP, "w"), indent=1)
    return out


if __name__ == "__main__":
    B = snapshot(sys.argv[1]) if len(sys.argv) > 1 else json.load(open(SNAP))
    m, ch = MODELS["q06"], CHIPS["m1pro"]
    tg = {r["d"]: r for r in B["lb"] if r["file"] == "lb_0.6b_tgdepth.json" and r["fa"] == 1}
    pp = [r for r in B["lb"] if r["file"] == "lb_0.6b_ppsweep.json" and r["p"] == 512 and "Q4_K" in r["type"]][0]
    W = tg[0]["size"]
    kvt = HW.kv_per_token(m, 2)
    t0, t1 = 1 / tg[0]["ts"], 1 / tg[16384]["ts"]
    eff_m = (16384 * kvt) / (ch["bw"] * 1e9) / (t1 - t0)
    # per-step overhead and per-sequence cost: straight line through the batched-bench decode steps after the bytes
    base = dict(DEFAULT, model="q06", chip="m1pro", fmt="q4km", kvb=2, tp=1, pp=1, ep=0, P=128, O=128, share=0.0,
                eff_c=1.0, eff_m=eff_m, tovh=0.0, tseq=0.0, tb=2048, seqs=64, util=ch["util"], ovh=0.3)
    sb = setup(base)
    pts = {}
    for r in B["bb"]:
        pts.setdefault(r["pl"], []).append(r["t_tg"] / r["tg"])
    xs, ys = [], []
    for pl, v in sorted(pts.items()):
        if pl > 16:  # llama-server runs 16 slots here
            continue
        xs.append(pl); ys.append(sum(v) / len(v) - step(base, sb, pl, 0)["t"])
    tovh = t0 - W / (ch["bw"] * 1e9 * eff_m)  # single-stream intercept (llama-bench tg32 at depth 0)
    tseq = sum(x * (y - tovh) for x, y in zip(xs, ys)) / sum(x * x for x in xs)  # least squares through the intercept
    tseq = max(0.0, tseq)
    xs = sorted(pts)
    bbrows = [dict(B=x, meas=sum(pts[x]) / len(pts[x]), model=step(dict(base, tovh=tovh * 1e3, tseq=tseq * 1e3), sb, x, 0)["t"]) for x in xs]
    print("batched", [(r["B"], round(r["meas"] * 1e3, 2), round(r["model"] * 1e3, 2)) for r in bbrows])
    fl = 2 * m["Pact"] + m["nh"] * (m["dqk"] + m["dv"]) * att_ctx(m, 512)  # per prompt token, causal half (the parent's prefill count)
    eff_c = pp["ts"] * fl / (ch["peak"]["bf16"] * 1e12)
    # the Engine bench tab's own line (least squares through all five flash-attention depths, bench/recompute.py fit_bandwidth)
    lx = [W + d * kvt for d in sorted(tg)]; ly = [1 / tg[d]["ts"] for d in sorted(tg)]
    mx, my = sum(lx) / len(lx), sum(ly) / len(ly)
    lb_ = sum((x - mx) * (y - my) for x, y in zip(lx, ly)) / sum((x - mx) ** 2 for x in lx)
    bench_t0, bench_bw = my - lb_ * mx, 1 / lb_
    fit = dict(name="llama.cpp on the M1 Pro, fitted to this laptop", eff_c=round(eff_c, 3), tovh=round(tovh * 1e3, 2), eff_m=round(eff_m, 3), tseq=round(tseq * 1e3, 3))
    print("fit", fit)
    P = round(sum(r["in_per_req"] for r in B["lsv"]) / len(B["lsv"]))
    o = dict(DEFAULT, model="q06", chip="m1pro", fmt="q4km", kvb=2, tp=1, pp=1, ep=0, tb=2048, seqs=16, util=ch["util"], ovh=0.3,
             P=P, O=128, share=0.0, lam=2.0, avg=0.5, slo_ttft=1.0, slo_tpot=0.03, eff_c=fit["eff_c"], tovh=fit["tovh"], eff_m=fit["eff_m"], tseq=fit["tseq"],
             price=0, api="min", latx=1.0, overlap=0)
    s = setup(o)
    rows = []
    byrate = {}
    for r in B["lsv"]:
        byrate.setdefault(r["rate"], []).append(r)
    for rate in sorted(byrate):
        g = byrate[rate]
        a = at_rate(o, s, rate)
        rg = lambda k: [min(x[k] for x in g), max(x[k] for x in g)]
        rows.append(dict(rate=rate, runs=len(g), meas=dict(tpot=rg("tpot"), ttft_p50=rg("ttft_p50"), ttft_p99=rg("ttft_p99"), load=rg("load")),
                         model=dict(tpot=a["tpot"], ttft_p50=a["ttft"]["p50"], ttft_p99=a["ttft"]["p99"]) if a else None))
        print(rate, len(g), "meas", [round(v * 1e3) for v in rg("tpot")], [round(v * 1e3) for v in rg("ttft_p99")],
              "model", a and (round(a["tpot"] * 1e3, 1), round(a["ttft"]["p50"] * 1e3), round(a["ttft"]["p99"] * 1e3)))
    lam_off = max_fluid(o, s)
    lam_slo = max_rate(o, s, lam_off)
    tgq = {r["type"]: r["ts"] for r in B["lb"] if r["file"] == "lb_0.6b_quants.json" and r["n"] == 128}
    out = dict(fit=fit, bench_line=dict(t0=bench_t0, bw=bench_bw), P=P, rows=rows, bb=bbrows, lam_off=lam_off, lam_slo=lam_slo, tg=dict(d0=tg[0]["ts"], d16k=tg[16384]["ts"], size=W),
               pp512=pp["ts"], quants=tgq, source=B["source"])
    f = lambda v: ("%.0f" % (v[0] * 1e3)) if abs(v[1] - v[0]) < 5e-4 else ("%.0f to %.0f" % (v[0] * 1e3, v[1] * 1e3))
    g = lambda x, k: ("%.0f" % (x["model"][k] * 1e3)) if x["model"] else "unstable"
    tbl = "".join("<tr><td class=\"num\">%s</td><td class=\"num\">%d</td><td class=\"num\">%s / %s</td><td class=\"num\">%s / %s</td><td class=\"num\">%s / %s</td></tr>" % (
        x["rate"], x["runs"], f(x["meas"]["tpot"]), g(x, "tpot"), f(x["meas"]["ttft_p50"]), g(x, "ttft_p50"), f(x["meas"]["ttft_p99"]), g(x, "ttft_p99")) for x in rows)
    out["html"] = ("<p><b>Calibration on this laptop</b> <span class=\"pln-tag pln-msr\">measured on Apple M1 Pro</span>: Qwen3-0.6B Q4_K_M (%s MB) in llama.cpp with Metal and flash attention. "
                   "One stream generates %.0f tokens/s at an empty cache and %.1f at 16,384 tokens of context (llama-bench, 3 repetitions): the slope gives %.0f%% of the 165 GB/s stream copy measured on Topic: hardware, so from these two points the KV cache is read at about %.0f GB/s (the Engine bench tab's least-squares line through all five depths gives %.2f ms + bytes / %.0f GB/s). "
                   "Decoding several sequences together (llama-batched-bench, 1 to 64 sequences) costs far more than the bytes say: keeping the single stream's %.2f ms of fixed cost per step (the planner anchors it at the empty-cache point, so it sits a little above the bench tab's line), a line through those steps adds %.2f ms per sequence, where the vLLM fits on GPUs need no per-sequence term. "
                   "Prompt processing at 512 tokens runs %s tokens/s, %.0f%% of the 5.0 TFLOP/s measured peak. "
                   "Then the planner simulates the bench tab's Poisson runs (llama-server, 16 slots, %d-token prompts, 128 output tokens; 30 requests each, so the p99 is the slowest one or two):</p>"
                   "<div class=\"tw\"><table class=\"pln-t pln-wrap\"><tr><th class=\"num\">Requests/s</th><th class=\"num\">Runs</th><th class=\"num\">TPOT ms, measured / planner</th><th class=\"num\">TTFT p50 ms</th><th class=\"num\">TTFT p99 ms</th></tr>%s</table></div>"
                   "<p>Measured ranges span the repeated runs (the laptop was shared with other work; load averages %.0f to %.0f). The planner follows the measurements up to about 1.5 requests per second and then saturates sooner and harder than the 30-request runs show: a short run never reaches the backlog a steady stream builds once the 16 slots are full, which the planner reports as unstable. The straight per-sequence line fits llama.cpp's batched steps from 1 to 16 sequences within about 15%% but overestimates 32 and 64, beyond this server's 16 slots.</p>"
                   ) % (f"{W / 1e6:.0f}", tg[0]["ts"], tg[16384]["ts"], eff_m * 100, eff_m * ch["bw"], bench_t0 * 1e3, bench_bw / 1e9, tovh * 1e3, tseq * 1e3, f"{pp['ts']:,.0f}", eff_c * 100, P, tbl,
                        min(x["meas"]["load"][0] for x in rows), max(x["meas"]["load"][1] for x in rows))
    out["preset"] = dict(name="Qwen3 0.6B on this M1 Pro, llama.cpp", o=dict(o, eng="m1", lam=2.0),
                         note="The laptop this page was built on: Qwen3-0.6B in llama.cpp's Q4_K_M with 16 server slots, constants fitted to the Engine bench tab's measurements (see the last section). Notice that memory is no constraint here (a 391 MB model beside 11.9 GB of cache room): llama.cpp's cost per decoding sequence and the TPOT target limit the traffic.")
    out["check"] = "planner against the bench tab's Poisson runs at 0.5 to 6 requests/s: see the table in the M1 section below (measured on Apple M1 Pro)."
    json.dump(out, open(os.path.join(H, "inputs", "m1_bench.json"), "w"), indent=1)
