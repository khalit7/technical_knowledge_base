"""Build the page's data from the compact results in results/ (written by compact.py from the raw runs).
Writes data.json and parts/15_js_sd_data.js (window.SD_DATA). Every number the prose quotes is a fact here,
filled into <span data-f="..."> by the page. usage: python3 -I build_data.py"""
import json, os, statistics as st
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, "results")
J = lambda n: json.load(open(os.path.join(R, n)))
ex = lambda n: os.path.exists(os.path.join(R, n))
D = {"facts": {}, "preds": {}}
F = D["facts"]
f2 = lambda x, d=2: f"{x:,.{d}f}"
etok = lambda a, k: k + 1 if a >= 1 else (1 - a ** (k + 1)) / (1 - a)

# ---------- section 1: pass time against tokens (llama-bench, depth 512) ----------
D["cost"] = {}
for key, fn in (("q4b", "lb_Qwen3-4B-Q4_K_M.json"), ("q06", "lb_Qwen3-0.6B-Q4_K_M.json"), ("q17", "lb_Qwen3-1.7B-Q8_0.json")):
    if ex(fn):
        D["cost"][key] = [[r[0], round(r[1], 3), round(r[2], 3)] for r in J(fn)["curve"]]
H100 = dict(wbytes=9080934400.0, kvtok=131072, params=8030261248, nh=32, dqk=128, dv=128, L=32, bw=3350, eff_m=0.8, peak=1979, eff_c=0.345, tovh=2.5)
D["h100"] = H100
def h100t(B, n, ctx):
    by = H100["wbytes"] + B * ctx * H100["kvtok"]
    fl = B * n * (2 * H100["params"] + 2 * H100["nh"] * (H100["dqk"] + H100["dv"]) * H100["L"] * ctx)
    return 1000 * max(by / (H100["bw"] * 1e9 * H100["eff_m"]), fl / (H100["peak"] * 1e12 * H100["eff_c"])) + H100["tovh"]
def m1t(n, key="q4b"):
    cc = D["cost"][key]
    if n <= cc[0][0]: return cc[0][1]
    for i in range(1, len(cc)):
        if n <= cc[i][0]:
            a, b = cc[i - 1], cc[i]; return a[1] + (b[1] - a[1]) * (n - a[0]) / (b[0] - a[0])
    return cc[-1][1] * n / cc[-1][0]
fl = max(n for n in range(1, 1025) if h100t(1, n, 1024) <= 1.1 * h100t(1, 1, 1024))
F["h100flat"] = str(fl); F["h100ratio5"] = f2(h100t(1, 5, 1024) / h100t(1, 1, 1024), 2)
F["w4b"] = f2(2497280256 / 1e9, 2)  # Qwen/Qwen3-4B-GGUF Q4_K_M file size in bytes (model store)
if "q4b" in D["cost"]:
    t1 = m1t(1); r5 = m1t(5) / t1
    F["ratio2"] = f2(m1t(2) / t1, 2); F["ratio16"] = "about " + f2(min(m1t(n) / t1 for n in (16, 20, 24, 32)), 1) + " to " + f2(max(m1t(n) / t1 for n in (16, 20, 24, 32)), 1); F["t1ms"] = f2(t1, 1); F["tps4b"] = f2(1000 / t1, 0); F["ratio5"] = f2(r5, 2)
    F["pp512tf"] = f2(2 * 4.02e9 * 512 / (m1t(512) / 1000) / 1e12, 1)
    F["costNote"] = "One token: %s ms; 2 tokens %sx, 5 tokens %sx, 16 tokens %sx, 512 tokens %sx the one-token time. Dashed: n tokens one at a time." % (
        f2(t1, 1), f2(m1t(2) / t1, 2), f2(r5, 2), f2(m1t(16) / t1, 2), f2(m1t(512) / t1, 0))
    D["preds"]["sd-pr1"] = {"right": 0 if r5 < 1.3 else (1 if r5 < 3.5 else 2),
        "text": "Measured: %sx the one-token time. Less than 5x, because the weights are read once for all 5 tokens, but far from free: on this engine and weight format, 2 and 3 tokens use a kernel that handles each token almost separately, and only from 4 tokens does a small-batch kernel share the weight reads (the paragraph below). The derived H100 curve (a toggle on the chart below) stays within 10%% of the one-token time up to about %d tokens." % (f2(r5, 2), fl)}
    if "q17" in D["cost"]:
        u = m1t(1, "q17"); F["costNote17"] = "One token: %s ms; 2 tokens %sx, 5 tokens %sx, 16 tokens %sx the one-token time (Q8_0 gets the small-batch kernel from 2 tokens)." % (f2(u, 1), f2(m1t(2, "q17") / u, 2), f2(m1t(5, "q17") / u, 2), f2(m1t(16, "q17") / u, 2))
        F["q17ratio5"] = f2(m1t(5, "q17") / m1t(1, "q17"), 2)
    if "q06" in D["cost"]:
        F["cDraft"] = f2(m1t(1, "q06") / t1, 2)

