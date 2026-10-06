"""Recompute every derived number the page quotes, from src/recordings/fgw_runs.json only.
Prints name = value lines; check_page.py compares them with the page text and the page's own JavaScript."""
import json, os

D = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings", "fgw_runs.json")))
V = {}

# E1
for c in D["e1"]["cases"]:
    V["e1 " + c["s"]] = f'A {c["count"]["A"]} B {c["count"]["B"]} wall {c["wall"]:.2f}'

# E2: calls reaching C, user errors, longest bench gap
for c in D["e2"]:
    callsC = [a for r in c["reqs"] for a in r["att"] if a[0] == "C"]
    V["e2 " + c["key"]] = f'C calls {len(callsC)}, user errors {sum(not r["ok"] for r in c["reqs"])}, first C times {[round(a[2], 1) for a in callsC][:6]}'
single = next(c for c in D["e2"] if c["key"] == "single")
V["e2 single mean s per request"] = round(sum(r["t1"] - r["t0"] for r in single["reqs"]) / len(single["reqs"]), 2)

# E3: attempts = product of (1 + retries)
for c in D["e3"]["cases"]:
    V["e3 " + c["key"]] = f'attempts {len(c["att"])}, last start {max(a[0] for a in c["att"]):.1f}, user error at {c["done"]:.1f}, provider work {sum(a[1]-a[0] for a in c["att"]):.0f} s, sends {sum(1 for e in c["ev"] if e[0] == "client sends")}'
V["e3 formula"] = (1 + 2) * (1 + D["e3"]["gateway"]["num_retries"])

# E4: anchored fixed window replay must reproduce every accept/reject
# The limiter compares whole wall-clock seconds (int(time)); the recording stores times relative to the run's
# start, so the start's fraction of a second (PHI) is unknown. Fitted: for the steady trace only offsets
# 0.9960 to 0.9969 and 0.9980 to 0.9989 reproduce all 130 decisions; the burst trace is reproduced at any offset.
PHI = {"steady": 0.9965, "burst": 0.0}


def anchored(times, limit, phi=0.0, win=60):
    start, n, out = None, 0, []
    for t in times:
        ti = int(t + phi)
        if start is None or ti - start >= win:
            start, n = ti, 0
        n += 1
        out.append(200 if n <= limit else 429)
    return out

for k in ("steady", "burst"):
    tr = D["e4"][k]
    sim = anchored([t for t, _ in tr], D["e4"]["rpm"], PHI[k])
    V["e4 " + k + " reproduced"] = sum(a == s for (t, a), s in zip(tr, sim)), len(tr)
    V["e4 " + k + " accepted"] = sum(1 for _, s in tr if s == 200)
b = D["e4"]["burst"]
acc = [t for t, s in b if s == 200 and t >= 50]
V["e4 burst accepted in window"] = f"{len(acc)} between {min(acc):.1f} and {max(acc):.1f}"
V["e4 steady accepted at"] = [round(t) for t, s in D["e4"]["steady"] if s == 200]

# E5 budgets
V["e5 seq accepted"] = sum(1 for x in D["e5"]["seq"] if x[2] == 200)
V["e5 conc accepted"] = sum(1 for x in D["e5"]["conc"] if x[2] == 200)
for k, w in D["e5"]["waves"].items():
    V["e5 " + k] = f'wave1 {sum(1 for x in w["r"] if x[0]==1 and x[3]==200)}, wave2 {sum(1 for x in w["r"] if x[0]==2 and x[3]==200)}, spend {w["spend"]}'
V["e5 reservation no max_tokens (output only) USD"] = 16384 * 5e-6
V["e5 calls that fit"] = round(D["e5"]["budget"] / D["e5"]["per_call"], 6)

# E6
for s in D["e6"]["steps"]:
    V["e6 " + s["k"]] = f'{s["s"]} s, key {s["key"] or "-"}'

