"""Writes the page's data parts from recorded outputs (never by hand):
  parts/32_js_ev_0data.js  window.EVD  Eviction lab (kv/out/evict.json)
  parts/33_js_ef_0data.js  window.EFD  Effective context lab (kv/out/map.json, past/out/past.json, past/out/*_log.json)
  parts/22_js_rd_0facts.js window.LCF  every number the prose quotes (filled into [data-lc] spans), also written to facts.json
Run: python3 make_page_data.py (standard library only)."""
import json, os, statistics as st
H = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(H, *p)))
ex = lambda *p: os.path.exists(os.path.join(H, *p))
F = {}


def r2(x, d=2):
    return round(float(x), d)


# ---------------------------------------------------------------- eviction
ev = J("kv/out/evict.json")
POL = ["recent", "sink_recent", "random", "h2o", "snapkv", "snapkv_doc", "local_global"]
QP = ["q_tok8", "q_tok4", "q_tok2", "q_kivi4", "q_kivi2"]


def agg(rows, pol, f, metric=None):
    vals = []
    for r in rows:
        v = r["res"]["full"] if pol == "full" else r["res"].get(pol, {}).get(f)
        if v is None:
            return None
        vals.append(v if metric is None else (float(v[metric]) if metric != "exact" else (1.0 if v["exact"] else 0.0)))
    return st.mean(vals)


series = []
for pol in ["full"] + POL + QP:
    fr = ["1"] if pol == "full" else list(ev["passkey"][0]["res"][pol].keys())
    for f in fr:
        row = {"pol": pol, "f": float(f), "pk": agg(ev["passkey"], pol, f, "exact"), "logp": agg(ev["passkey"], pol, f, "logp")}
        if pol != "snapkv_doc":
            row["copy"] = agg(ev["copy"], pol, f); row["new"] = agg(ev["new"], pol, f)
        if pol in POL:
            s = [r["survive"][pol][f] for r in ev["passkey"] if f in r["survive"][pol]]
            row["surv"] = st.mean(s)
        series.append({k: (r2(v, 4) if isinstance(v, float) else v) for k, v in row.items()})
feat = next(r for r in ev["passkey"] if r["depth"] == 0.5 and r["seed"] == 0)
maps = {}
for pol in POL:
    for f in ["0.25", "0.125"]:
        if f in ev["maps"].get(pol, {}):
            maps[pol + "@" + f] = "".join(str(v) for layer in ev["maps"][pol][f] for head in layer for v in head)
featres = {pol: ({"pred": feat["res"][pol][f]["pred"], "exact": feat["res"][pol][f]["exact"], "surv": feat["survive"][pol].get(f)}
                 if pol in feat["res"] and f in feat["res"][pol] else None) for pol in POL for f in ["0.25", "0.125"] for _ in [0]}
featres = {}
for pol in POL:
    for f in ["0.25", "0.125"]:
        if f in feat["res"].get(pol, {}):
            featres[pol + "@" + f] = {"pred": feat["res"][pol][f]["pred"], "exact": feat["res"][pol][f]["exact"], "surv": feat["survive"][pol][f]}
EVD = {"length": ev["length"], "bpt": ev["bytes_per_token_bf16"], "n_pk": len(ev["passkey"]), "n_copy": len(ev["copy"]), "n_new": len(ev["new"]),
       "series": series, "maps": maps, "bins": 64, "layers": 30, "kvh": 3,
       "feat": {"key": feat["key"], "needle": feat["needle"], "full": feat["res"]["full"]["pred"], "res": featres},
       "check": J("kv/out/check.json")}
