"""Recompute the numbers the prose quotes, from the redacted recordings (independently of build_data.py and the
page's JavaScript), and compare them with the values the built page shows.
usage: python3 check.py <fmv.json>   (fmv.json: [[key, shown text], ...] dumped from the rendered page)
Also checks that every recording folder is embedded in parts/20_js_data.js and nothing else is.
"""
import collections, glob, gzip, json, os, re, sys
from itertools import combinations

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
shown = {}
for k, v in json.load(open(sys.argv[1])):
    shown.setdefault(k, set()).add(v)
KEY = {(t["file"], t["function"]) for t in json.load(open(os.path.join(HERE, "inputs", "audit_truth.json")))["mismatches"]}
fails, n = [], 0


def load(p):
    if not os.path.exists(p) and os.path.exists(p + ".gz"):
        p = p + ".gz"
    f = gzip.open(p, "rt") if p.endswith(".gz") else open(p)
    return [json.loads(l) for l in f if l.strip()]


def last_result(p):
    r = [x for x in load(p) if x.get("type") == "result"]
    return r[-1] if r else None


def expect(key, val):
    global n
    n += 1
    if key not in shown:
        fails.append(f"{key}: not on page (expected {val})")
    elif val not in shown[key]:
        fails.append(f"{key}: page shows {shown[key]}, recomputed {val}")


def nf(x, d=0):
    return f"{x:,.{d}f}"


def usd(x):
    return "$" + (nf(x, 2) if x >= 1 else nf(x, 3) if x >= 0.1 else nf(x, 4))


def secs(x):
    return nf(x / 60, 1) + " min" if x >= 90 else nf(x, 0) + " s"


# --- the parent page's runs
base = os.path.join(HERE, "..", "..", "src", "orch", "recordings")
R = {}
for k, run in (("s", "agent"), ("m", "multi")):
    s = json.load(open(os.path.join(base, run, "summary.json")))
    e = s["events"][0]
    mu = list(e["modelUsage"].values())[0]
    R[k] = dict(cost=e["cost"], wall=s["wall"], proc=mu["inputTokens"] + mu["cacheCreationInputTokens"] + mu["cacheReadInputTokens"])
expect("root.s.cost", usd(R["s"]["cost"]))
expect("root.m.cost", usd(R["m"]["cost"]))
expect("root.cost_x", nf(R["m"]["cost"] / R["s"]["cost"], 1) + "x")
expect("root.wall_x", nf(R["m"]["wall"] / R["s"]["wall"], 1) + "x")
expect("root.proc_x", nf(R["m"]["proc"] / R["s"]["proc"], 1) + "x")


# --- audit
def norm(f):
    fn = f.get("file", "").strip()
    return (fn if fn.startswith("fleetops/") else "fleetops/" + os.path.basename(fn), f.get("function", "").strip())


A = collections.defaultdict(list)
for d in sorted(glob.glob(os.path.join(REC, "audit_*"))):
    s = json.load(open(os.path.join(d, "summary.json")))
    found = {norm(f) for f in s["answer"] if isinstance(f, dict)}
    cost = sum((last_result(os.path.join(d, os.path.basename(a["path"]))) or {}).get("total_cost_usd") or 0 for a in s["agents"])
    A[(s["design"], s["model"])].append(dict(rep=s["rep"], tp=len(found & KEY), fp=len(found - KEY), cost=cost, wall=s["wall"], s=s, d=d))
for v in A.values():
    v.sort(key=lambda r: str(r["rep"]))
