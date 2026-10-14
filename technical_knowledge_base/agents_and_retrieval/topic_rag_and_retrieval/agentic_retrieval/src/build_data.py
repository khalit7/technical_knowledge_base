"""Build the page's embedded data (parts/22_ar_data.js, window.AR) and the prose numbers (facts.json, used as @@key@@
in the parts) from data/*.json. Deterministic; run before build.sh. check_data.py re-runs it and compares.
Pending numbers stay out of facts.json: the page shows them as dashed pending boxes driven by data/pending.json."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda n: json.load(open(os.path.join(HERE, "data", n)))  # noqa: E731
hops, out, rt, tr, lc, tool, pend = (D(n) for n in ("hops.json", "outcomes.json", "router.json", "traj.json", "longctx.json",
                                                      "tool.json", "pending.json"))
NCOMP = 40  # the first 40 of the 200 questions (the setup's seeded order) are in the Trajectory comparer

f = {}


def fx(k, v, nd=None):
    if nd is not None:
        v = ("{:,.%df}" % nd).format(v)
    elif isinstance(v, int):
        v = "{:,}".format(v)
    f[k] = str(v)


def pct(a, b):
    return "%d%%" % round(100 * a / b)


# second hop
A_ = hops["all"]
fx("h_need", hops["need_second"]); fx("h_first", hops["first_found_h1"])
for v in ("same", "sent", "q_sent", "title", "agent", "decomp"):
    fx("h_%s_top3" % v, A_[v]["top3"]); fx("h_%s_n" % v, A_[v]["n"]); fx("h_%s_med" % v, int(A_[v]["median_rank"]))
fx("h_agent_title", hops["agent_has_title"]); fx("h_agent_n", hops["agent_n"]); fx("h_agent_found", hops["agent_found_h2_need"])
fx("h_r2_med", int(hops["r2_q_median"]))
# strategies (identical to the root's strategies.json)
R = out["res"]
mean = lambda xs: sum(xs) / len(xs)  # noqa: E731
for s in out["strategies"]:
    fx("f1_" + s, mean(R[s]["f1"]), 3); fx("tok_" + s, round(mean(R[s]["tok"])), None); fx("sec_" + s, mean(R[s]["sec"]), 2)
# trajectories
T, B, C = tr["tax"], tr["beh"], tr["cur"]
for s in T:
    for k in ("right", "readwrong", "half", "none", "both_seen", "right_without_both"):
        fx("t_%s_%s" % (s, k), T[s][k])
    fx("t_%s_rgb" % s, "%d%%" % round(100 * T[s]["right_given_both"]))
for k in ("stopped_missing", "stopped_missing_wrong", "repeat", "noaction", "budget_hit", "wasted_after_both", "until_both_n"):
    fx("b_" + k, B[k])
fx("b_found1", B["found_at_search"].get("1", 0)); fx("b_found2", B["found_at_search"].get("2", 0))
fx("b_found34", B["found_at_search"].get("3", 0) + B["found_at_search"].get("4", 0))
for k in ("n", "last_obs", "top2_qt", "top3_qt", "top4_qt", "top3_q", "top2_q"):
    fx("c_" + k, C[k])
for k in ("tok_all", "tok_last", "tok_top2", "tok_top3", "tok_top4", "tok_top2_qt", "tok_top3_qt", "tok_top4_qt"):
    fx("c_" + k, round(C[k]))
# routers
P = rt["policies"]
for k in ("always_single_k5", "always_react", "always_decomp", "oracle_all", "oracle_single_react", "rule_cmp_to_react",
          "rule_bridge_to_react", "crag_ce1_median", "crag_ce1_median_k10", "lr_gain_0.5", "random_half"):
    kk = k.replace(".", "")
    fx("p_%s_f1" % kk, P[k]["f1"], 3); fx("p_%s_tok" % kk, round(P[k]["tok"])); fx("p_%s_exp" % kk, "%d%%" % round(100 * P[k]["share_exp"]))
    fx("p_%s_ci" % kk, "%.3f to %.3f" % tuple(P[k]["f1_ci"]))
AU = rt["auroc"]
for s in ("cue_cmp", "cue_yesno", "s1", "gap", "ce1", "ce2", "ov", "ntok"):
    for t in ("both5", "single_ok", "react_gain"):
        fx("au_%s_%s" % (s, t), AU[s][t], 2)
fx("au_lr_gain", AU["lr_cv"]["react_gain"], 2); fx("au_lr_ok", AU["lr_cv"]["single_ok"], 2)
fx("r_gain_n", rt["react_gain_n"]); fx("r_loss_n", rt["react_loss_n"]); fx("r_tie_n", 200 - rt["react_gain_n"] - rt["react_loss_n"])
fx("r_ok_n", rt["single_ok_n"]); fx("both5_n", sum(out["both5"]))
# long context
a, b, c = lc["coef"]
pre = lambda n: a + b * n + c * n * n / 2 / 1000  # noqa: E731
fx("lc_n", lc["n_calls"]); fx("lc_a", a, 1); fx("lc_b", b, 3); fx("lc_c", c, 3); fx("lc_mape", "%.1f%%" % (100 * lc["mape_test"]))
fx("lc_mape_big", "%.1f%%" % (100 * lc["mape_test_big"])); fx("lc_nbig", lc["n_big"]); fx("lc_max", lc["max_ctx"])
fx("lc_p7611", pre(7611) / 1000, 2); fx("lc_p500", pre(500) / 1000, 2); fx("lc_p8000", pre(8000) / 1000, 1)
fx("lc_p16000", pre(16000) / 1000, 0); fx("lc_p32000", pre(32000) / 1000, 0)
fx("lc_att32", "%d%%" % round(100 * (c * 32000 * 32000 / 2 / 1000) / pre(32000)))
fx("lc_att1500", "%d%%" % round(100 * (c * 1500 * 1500 / 2 / 1000) / pre(1500)))
fx("lc_d0", lc["decode_coef"][0], 1); fx("lc_d1", lc["decode_coef"][1], 2)
kv17 = lc["cfg"]["Qwen3-1.7B"]["kv_bytes_per_token_fp16"]; kv4 = lc["cfg"]["Qwen3-4B"]["kv_bytes_per_token_fp16"]
fx("kv17", kv17); fx("kv4", kv4); fx("kv17_kib", kv17 // 1024); fx("kv4_kib", kv4 // 1024)
fx("kv17_32k", kv17 * 32768 / 2 ** 30, 1); fx("kv4_32k", kv4 * 32768 / 2 ** 30, 1)
# tool
S_ = tool["schema"]
for k in ("bare", "text", "json", "json_plus_rules"):
    fx("sch_" + k, S_[k])
for k in ("full", "first", "titles", "json"):
    fx("fmt_" + k, round(tool["formats"][k]))
fx("first_sent", tool["first_sent"]); fx("n_sf", tool["n_sf"]); fx("first_sent_pct", pct(tool["first_sent"], tool["n_sf"]))
fx("form_mape", "%.1f%%" % (100 * tool["formula_mape"])); fx("form_max", "%d%%" % round(100 * tool["formula_max_err"]))
fx("s_mean", round(tool["s_mean"])); fx("r_mean", round(tool["r_mean"])); fx("billed_mean", round(tool["billed_mean"]))
fx("prefilled_mean", round(tool["prefilled_mean"])); fx("n_searches", tool["n_searches"])
for n, v in tool["by_n"].items():
    fx("bn%s_q" % n, v["q"]); fx("bn%s_b" % n, round(v["billed"])); fx("bn%s_p" % n, round(v["pred"])); fx("bn%s_f" % n, round(v["prefilled"]))

json.dump(f, open(os.path.join(HERE, "facts.json"), "w"), indent=0, sort_keys=True)

# ---------------------------------------------------------------- the embedded object
keep = ["closed", "single_k2", "single_k5", "single_k10", "decomp", "react", "longctx", "longctx_tokens8000"]
AR = {
    "hops": {k: hops[k] for k in ("all", "examples", "titles", "need_second")},
    "out": {"strategies": keep, "type": out["type"], "cue_cmp": out["cue_cmp"], "cue_yesno": out["cue_yesno"], "s1": out["s1"],
            "gap": out["gap"], "ce1": out["ce1"], "ce2": out["ce2"], "ov": out["ov"], "both5": out["both5"],
            "res": {s: {k: out["res"][s][k] for k in ("f1", "em", "tok", "sec", "srch")} for s in keep}},
    "rt": {"p_gain": rt["p_gain"], "auroc": rt["auroc"], "policies": {k: rt["policies"][k] for k in rt["policies"]}},
    "tax": T, "beh": B, "cur": C,
    "comp": {"q": out["q"][:NCOMP], "gold": out["gold"][:NCOMP], "type": out["type"][:NCOMP], "rows": tr["comp"][:NCOMP]},
    "lc": {k: lc[k] for k in ("coef", "pts", "cfg", "acc", "decode_coef", "mape_test", "max_ctx")},
    "tool": {k: tool[k] for k in ("schema", "formats", "by_n")},
    "pend": pend,
}
# titles: only those the comparer's 60 questions reference, re-indexed
used = sorted({i for e in AR["comp"]["rows"] for i in e["g"]} |
              {i for e in AR["comp"]["rows"] for s in ("single_k5", "decomp", "react") for st in e[s]["st"] if st[0] == "s" for i in st[2]})
remap = {o: n for n, o in enumerate(used)}
for e in AR["comp"]["rows"]:
    e["g"] = [remap[i] for i in e["g"]]
    for s in ("single_k5", "decomp", "react"):
        for st in e[s]["st"]:
            if st[0] == "s":
                st[2] = [remap[i] for i in st[2]]
AR["comp"]["titles"] = [tr["titles"][o] for o in used]
js = "window.AR=" + json.dumps(AR, separators=(",", ":"), ensure_ascii=False, sort_keys=True) + ";\n"
open(os.path.join(HERE, "parts", "22_ar_data.js"), "w").write(js)
print("facts", len(f), "data js", len(js), "bytes")