# ---------- section 3: exactness test, float caveat, real distributions ----------
if ex("exact_story_stats.json"):
    s = J("exact_story_stats.json")
    D["exact"] = {"N": s["N"], "k": s["k"], "L": s["L"], "n_cats": s["n_cats"], "mass": s["cat_mass"],
                  "variants": {v: {"chi2": x["chi2"], "df": x["df"], "p": x["p"], "tv": x["tv_cats"], "acc": x["mean_acc_per_step"],
                                   "top": [[o[0], o[1], round(o[2], 1)] for o in x["top_obs"]]} for v, x in s["variants"].items()}}
    F["bugChi2"] = f2(s["variants"]["bug_resample_p"]["chi2"], 0)
    F["exCats"] = f2(s["n_cats"] - 1, 0); F["exMass"] = f2(100 * s["cat_mass"], 1) + "%"
    D["preds"]["sd-pr3"] = {"right": 3, "text": "Only (d). The control and the three exact rules give p-values of %s; the bug gives a chi-square of %s on %d degrees of freedom (p-value effectively 0). Sample-and-compare and the greedy draft are slower ways to be exact, not approximations." % (
        ", ".join(f2(s["variants"][v]["p"], 2) for v in ("target", "leviathan", "sample_compare", "greedy_compare")), F["bugChi2"], s["variants"]["bug_resample_p"]["df"])}
if ex("floatcav.json"):
    fc = J("floatcav.json"); b7 = [r for r in fc["runs"] if r["B"] == 7]
    F["fcMaxDiff"] = f2(max(r["max_abs_diff"] for r in b7), 2)
    F["fcFlips"] = str(sum(len(r["flips"]) for r in b7)); F["fcN"] = f2(sum(r["n"] for r in b7), 0)
    F["fcFlipMax"] = f2(max([m for r in b7 for m in r["flip_margins"]] or [0]), 2)
    D["floatcav"] = {"runs": fc["runs"], "mlxspec": fc.get("mlxspec")}
if ex("floatcav2.json"):
    f2v = J("floatcav2.json"); D["floatcav2"] = f2v
    dif = [r for r in f2v if r.get("first_diff") is not None]
    if dif:
        gaps = [r["ways"]["one_at_a_time"]["gap"] for r in dif]
        F["fcMargin"] = f2(min(gaps), 2) + " to " + f2(max(gaps), 2) if len(gaps) > 1 else f2(gaps[0], 2)
        F["fcStory"] = "Where the k = 6 run left the plain run, the candidates were tied to within bfloat16 rounding, and different ways of computing the same position disagreed on the winner: " + "; ".join("on the %s prompt at token %d (after %s), the plain run chose %s, the k = 6 run %s, and recomputing that position as one full pass, one token at a time and in blocks of 7 gave %s, %s and %s, with the top two logits %s, %s and %s apart" % (
            r["prompt"], r["first_diff"] + 1, json.dumps(r["context"].strip()[-24:]), json.dumps(r["base_tok"]), json.dumps(r["spec_tok"]),
            json.dumps(r["ways"]["one_pass"]["top"][0]), json.dumps(r["ways"]["one_at_a_time"]["top"][0]), json.dumps(r["ways"]["blocks_of_7"]["top"][0]),
            f2(r["ways"]["one_pass"]["gap"], 3), f2(r["ways"]["one_at_a_time"]["gap"], 3), f2(r["ways"]["blocks_of_7"]["gap"], 3)) for r in dif) + "."
        F["fcMargin"] = f2(max(max(w["gap"] for w in r["ways"].values()) for r in dif), 3)
