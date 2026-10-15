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
if lc.get("ext_n"):
    fx("lc_ext_n", lc["ext_n"]); fx("lc_ext_mape", "%.1f%%" % (100 * lc["ext_mape"])); fx("lc_ext_max", lc["ext_max_ctx"])
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

# pending runs: a fact is the measured number when the run exists, else a dashed "pending" marker
PV = '<span class="ar-pv">pending</span>'


def pf(key, d, field="f1", nd=3, fmt=None):
    if d and d.get(field) is not None:
        v = d[field]
        f[key] = fmt(v) if fmt else (("{:,.%df}" % nd).format(v) if isinstance(v, float) and nd else "{:,}".format(round(v)))
    else:
        f[key] = PV


for j in ("selfask_v1_heldout", "ircot_i2_heldout", "ircot", "selfask", "flare", "crag", "ircot_4b", "selfask_4b", "flare_4b", "crag_4b", "ircot_heldout", "selfask_heldout", "flare_heldout", "crag_heldout"):
    pf("pd_%s_f1" % j, pend.get(j)); pf("pd_%s_tok" % j, pend.get(j), "tok", 0); pf("pd_%s_sec" % j, pend.get(j), "sec", 2)
    pf("pd_%s_srch" % j, pend.get(j), "srch", 2); pf("pd_%s_both" % j, pend.get(j), "both", 0)
    for fld in ("one_search", "max_search", "self_stop", "right"):
        pf("pd_%s_%s" % (j, fld), pend.get(j), fld, 0)
    d = pend.get(j)
    f["pd_%s_rgb" % j] = ("%d%%" % round(100 * d["right_given_both"])) if d and "right_given_both" in d else PV
    f["pd_%s_ci" % j] = ("%.3f to %.3f" % tuple(d["f1_ci"])) if d else PV
for b in ("budget1", "budget2", "budget3", "budget6", "k1", "k5"):
    pf("pd_react_%s_f1" % b, pend.get("react_" + b)); pf("pd_react_%s_tok" % b, pend.get("react_" + b), "tok", 0)
for b in ("budget2", "budget6"):
    pf("pd_react_4b_%s_f1" % b, pend.get("react_4b_" + b)); pf("pd_react_4b_%s_tok" % b, pend.get("react_4b_" + b), "tok", 0)
for h in ("all", "last", "top3", "react_same"):
    pf("pd_mem_%s_f1" % h, (pend.get("memory") or {}).get(h)); pf("pd_mem_%s_tok" % h, (pend.get("memory") or {}).get(h), "tok", 0)
    pf("pd_mem_%s_n" % h, (pend.get("memory") or {}).get(h), "n", 0)
for b, v in (pend.get("react_vs_root") or {}).items():
    f["pd_rvr_%s" % b] = "%+.3f (paired 95%% interval %+.3f to %+.3f)" % (v["d"], v["ci"][0], v["ci"][1])
for b in ("budget1", "budget2", "budget3", "budget6", "k1", "k5"):
    f.setdefault("pd_rvr_%s" % b, PV)
sc = pend.get("selfcheck")
for k in ("supported", "n", "supported_right", "unsupported_right"):
    pf("pd_sc_" + k, sc, k, 0)
pf("pd_sc_f1", sc, "policy_f1"); pf("pd_sc_tok", sc, "policy_tok", 0)
cv = pend.get("crag_verdicts")
for k in ("correct", "ambiguous", "incorrect"):
    f["pd_crag_" + k] = str(cv[k]) if cv else PV
rl, rp = pend.get("router_labels"), pend.get("router_policy")
for k in ("NONE", "ONE", "MANY"):
    f["pd_rt_" + k] = str(rl[k]) if rl else PV
pf("pd_rt_f1", rp); pf("pd_rt_tok", rp, "tok", 0)
LIM = pend.get("lim") or {}
for N in ("5", "10", "40", "80"):
    for rel in ("0.00", "0.25", "0.50", "0.75", "1.00"):
        v = (LIM.get(N) or {}).get(rel)
        f["lim_%s_%s" % (N, rel.replace(".", ""))] = ("%.3f" % v) if v is not None else PV
    t = (pend.get("lim_tok") or {}).get(N)
    f["lim_tok_%s" % N] = "{:,}".format(int(t)) if t else PV
f["lim_hw"] = ("%.2f" % pend["lim_halfwidth"]) if pend.get("lim_halfwidth") else PV
if LIM:
    f["lim_80_loss"] = "%d%%" % round(100 * (1 - LIM["80"]["0.50"] / LIM["80"]["0.00"]))
else:
    f["lim_80_loss"] = PV
RPOS = (pend.get("root_position") or {})
for m in ("1.7b", "4b"):
    for sl in ("0", "4", "9", "14", "18"):
        v = (RPOS.get(m) or {}).get("f1", {}).get(sl)
        f["pos_%s_%s" % (m.replace(".", ""), sl)] = ("%.3f" % v) if v is not None else PV
# root's router on its mixed one-hop/two-hop set (committed out/router.json)
RR = json.load(open(os.path.join(HERE, "..", "..", "src", "agent", "out", "router.json")))
for k, kk in (("always pipeline", "pipe"), ("always agent", "agent"), ("router: embed-LR", "lr"), ("router: llm", "llm"), ("oracle router", "oracle")):
    f["rr_%s_f1" % kk] = "%.3f" % RR[k]["f1"]
    f["rr_%s_tok" % kk] = "{:,}".format(round(RR[k]["tok"]))
f["rr_n"] = str(RR["n_multi"] + RR["n_single"])
PR = rt["paired"]
for k in ("rule_cmp_to_react", "crag_ce1_median", "always_react", "always_longctx", "always_single_k10"):
    f["pr_%s_d" % k] = "%+.3f" % PR[k]["vs_single"]
    f["pr_%s_ci" % k] = "%+.3f to %+.3f" % tuple(PR[k]["vs_single_ci"])
for k in ("n", "single", "react", "n_type_cmp"):
    f["cmp_" + k] = str(PR["cmp_subset"][k])
# the first 1.7B runs (answer prompt s2, kept by the root as strategies_s2prompt.json)
S2 = json.load(open(os.path.join(HERE, "..", "..", "src", "agent", "out", "strategies_s2prompt.json")))
for k, kk in (("test_1.7b_single_k5", "k5"), ("test_1.7b_longctx", "lc"), ("test_1.7b_single_k10", "k10")):
    if k in S2:
        f["s2_%s_f1" % kk] = "%.3f" % S2[k]["f1"]
# root's 4B runs (strategies.json)
SJ = json.load(open(os.path.join(HERE, "..", "..", "src", "agent", "out", "strategies.json")))
for s_, v in SJ.get("4b", {}).items():
    f["f1_4b_" + s_] = "%.3f" % v["f1"]

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
    "lc": {k: lc.get(k) for k in ("coef", "pts", "ext_pts", "cfg", "acc", "decode_coef", "mape_test", "max_ctx")},
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