# OpenRouter inverse-square shares (input price over all listed endpoints)
for m, eps in D["or_eps"].items():
    w = [1 / e["in"] ** 2 for e in eps]
    tot = sum(w)
    sh = sorted(((x / tot, e["p"], e["tag"]) for x, e in zip(w, eps)), reverse=True)
    V["or " + m] = f'{len(eps)} endpoints, in ${min(e["in"] for e in eps):.2f}-{max(e["in"] for e in eps):.2f}/M, ctx {min(e["ctx"] for e in eps)}-{max(e["ctx"] for e in eps)}, top two {100*(sh[0][0]+sh[1][0]):.1f}%'
V["or counts"] = D["or_count"]

# Router experiment
T = D["router"]["tasks"]
n = len(T)
weak = sum(t["lok"] for t in T); strong = sum(t["hok"] for t in T)
V["router n, local right, haiku right"] = (n, weak, strong)
fam = {}
for t in T:
    f = fam.setdefault(t["f"], [0, 0, 0]); f[0] += t["lok"]; f[1] += t["hok"]; f[2] += 1
V["router by family (local, haiku, n)"] = fam
V["router local no ANSWER line"] = sum(1 for t in T if t["lo"] is None)
orc = [t for t in T if not t["lok"] and t["hok"]]
V["router oracle"] = f'{weak + len(orc)} right with {len(orc)} strong calls ({100*len(orc)/n:.1f}%)'
cr_strong = [t for t in T if t["tier"] != "SIMPLE"]
acc_cr = sum(t["hok"] if t["tier"] != "SIMPLE" else t["lok"] for t in T)
share = len(cr_strong) / n
V["router complexity (non-SIMPLE to strong)"] = f'{acc_cr} right with {len(cr_strong)} strong calls ({100*share:.1f}%)'
V["router random expected at same share"] = round(weak + share * (strong - weak), 2)
V["router APGR complexity"] = round((acc_cr - weak) / (strong - weak), 3)
V["router haiku cost total USD"] = round(sum(t["hc"] for t in T), 4)
V["router haiku cost mean USD"] = round(sum(t["hc"] for t in T) / n, 5)
V["router complexity tiers"] = {k: sum(1 for t in T if t["tier"] == k) for k in sorted({t["tier"] for t in T})}

if __name__ == "__main__":
    for k, v in V.items():
        print(k, "=", v)


# The same two traces through three other limiters (rate 10 per 60 s), as in the Limits lab.
# Rejected requests do not consume capacity in any of them.
def token_bucket(times, cap=10, per=60.0):
    tok, last, out = float(cap), None, []
    for t in times:
        if last is not None:
            tok = min(cap, tok + (t - last) * cap / per)
        last = t
        if tok >= 1 - 1e-9:
            tok -= 1; out.append(200)
        else:
            out.append(429)
    return out


def sliding_log(times, limit=10, win=60.0):
    acc, out = [], []
    for t in times:
        acc = [a for a in acc if t - a < win]
        if len(acc) < limit:
            acc.append(t); out.append(200)
        else:
            out.append(429)
    return out


def calendar_window(times, limit=10, win=60, phi=0.0):
    cur, n, out = None, 0, []
    for t in times:
        w = int((t + phi) // win)
        if w != cur:
            cur, n = w, 0
        if n < limit:
            n += 1; out.append(200)
        else:
            out.append(429)
    return out


for k in ("steady", "burst"):
    ts = [t for t, _ in D["e4"][k]]
    for name, f in (("token bucket", token_bucket), ("sliding log", sliding_log), ("calendar minute", calendar_window)):
        r = f(ts)
        best15 = max(sum(1 for t, s in zip(ts, r) if s == 200 and a <= t < a + 15) for a in ts)
        V[f"lim {k} {name}"] = f"accepted {r.count(200)}, most in any 15 s {best15}"
    r = [s for _, s in D["e4"][k]]
    V[f"lim {k} litellm recorded"] = f"accepted {r.count(200)}, most in any 15 s {max(sum(1 for t, s in zip(ts, r) if s == 200 and a <= t < a + 15) for a in ts)}"

if __name__ == "__main__":
    for k in [k for k in V if k.startswith("lim ")]:
        print(k, "=", V[k])