if ex("dists.json"):
    dd = J("dists.json"); D["dists"] = {n: [{"tok": r["tok"], "a": round(r["a"], 3), "spq": round(r["spq"], 3), "pg": round(r["pg"], 3), "top": [[x[0], round(x[1], 3), round(x[2], 3)] for x in sorted(r["top"], key=lambda x: -max(x[1], x[2]))[:8]]} for r in rows] for n, rows in dd["texts"].items()}
    st_rows = dd["texts"]["story"]
    F["dAlpha"] = f2(st.mean(r["a"] for r in st_rows), 2); F["dSpq"] = f2(st.mean(r["spq"] for r in st_rows), 2); F["dPg"] = f2(st.mean(r["pg"] for r in st_rows), 2)
    # positions for the rule animation: story, code and summary positions with alpha in [0.4, 0.7] and a spread target
    pos = []
    for name in ("story", "summarize", "code_edit"):
        rows = dd["texts"][name]; text = ""
        best = None
        for i, r in enumerate(rows):
            if "full" in r and 0.4 <= r["a"] <= 0.7 and r["top"][0][1] < 0.7 and i > 3:
                best = (i, r); break
        if best:
            i, r = best; ctx = "".join(x["tok"] for x in rows[max(0, i - 12):i])
            pos.append({"ctx": ctx, "tok": r["tok"], "a": r["a"], "spq": r["spq"], "pg": r["pg"], "full": [[x[0], round(x[1], 5), round(x[2], 5)] for x in r["full"] if x[1] >= 1e-5 or x[2] >= 1e-5]})
    D["rulepos"] = pos

# ---------- section 2 and 4: real speculative runs (MLX, from scratch) ----------
if ex("accept.json"):
    ac = J("accept.json")
    D["steps"] = {}
    for r in ac["runs"]:
        if r["T"] == 0 and r["k"] == 4 and r["seed"] == 0:
            D["steps"][r["prompt"]] = [[s["t"], s["n"], s["k"]] for s in r["steps"]]
    Y = {}
    for name in sorted({r["prompt"] for r in ac["runs"]}):
        Y[name] = {}
        for T in (0.0, 1.0):
            rs = [r for r in ac["runs"] if r["prompt"] == name and r["T"] == T]
            alpha = st.mean(a for r in rs for s in r["steps"] for a in s["a"])
            ks = []
            for k in sorted({r["k"] for r in rs}):
                v = [r["n_out"] / len(r["steps"]) for r in rs if r["k"] == k]
                ks.append({"k": k, "mean": round(st.mean(v), 4), "lo": round(min(v), 4), "hi": round(max(v), 4)})
            Y[name][str(int(T))] = {"alpha": round(alpha, 4), "ks": ks}
    D["yield"] = Y
    sa = Y["story"]["1"]; m4 = next(x for x in sa["ks"] if x["k"] == 4)["mean"]
    F["accStoryA"] = f2(sa["alpha"], 2); F["accListA"] = f2(Y["list"]["1"]["alpha"], 2)
    pred_e = etok(sa["alpha"], 4)
    errs = [abs(etok(Y[n][T]["alpha"], x["k"]) / x["mean"] - 1) for n in Y for T in Y[n] for x in Y[n][T]["ks"]]
    F["yieldMed"] = f2(100 * st.median(errs), 0); F["yieldMax"] = f2(100 * max(errs), 0); F["yieldN"] = str(len(errs))
    D["preds"]["sd-pr2"] = {"right": 0 if pred_e > m4 * 1.05 else (2 if pred_e < m4 * 0.95 else 1),
        "text": "Measured %s tokens per step at k = 4 (mean of 3 seeds); the formula with &alpha; = %s gives %s. Over all %s combinations of prompt, temperature and k run here, the formula's median error was %s%% and its largest %s%%: close, once you know &alpha;." % (
            f2(m4, 2), f2(sa["alpha"], 2), f2(pred_e, 2), F["yieldN"], F["yieldMed"], F["yieldMax"])}

