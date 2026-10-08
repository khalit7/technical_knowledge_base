"""Derived numbers for the Engine bench tab, computed from data.json's measured rows.

facts(data) returns {name: formatted string}; the page fills every <span data-f="name"> from data.facts,
and check_page.mjs confirms the rendered text equals these strings. Also holds the reference
implementations the page's JavaScript is checked against (bandwidth fit, speculative decoding model).
"""
import statistics as st

KV_TOKEN_06B = 2 * 28 * 8 * 128 * 2  # bytes per token, Qwen3-0.6B config.json: 28 layers, 8 KV heads, head_dim 128, 16-bit
BW_HW_READ = 143  # GB/s, GPU read bandwidth measured on the Topic: hardware page (Roofline lab tab, MLX 0.32.3, 2026-10-05)


def fmt(x, n=0):
    return f"{x:,.{n}f}"


def lb_rows(data, **kw):
    return [r for r in data["lb"] if all(r.get(k) == v for k, v in kw.items())]


def fit_bandwidth(data):
    """Least-squares fit of time per token = t0 + bytes / BW on the flash-attention depth sweep."""
    rows = [r for r in lb_rows(data, set="lb_0.6b_tgdepth", fa=1)]
    W = rows[0]["bytes"]
    xs = [W + r["depth"] * KV_TOKEN_06B for r in rows]
    ys = [1.0 / r["ts"] for r in rows]
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    a = my - b * mx
    return a, 1.0 / b  # t0 seconds, bandwidth bytes/s


def spec_expected_tokens(a, k):
    """Leviathan et al. (2023): expected tokens per target step with per-token acceptance a and draft length k."""
    if a >= 1:
        return k + 1
    return (1 - a ** (k + 1)) / (1 - a)


def interp(xs, ys, x):
    if x <= xs[0]:
        return ys[0] + (ys[1] - ys[0]) * (x - xs[0]) / (xs[1] - xs[0])
    for i in range(1, len(xs)):
        if x <= xs[i]:
            return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1])
    return ys[-2] + (ys[-1] - ys[-2]) * (x - xs[-2]) / (xs[-1] - xs[-2])


def step_cost_curve(data, model):
    """Measured time of one forward step of n tokens (seconds), from llama-bench pp=1,2,4,9,17."""
    rows = sorted([r for r in lb_rows(data, set="lb_smallbatch") if r["model"] == model], key=lambda r: r["pp"])
    return [r["pp"] for r in rows], [r["pp"] / r["ts"] for r in rows]


def spec_speedup(data, a, k, ideal=False):
    """Speed-up of draft-and-verify over plain decode using measured step costs (or a flat verify cost if ideal)."""
    nt, tt = step_cost_curve(data, "Qwen3-4B")
    nd, td = step_cost_curve(data, "Qwen3-0.6B")
    t1 = tt[0]
    verify = t1 if ideal else interp(nt, tt, k + 1)
    draft = k * td[0]
    return spec_expected_tokens(a, k) * t1 / (draft + verify)


def spec_modelled(data, run):
    """tokens/s predicted for one speculative run from its own counts: steps = out - accepted, k = drafted / steps."""
    nt, tt = step_cost_curve(data, "Qwen3-4B")
    nd, td = step_cost_curve(data, "Qwen3-0.6B")
    vals = []
    for dn, acc in zip(run["draft_n"], run["acc"]):
        steps = run["n_out"] - acc
        k = dn / steps
        vals.append(run["n_out"] / (steps * (k * td[0] + interp(nt, tt, k + 1))))
    return st.median(vals)


