"""Recompute the page's derived numbers from results/ with code written separately from build_data.py,
and compare with data.json's facts. Also checks the formula identities quoted in the prose.
usage: python3 -I recompute.py   (exit 1 on any mismatch)"""
import json, os, math, sys
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, "results")
D = json.load(open(os.path.join(H, "data.json"))); F = D["facts"]; bad = 0
def check(name, got, want_str, tol=0.006):
    global bad
    if want_str is None: return
    w = float(str(want_str).replace(",", "").rstrip("%x"))
    ok = abs(got - w) <= tol * max(1, abs(w)) + 0.5 * 10 ** -(len(str(want_str).split(".")[-1]) if "." in str(want_str) else 0)
    print(("ok  " if ok else "BAD ") + name, round(got, 4), want_str)
    bad += not ok
# formula identities in the prose
E = lambda a, k: (1 - a ** (k + 1)) / (1 - a)
for a, k, v in ((0.7, 4, 2.77), (0.5, 4, 1.94), (0.9, 4, 4.10)):
    check("E(%s,%s)" % (a, k), E(a, k), str(v))
check("cap 1/(1-0.7)", 1 / 0.3, "3.33")
# pass-time curve
def curve(fn):
    rows = json.load(open(os.path.join(R, fn)))["curve"]; return {int(r[0]): r[1] for r in rows}
if os.path.exists(os.path.join(R, "lb_Qwen3-4B-Q4_K_M.json")):
    c = curve("lb_Qwen3-4B-Q4_K_M.json")
    check("ratio5", c[5] / c[1], F.get("ratio5")); check("t1ms", c[1], F.get("t1ms")); check("tps4b", 1000 / c[1], F.get("tps4b"))
    d = curve("lb_Qwen3-0.6B-Q4_K_M.json"); check("cDraft", d[1] / c[1], F.get("cDraft"))
# H100 derived flat region (separate implementation: bytes and FLOPs written out)
W, KV, P = 9080934400.0, 131072, 8030261248
def h(n, ctx=1024):
    mem = (W + ctx * KV) / (0.8 * 3.35e12)
    cmp_ = n * (2 * P + 2 * 32 * 256 * 32 * ctx) / (0.345 * 1979e12)
    return 1000 * max(mem, cmp_) + 2.5
n = 1
while h(n + 1) <= 1.1 * h(1): n += 1
check("h100flat", n, F.get("h100flat"), tol=0)
# tokens-per-step formula against the real runs
ac = json.load(open(os.path.join(R, "accept.json")))
groups = {}
for r in ac["runs"]:
    groups.setdefault((r["prompt"], r["T"]), []).append(r)
errs = []
for key, rs in groups.items():
    al = [a for r in rs for s in r["steps"] for a in s["a"]]; alpha = sum(al) / len(al)
    for k in sorted({r["k"] for r in rs}):
        v = [r["n_out"] / len(r["steps"]) for r in rs if r["k"] == k]; m = sum(v) / len(v)
        errs.append(abs(E(alpha, k) / m - 1))
errs.sort(); med = (errs[len(errs) // 2 - 1] + errs[len(errs) // 2]) / 2 if len(errs) % 2 == 0 else errs[len(errs) // 2]
check("yieldMed", 100 * med, F.get("yieldMed"), tol=0.02); check("yieldMax", 100 * max(errs), F.get("yieldMax"), tol=0.02)
# exactness: the facts quoted
ex = json.load(open(os.path.join(R, "exact_story_stats.json")))
check("bugChi2", ex["variants"]["bug_resample_p"]["chi2"], F.get("bugChi2"))
# tree means
if os.path.exists(os.path.join(R, "tree.json")):
    tr = json.load(open(os.path.join(R, "tree.json"))); rows = [r for p in tr["prompts"].values() for r in p["rows"]]
    check("treeChain8", sum(min(8, r["chain"]) for r in rows) / len(rows), F.get("treeChain8"))
    check("treeTree8", sum(r["tree8"] for r in rows) / len(rows), F.get("treeTree8"))
# crossover ratios: recomputed from per-request token counts and wall times
if os.path.exists(os.path.join(R, "server_x.json")):
    sx = json.load(open(os.path.join(R, "server_x.json")))
    agg = {}
    for tag, d in sx.items():
        cfg, B = tag.split("_")[1], int(tag.split("_B")[-1])
        agg.setdefault((cfg, B), []).append(sum(q["n_out"] for q in d["requests"]) / d["summary"]["wall"])
    for cfg in ("d3", "s45"):
        for B in (1, 16):
            if (cfg, B) in agg:
                r = (sum(agg[(cfg, B)]) / len(agg[(cfg, B)])) / (sum(agg[("base", B)]) / len(agg[("base", B)]))
                want = D["xover"]["ratio"][cfg][str(B)]["mean"]
                check("ratio %s B%d" % (cfg, B), r, "%.4f" % want, tol=0.001)
print("bad=%d" % bad); sys.exit(1 if bad else 0)