# ---------- section 7: chain against tree ----------
if ex("tree.json"):
    tr = J("tree.json"); rows = [r for p in tr["prompts"].values() for r in p["rows"]]
    m = lambda k, cap=None: st.mean(min(r[k], cap) if cap else r[k] for r in rows)
    F["treeNpos"] = f2(len(rows), 0); F["treeChain8"] = f2(m("chain", 8), 2); F["treeChain4"] = f2(m("chain", 4), 2)
    for M in (8, 16, 32): F["treeTree%d" % M] = f2(m("tree%d" % M), 2)
    lab_ = {"code_edit": "code edit", "summarize": "summary", "story": "story", "list": "list"}
    per = []
    for pn, pv in tr["prompts"].items():
        rr = pv["rows"]; c8 = st.mean(min(8, r["chain"]) for r in rr); t8 = st.mean(r["tree8"] for r in rr)
        per.append("%s %s against %s" % (lab_.get(pn, pn), f2(c8, 2), f2(t8, 2)))
    F["treeVerdict"] = "By prompt (chain of 8 against tree of 8): " + "; ".join(per) + ". The tree wins where the draft is unsure (summary, story), because its second and third guesses near the root often hold the target's choice; it loses on the list, where the draft's single chain is almost always right and the tree, capped here at depth 6 and spending nodes on alternatives, cannot reach as deep."
    ex_ = [e for e in tr["examples"] if e["prompt"] != "story" or e["match_tree8"] > e["match_chain"]]
    ex_ = sorted(ex_, key=lambda e: -(e["match_tree8"] - min(8, e["match_chain"])))[:3] + [e for e in tr["examples"] if e["prompt"] == "story"][:1]
    D["tree"] = {"examples": ex_, "means": {k: m(k) for k in ("chain", "tree4", "tree8", "tree16", "tree32")}}