mean = lambda xs: sum(xs) / len(xs)
mc = lambda d: mean([r["cost"] for r in A[(d, "haiku")]])
mw = lambda d: mean([r["wall"] for r in A[(d, "haiku")]])
expect("aud.multi_vs_single", nf(mc("multi") / mc("single"), 1) + " times")
expect("aud.fan_vs_multi", nf(100 * mc("fanout") / mc("multi"), 0) + "%")
expect("aud.fan_vs_multi_wall", nf(100 * mw("fanout") / mw("multi"), 0) + "%")
so = A[("single", "sonnet")][0]
expect("aud.sonnet.cost", usd(so["cost"]))
expect("aud.sonnet.wall", secs(so["wall"]))
peak = 0
for x in load(os.path.join(so["d"], "agent.jsonl")):
    if x.get("type") == "assistant":
        u = x["message"]["usage"]
        peak = max(peak, u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0))
expect("aud.sonnet.peak", nf(peak))
# single run 1: partial reads and calls
recs = load(os.path.join(A[("single", "haiku")][0]["d"], "agent.jsonl"))
ids, partial = set(), 0
for x in recs:
    if x.get("type") == "assistant":
        ids.add(x["message"]["id"])
        for c in x["message"]["content"]:
            if c.get("type") == "tool_use" and c["name"] == "Read" and (c["input"].get("offset") or c["input"].get("limit")):
                partial += 1
expect("aud.s1.partial", str(partial))
expect("aud.s1.calls", str(len(ids)))
# module-text tokens
fo = A[("fanout", "haiku")][0]
ins = []
for a in fo["s"]["agents"]:
    for x in load(os.path.join(fo["d"], os.path.basename(a["path"]))):
        if x.get("type") == "assistant":
            u = x["message"]["usage"]
            ins.append(u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"])
            break
pr = last_result(os.path.join(REC, "probe", "empty_fanout_prompt.jsonl"))["usage"]
ovh = pr["input_tokens"] + pr["cache_creation_input_tokens"] + pr["cache_read_input_tokens"]
expect("aud.ovh", nf(ovh))
expect("aud.tok", nf(round((sum(ins) - len(ins) * ovh) / 1000)) + ",000")


# --- blackboard
def extras(r):
    return r["fp"]


expect("bb.board.x", " and ".join(str(r["fp"]) for r in A[("board", "haiku")]))
orig = A[("board", "haiku")] + A[("boardv", "haiku")] + A[("boardb", "haiku")]
expect("bb.orig.n", str(len(orig)))
expect("bb.orig.xruns", str(sum(1 for r in orig if r["fp"] > 0)))
cs = A[("checkshown", "haiku")][0]
expect("bb.n", str(len(cs["s"]["extra"]["posted"])))
sh = A[("boardsharp", "haiku")]
expect("bb.sharp.tp", " and ".join(str(r["tp"]) for r in sh))
expect("bb.sharp.x", " and ".join(str(r["fp"]) for r in sh))
expect("bb.sharp.cost", usd(mean([r["cost"] for r in sh])))
for k, d in (("checkshown", "shown"), ("checkblind", "blind")):
    r = A[(k, "haiku")][0]
    kept = len({norm(f) for f in r["s"]["answer"]})
    print(f"check-only {d}: kept {kept} of {len(r['s']['extra']['posted'])} (distinct functions)")

# --- handoffs
H = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(REC, "handoff_runs", "*.json")))]
expect("ho.n", str(len(H)))
# --- write
W = [json.load(open(os.path.join(d, "summary.json"))) for d in sorted(glob.glob(os.path.join(REC, "wopen_*")))]
okf = lambda c: all(c.get(k) for k in ("ran", "is_table", "has_count", "has_distinct", "has_top", "top_order"))
expect("wr.open.par", str(sum(1 for w in W if w["design"] == "parallel" and okf(w["check"]))))
po = sum(1 for w in W if w["design"] == "parallel" and okf(w["check"]))
co = sum(1 for w in W if w["design"] == "contract" and okf(w["check"]))
if f"halves fitted in {po} of 3 runs; contract first: {co} of 3" not in open(os.path.join(HERE, "parts", "22_js_fm_common.js")).read():
    fails.append("summary row for parallel writers does not match the recordings")