S = {(r["pol"], r["f"]): r for r in series}
g = lambda p, f, k: S[(p, f)][k]
pct = lambda v: int(round(100 * v))
F.update({
    "ev_n_pk": len(ev["passkey"]), "ev_full_pk": pct(g("full", 1.0, "pk")), "ev_full_copy": r2(g("full", 1.0, "copy")), "ev_full_new": r2(g("full", 1.0, "new")),
    "ev_snap25_pk": pct(g("snapkv", 0.25, "pk")), "ev_snap125_pk": pct(g("snapkv", 0.125, "pk")), "ev_snap0625_pk": pct(g("snapkv", 0.0625, "pk")),
    "ev_snapdoc50_pk": pct(g("snapkv_doc", 0.5, "pk")), "ev_snapdoc25_pk": pct(g("snapkv_doc", 0.25, "pk")),
    "ev_h2o50_pk": pct(g("h2o", 0.5, "pk")), "ev_h2o125_pk": pct(g("h2o", 0.125, "pk")), "ev_h2o125_new": r2(g("h2o", 0.125, "new")),
    "ev_sr125_pk": pct(g("sink_recent", 0.125, "pk")), "ev_rec50_new": r2(g("recent", 0.5, "new")), "ev_sr50_new": r2(g("sink_recent", 0.5, "new")),
    "ev_copy50_best": r2(min(g(p, 0.5, "copy") for p in ["recent", "sink_recent", "random", "h2o", "snapkv", "local_global"])),
    "ev_lg50_pk": pct(g("local_global", 0.5, "pk")), "ev_lg25_pk": pct(g("local_global", 0.25, "pk")), "ev_lg50_copy": r2(g("local_global", 0.5, "copy")),
    "ev_q8_pk": pct(g("q_tok8", 0.5625, "pk")), "ev_q4_pk": pct(g("q_tok4", 0.3125, "pk")), "ev_k4_pk": pct(g("q_kivi4", 0.3125, "pk")),
    "ev_q2_pk": pct(g("q_tok2", 0.1875, "pk")), "ev_k2_pk": pct(g("q_kivi2", 0.1875, "pk")),
    "ev_q4_copy": r2(g("q_tok4", 0.3125, "copy")), "ev_k4_copy": r2(g("q_kivi4", 0.3125, "copy")), "ev_q2_new": r2(g("q_tok2", 0.1875, "new")), "ev_k2_new": r2(g("q_kivi2", 0.1875, "new")),
    "ev_snap25_copy": r2(g("snapkv", 0.25, "copy")), "ev_snap125_surv": r2(g("snapkv", 0.125, "surv"), 0), "ev_snapdoc50_surv": r2(g("snapkv_doc", 0.5, "surv"), 0),
    "ev_check": "%.1e" % EVD["check"]["max_abs_logit_diff"],
})
F["lg_sum"] = ("at half the cache it answers %d%% of the pass-key questions (full cache %d%%), at a quarter %d%%, and its loss on a story it has already read rises from %.2f to %.2f"
               % (F["ev_lg50_pk"], F["ev_full_pk"], F["ev_lg25_pk"], F["ev_full_copy"], F["ev_lg50_copy"]))

kc = J("kv/out/key_channels.json")
F.update({"kc_k": kc["k_median_ratio"], "kc_v": kc["v_median_ratio"]})

# ---------------------------------------------------------------- effective context
EFD = {}
if ex("kv/out/map.json"):
    mp = J("kv/out/map.json")
    cells = {}
    for r in mp["rows"]:
        cells.setdefault((r["length"], r["depth"]), []).append(r)
    lens = sorted({k[0] for k in cells}); deps = sorted({k[1] for k in cells})
    EFD["map"] = {"lengths": lens, "depths": deps, "maxpos": mp["max_position_embeddings"],
                  "exact": [[sum(x["exact"] for x in cells.get((L, d), [])) for d in deps] for L in lens],
                  "n": [[len(cells.get((L, d), [])) for d in deps] for L in lens],
                  "digits": [[r2(st.mean(x["digits"] for x in cells[(L, d)]), 3) if (L, d) in cells else None for d in deps] for L in lens],
                  "examples": [[cells[(L, d)][0]["pred"], cells[(L, d)][0]["key"]] if (L, d) in cells else None for L in lens for d in deps]}
    acc = {L: sum(sum(x["exact"] for x in cells[(L, d)]) for d in deps if (L, d) in cells) / max(1, sum(len(cells.get((L, d), [])) for d in deps)) for L in lens}
    for L in lens:
        F["map_%d" % L] = pct(acc[L])
    F["map_text"] = ("correct answers out of %d prompts per length: " % (len(deps) * 4) + "; ".join(
        "%s tokens %d%%" % (format(L, ","), pct(acc[L])) for L in lens) + " (the config's max_position_embeddings is %s)." % format(mp["max_position_embeddings"], ","))
if ex("past/out/past.json"):
    pa = J("past/out/past.json")
    EFD["past"] = pa
    for r in pa["runs"]:
        k = (r["model"] + "_" + r["scaling"]).replace(" ", "").replace("x", "")
        for b in ["0-255", "256-511", "512-1023", "1024-2047"]:
            F["past_%s_%s" % (k, b.replace("-", "_"))] = r[b]
    F["past_err"] = pa.get("learned_error", "")
    EFD["ft"] = [J("past/out", f) for f in sorted(os.listdir(os.path.join(H, "past/out"))) if f.endswith("_log.json")]
if ex("wall/out/examples.json"):
    we = J("wall/out/examples.json")["ex"]
    for k, v in we.items():
        F["w_%s_fit" % k] = v["fit"]; F["w_%s_seq" % k] = r2(v["per_seq"] / 1e9); F["w_%s_tok" % k] = r2(v["per_tok"] / 1024)
        F["w_%s_attn" % k] = r2(100 * v["prefill_attn_share"], 1)

w = lambda name, glob, obj: open(os.path.join(H, "parts", name), "w").write(
    "// written by src/make_page_data.py from recorded outputs; do not edit by hand\nwindow.%s=%s;\n" % (glob, json.dumps(obj, separators=(",", ":"))))
w("32_js_ev_0data.js", "EVD", EVD); w("33_js_ef_0data.js", "EFD", EFD); w("22_js_rd_0facts.js", "LCF", F)
json.dump(F, open(os.path.join(H, "facts.json"), "w"), indent=1)
print(len(F), "facts;", {n: os.path.getsize(os.path.join(H, "parts", n)) for n in ["32_js_ev_0data.js", "33_js_ef_0data.js", "22_js_rd_0facts.js"]})