# ---------- section 5 and the crossover lab: llama-server runs at 1 to 16 users ----------
if ex("server_x.json"):
    sx = J("server_x.json"); runs = {}
    for tag, d in sx.items():
        cfg, rep, B = tag.split("_")[1], tag.split("_")[2], int(tag.split("_B")[-1])
        runs.setdefault(cfg, {}).setdefault(B, []).append(d)
    Bs = sorted({B for c in runs.values() for B in c})
    lab = {"base": "no draft", "d3": "0.6B draft, k = 3", "d6": "0.6B draft, k = 6", "s15": "synthetic acceptance length 1.5, k = 4",
           "s25": "synthetic acceptance length 2.5, k = 4", "s35": "synthetic acceptance length 3.5, k = 4", "s45": "synthetic acceptance length 4.5, k = 4"}
    absr, ratio = {}, {}
    for cfg, byB in runs.items():
        absr[cfg] = {B: {"agg": st.mean(d["summary"]["agg_tok_s"] for d in byB[B]), "user": st.mean(d["summary"]["mean_user_tok_s"] for d in byB[B]),
                         "reps": [d["summary"]["agg_tok_s"] for d in byB[B]]} for B in byB}
    for cfg in absr:
        if cfg == "base": continue
        ratio[cfg] = {}
        for B in Bs:
            base = absr["base"][B]["reps"]; v = absr[cfg][B]["reps"]
            rs = [a / b for a in v for b in base]
            ratio[cfg][B] = {"mean": st.mean(v) / st.mean(base), "lo": min(rs), "hi": max(rs)}
    def acclen(cfg):
        d = runs[cfg][1]; n = sum(x["summary"]["tokens"] for x in d); a = sum(x["summary"]["draft_acc"] for x in d)
        return n / (n - a)
    presets = {}
    for cfg, k in (("d3", 3), ("d6", 6)):
        if cfg in runs: presets[cfg] = {"k": k, "L": round(acclen(cfg), 3), "label": lab[cfg] + " (measured acceptance length %s)" % f2(acclen(cfg), 2)}
    for cfg, L in (("s25", 2.5), ("s45", 4.5)):
        if cfg in runs: presets[cfg] = {"k": 4, "L": L, "label": lab[cfg]}
    D["xover"] = {"Bs": Bs, "cfgs": [c for c in lab if c in absr], "label": lab, "abs": absr, "ratio": ratio, "presets": presets}
    loads = [float(x) for d in sx.values() for x in (d.get("load_before") or "{ 0 }").strip("{} ").split()[:1]]
    F["xLoad"] = "One-minute load average before each run: %s to %s (median %s) on 10 cores; other agents shared the machine." % (f2(min(loads), 1), f2(max(loads), 1), f2(st.median(loads), 1))
    r3 = ratio.get("d3", {}); s45 = ratio.get("s45", {})
    F["xNote"] = "llama-server, Qwen3-4B Q4_K_M target and Qwen3-0.6B Q4_K_M draft, one 16-slot server per configuration with B concurrent clients, greedy, mixed prompts, 192 tokens per answer; bars are the lowest and highest ratios over the two sweeps. Synthetic acceptance (llama-server's --spec-synth-len) runs the real draft but fixes the mean acceptance length, so it isolates cost from guess quality."
    if r3 and s45:
        bm = max(Bs, key=lambda B: s45[B]["mean"])
        F["xSummary"] = "on this laptop the 0.6B draft never paid: %sx the plain server's throughput at 1 user, %sx at 16. Even with an artificially excellent drafter (acceptance length 4.5) the best was %sx (at %d users), and %sx at 16." % (
            f2(r3[1]["mean"], 2), f2(r3[max(Bs)]["mean"], 2), f2(s45[bm]["mean"], 2), bm, f2(s45[max(Bs)]["mean"], 2))
        F["xText"] = ("On the laptop the real 0.6B draft (k = 3, measured acceptance length %s on this prompt mix) gave %sx the plain server's throughput at 1 user, %sx at 4 and %sx at 16 users. With llama-server's synthetic acceptance fixing the acceptance length at 4.5, better than any drafter here, the ratio was %sx at 1 user, at best %sx (%d users) and %sx at 16 <span class=\"meas\">measured here</span>. This laptop is past the crossover from the first user: checking 4 guesses costs %sx a one-token step (section 1), so even 4.5 tokens per step barely repays the drafting. On an H100, where the check is nearly free, the same acceptance length would give a large gain at small batch (the lab's H100 setting)." % (
            f2(acclen("d3"), 2), f2(r3[1]["mean"], 2), f2(r3[4]["mean"], 2), f2(r3[max(Bs)]["mean"], 2), f2(s45[1]["mean"], 2), f2(s45[bm]["mean"], 2), bm, f2(s45[max(Bs)]["mean"], 2), f2(m1t(5) / m1t(1), 2)))
    if "q4b" in D["cost"] and "d3" in presets:
        def sp(B, L, k, c):
            return L * m1t(B) / (k * c * m1t(1) * m1t(B, "q06") / m1t(1, "q06") + m1t(B * (k + 1)))
        cD = m1t(1, "q06") / m1t(1)
        F["m1Story"] = "the model predicts %sx at one user, a slow-down." % f2(sp(1, etok(0.5, 4), 4, cD), 2)
        F["m1List"] = "&alpha; around 0.98 gives %sx." % f2(sp(1, etok(0.98, 4), 4, cD), 2)

# ---------- Drafters measured tab ----------
if ex("server_dr.json"):
    exec(open(os.path.join(H, "build_drafters.py")).read())

json.dump(D, open(os.path.join(H, "data.json"), "w"), indent=0)
open(os.path.join(H, "parts", "15_js_sd_data.js"), "w").write("// generated by build_data.py from results/: do not edit\nwindow.SD_DATA=" + json.dumps(D, separators=(",", ":")) + ";\n")
print("facts", len(F), "size", os.path.getsize(os.path.join(H, "parts", "15_js_sd_data.js")))