def facts(data):
    F = {}
    F["date"] = "8 October 2026"
    loads = [r["load_before"] for r in data["runs"] if r.get("load_before") is not None]
    F["loadMin"] = fmt(min(loads), 1)
    F["loadMax"] = fmt(max(loads), 1)
    q = {(r["quant"], r["pp"], r["tg"]): r for r in lb_rows(data, set="lb_0.6b_quants")}
    pp, tg = q[("Q4_K_M", 512, 0)]["ts"], q[("Q4_K_M", 0, 128)]["ts"]
    F["pp512_06q4"] = fmt(pp)
    F["tg_06q4"] = fmt(tg)
    F["ppTgRatio"] = fmt(pp / tg)
    d = {r["depth"]: r for r in lb_rows(data, set="lb_0.6b_tgdepth", fa=1)}
    F["tg16k_fa"] = fmt(d[16384]["ts"])
    F["tg0_fa"] = fmt(d[0]["ts"])
    F["kvMiB16k"] = fmt(16384 * KV_TOKEN_06B / 2 ** 20)
    F["w06q4MiB"] = fmt(q[("Q4_K_M", 512, 0)]["bytes"] / 2 ** 20)
    F["kvTok"] = fmt(KV_TOKEN_06B)
    t0, bw = fit_bandwidth(data)
    F["fitT0"] = fmt(t0 * 1000, 2)
    F["fitBW"] = fmt(bw / 1e9)
    F["bwHw"] = "about " + str(BW_HW_READ)
    bb = {r["pl"]: st.median(r["s_tg"]) for r in data["bb"] if r["set"] == "bb_0.6b_q4"}
    F["bb1"], F["bb8"], F["bb64"] = fmt(bb[1]), fmt(bb[8]), fmt(bb[64])
    F["bbRatio"] = fmt(bb[64] / bb[1], 1)
    # llama.cpp open loop: saturation throughput and the p99 TTFT at the lowest and highest offered rates
    po = [r for r in data["srv"] if r["tag"] == "lsv_0.6b_q4_poisson" and r["n_ok"]]
    rates = sorted({r["rate"] for r in po})
    at = lambda rate, k: st.median([r[k] for r in po if r["rate"] == rate])
    F["satTok"] = fmt(round(at(rates[-1], "out_tok_per_s"), -1))
    F["ttftLow"] = fmt(at(rates[0], "ttft_p99") * 1000)
    F["ttftHigh"] = fmt(at(rates[-1], "ttft_p99"), 1)
    px = [r for r in data["srv"] if r["tag"] == "lsv_prefix_1.7b"]
    on = st.median([r["ttft_p50"] for r in px if r["label"].startswith("on")])
    off = st.median([r["ttft_p50"] for r in px if r["label"].startswith("off")])
    F["pfxOn"], F["pfxOff"], F["pfxRatio"] = fmt(on * 1000), fmt(off * 1000), fmt(off / on)
    s1, s2 = data["stream"]["alone"], data["stream"]["loaded"]
    F["strPrompt"] = fmt(s1["prompt_tokens"]) if s1.get("prompt_tokens") else "about 410"
    F["strTtft1"], F["strTtft2"] = fmt(s1["ttft"], 2), fmt(s2["ttft"], 2)
    F["strGap1"], F["strGap2"] = fmt(st.median(s1["gaps"]) * 1000, 1), fmt(st.median(s2["gaps"]) * 1000, 1)
    F["strGapMax"] = fmt(max(s2["gaps"]) * 1000)
    if data.get("vllm_kv_tokens"):
        F["vllmKvTok"] = fmt(data["vllm_kv_tokens"])
    F["vllmKvTokB"] = fmt(2 * KV_TOKEN_06B)
    if data.get("vllm_preemptions") is not None:
        F["vllmPreempt"] = fmt(data["vllm_preemptions"])
        F["vllmKvPeak"] = fmt(data["vllm_kv_peak"], 1)
    vc = [r for r in data["srv"] if r["tag"] == "vsv_0.6b_fp32_closed" and r["n_ok"]]
    F["vllmTok8"] = fmt(st.median([r["out_tok_per_s"] for r in vc if r["conc"] == 8]), 1)
    F["vllmTok16"] = fmt(st.median([r["out_tok_per_s"] for r in vc if r["conc"] == 16]), 1)
    nt, tt = step_cost_curve(data, "Qwen3-4B")
    F["verify4"] = fmt(tt[nt.index(4)] / tt[0], 1)
    errs = [spec_modelled(data, r) / st.median(r["tok_s"]) - 1 for r in data["spec"] if r["draft_n"][0] and "ngram" not in r["cfg"]]
    F["specModelLo"], F["specModelHi"] = fmt(100 * min(errs)), fmt(100 * max(errs))
    K = {r["quant"]: r for r in data["kld"]}
    F["q8Change"] = fmt(100 / (100 - K["Q8_0"]["same_top"]))
    F["q4Change"] = fmt(100 / (100 - K["Q4_K_M"]["same_top"]))
    nd, td = step_cost_curve(data, "Qwen3-0.6B")
    F["step2_06"] = fmt(td[nd.index(2)] / td[0], 1)
    return F


if __name__ == "__main__":
    import json, os, sys
    data = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")))
    F = facts(data)
    for k, v in F.items():
        print(k, v)
    t0, bw = fit_bandwidth(data)
    print("fit t0 ms", t0 * 1000, "BW GB/s", bw / 1e9)
    for r in data["spec"]:
        if r["draft_n"][0] and "ngram" not in r["cfg"]:
            print("spec", r["cfg"], r["prompt"], "measured", st.median(r["tok_s"]), "modelled", round(spec_modelled(data, r), 2))
    for a in (0.5, 0.7, 0.9):
        for k in (3, 8):
            print("spec a", a, "k", k, "measured-cost speedup", round(spec_speedup(data, a, k), 3), "flat-verify", round(spec_speedup(data, a, k, True), 3))