C_ = json.load(open(os.path.join(HERE, "inputs", "audit_corpus_stats.json")))
expect("aud.lmin", str(C_["lines_min"]))
expect("aud.lmax", str(C_["lines_max"]))

# --- debate, recomputed from the raw answers
pz = json.load(open(os.path.join(HERE, "inputs", "puzzles9.json")))["puzzles"][:30]
ans_re = re.compile(r"ANSWER:\s*\**\s*([KNkn\s,]+)", re.I)


def ans(pid, lab):
    r = last_result(os.path.join(REC, "deb9", f"{pid}_{lab}.jsonl"))
    m = ans_re.findall(r.get("result") or "")
    return re.sub(r"[^KN]", "", m[-1].upper()) if m else None


def maj(a):
    c, best, bn = {}, None, 0
    for x in a:
        if not x:
            continue
        c[x] = c.get(x, 0) + 1
        if c[x] > bn:
            bn, best = c[x], x
    return best


A_ = {p["id"]: {l: ans(p["id"], l) for l in ["s1", "s2", "s3", "s4", "s5", "d1", "d2", "d3", "j"]} for p in pz}
T_ = {p["id"]: p["answer"] for p in pz}
cnt = lambda f: sum(1 for p in pz if f(A_[p["id"]]) == T_[p["id"]])
res = {"single": cnt(lambda a: a["s1"]), "vote3": cnt(lambda a: maj([a["s1"], a["s2"], a["s3"]])),
       "vote5": cnt(lambda a: maj([a[k] for k in ["s1", "s2", "s3", "s4", "s5"]])),
       "debate": cnt(lambda a: maj([a["d1"], a["d2"], a["d3"]])), "judge": cnt(lambda a: a["j"])}
for k, v in res.items():
    expect("deb." + k, f"{v} of 30")
wr = sum(1 for p in pz for i in (1, 2, 3) if A_[p["id"]][f"s{i}"] != T_[p["id"]] and A_[p["id"]][f"d{i}"] == T_[p["id"]])
rw = sum(1 for p in pz for i in (1, 2, 3) if A_[p["id"]][f"s{i}"] == T_[p["id"]] and A_[p["id"]][f"d{i}"] != T_[p["id"]])
expect("deb.wr", str(wr))
expect("deb.rw", str(rw))
# static summary strings in parts/22_js_fm_common.js must match the recomputed values
src = open(os.path.join(HERE, "parts", "22_js_fm_common.js")).read()
static = f"one sample {res['single']}, vote of 5 {res['vote5']}, debate {res['debate']}, one judge call {res['judge']}"
if static not in src:
    fails.append("summary row for debate does not match: expected " + static)
par_ok = sum(1 for w in W if w["design"] == "parallel" and okf(w["check"])) if False else None

# --- recordings embedded exactly
data = json.loads(open(os.path.join(HERE, "parts", "20_js_data.js")).read()[len("window.FM="):-2])
dirs = {os.path.basename(d) for d in glob.glob(os.path.join(REC, "audit_*"))}
emb = {r["run"] for r in data["audit"]["runs"]}
if dirs != emb:
    fails.append(f"audit runs embedded {sorted(emb ^ dirs)} differ from recordings")
wd = {os.path.basename(d) for d in glob.glob(os.path.join(REC, "write_*")) + glob.glob(os.path.join(REC, "wopen_*"))}
if wd != {w["run"] for w in data["write"]}:
    fails.append("write runs embedded differ from recordings")
if len(data["handoffs"]) != len(H):
    fails.append("handoff runs embedded differ from recordings")
deb = {os.path.basename(f).split("_")[0] for f in glob.glob(os.path.join(REC, "deb9", "*.jsonl.gz"))}
if deb != {p["id"] for p in data["debate"]["puzzles"] if p["calls"]}:
    fails.append("debate puzzles embedded differ from recordings")
print(f"{n} prose values checked; {len(fails)} problems")
for f in fails:
    print("  ", f)
