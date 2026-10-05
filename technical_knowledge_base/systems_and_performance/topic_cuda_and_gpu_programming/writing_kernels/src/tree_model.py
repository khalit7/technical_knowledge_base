"""Python reference for the toy machine of the 'Reduce and scan, animated' tab (parts/31_js_tree0.js), written
independently from the same rules: 16 values, warps of 4 lanes, 4 shared-memory banks. Writes
out/tree_expected.json (final arrays and counter totals per method); check/check_js.mjs compares the page's JS.
Also checks the arithmetic itself: the reductions must end with the sum at index 0, Hillis-Steele with the inclusive
scan, Blelloch with the exclusive scan."""
import json, os
N, WS, NB = 16, 4, 4
X = [3, 1, 7, 0, 4, 1, 6, 3, 2, 5, 1, 4, 0, 6, 2, 3]


def steps(m):
    S = []
    if m == "r1":
        s = 1
        while s < N:
            S.append(dict(kind="smem", ops=[dict(t=t, d=t, s=t + s, add=1) for t in range(N) if t % (2 * s) == 0])); s *= 2
    if m == "r2":
        s = 1
        while s < N:
            S.append(dict(kind="smem", ops=[dict(t=t, d=2 * s * t, s=2 * s * t + s, add=1) for t in range(N) if 2 * s * t < N])); s *= 2
    if m == "r3":
        s = N // 2
        while s > 0:
            S.append(dict(kind="smem", ops=[dict(t=t, d=t, s=t + s, add=1) for t in range(s)])); s //= 2
    if m == "r5":
        for o in (2, 1):
            S.append(dict(kind="shfl", lanes=N, ops=[dict(t=t, d=t, s=t + o, add=1) for t in range(N) if t % WS + o < WS]))
        S.append(dict(kind="smem", wonly=1, ops=[dict(t=w * WS, d=w, s=w * WS, copy=1) for w in range(N // WS)]))
        for o in (2, 1):
            S.append(dict(kind="shfl", lanes=WS, ops=[dict(t=t, d=t, s=t + o, add=1) for t in range(WS) if t + o < WS]))
    if m == "hs":
        k = 1
        while k < N:
            S.append(dict(kind="smem", dbl=1, ops=[dict(t=t, d=t, s=t - k, add=1) if t >= k else dict(t=t, d=t, s=-1, keep=1) for t in range(N)])); k *= 2
    if m == "bl":
        d = 1
        while d < N:
            S.append(dict(kind="smem", ops=[dict(t=t, d=2 * d * (t + 1) - 1, s=2 * d * (t + 1) - 1 - d, add=1) for t in range(N) if 2 * d * (t + 1) - 1 < N])); d *= 2
        S.append(dict(kind="smem", ops=[dict(t=0, d=N - 1, s=-1, zero=1)]))
        d = N // 2
        while d >= 1:
            S.append(dict(kind="smem", ops=[dict(t=t, d=2 * d * (t + 1) - 1, s=2 * d * (t + 1) - 1 - d, swap=1, add=1) for t in range(N) if 2 * d * (t + 1) - 1 < N])); d //= 2
    return S


def apply(a, st):
    b = list(a)
    for o in st["ops"]:
        if o.get("zero"): b[o["d"]] = 0
        elif o.get("swap"): l, r = a[o["s"]], a[o["d"]]; b[o["s"]] = r; b[o["d"]] = r + l
        elif o.get("copy"): b[o["d"]] = a[o["s"]]
        elif o.get("add"): b[o["d"]] = a[o["d"]] + a[o["s"]]
    return b


def trans(ops, f):
    by = {}
    for o in ops:
        a = f(o)
        if a < 0: continue
        by.setdefault(o["t"] // WS, {}).setdefault(a % NB, set()).add(a)
    degs = [max(len(v) for v in b.values()) for b in by.values()]
    return sum(degs), max(degs + [1])


def run(m):
    a = list(X); tot = dict(steps=0, adds=0, active=0, idle=0, barrier=0, shfl=0, tx=0, worst=1)
    for st in steps(m):
        a = apply(a, st)
        warps = {o["t"] // WS for o in st["ops"]}
        lanes = st["lanes"] if st["kind"] == "shfl" else len(st["ops"])
        issued = st["lanes"] // WS if st["kind"] == "shfl" else len(warps)
        tot["steps"] += 1; tot["adds"] += sum(1 for o in st["ops"] if o.get("add"))
        tot["active"] += lanes; tot["idle"] += issued * WS - lanes
        if st["kind"] == "smem":
            tot["barrier"] += 1
            g = [] if st.get("wonly") else [trans(st["ops"], lambda o: o["s"]), trans(st["ops"], lambda o: o["d"])]
            g.append(trans(st["ops"], lambda o: o["d"]))
            tot["tx"] += sum(x[0] for x in g); tot["worst"] = max(tot["worst"], max(x[1] for x in g))
        else:
            tot["shfl"] += issued
    return a, tot


out = {}
inc = [sum(X[:i + 1]) for i in range(N)]
for m in ("r1", "r2", "r3", "r5", "hs", "bl"):
    a, tot = run(m)
    if m in ("r1", "r2", "r3", "r5"): assert a[0] == sum(X), m
    if m == "hs": assert a == inc
    if m == "bl": assert a == [0] + inc[:-1]
    out[m] = dict(final=a, tot=tot)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out/tree_expected.json"), "w"), indent=1)
for m, v in out.items(): print(m, v["tot"])
