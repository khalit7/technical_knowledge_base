"""Python reference for the 'Attention schedules' tab (parts/32_js_fa.js): split-K against split-Q shared-memory
counts per loop iteration, and the list-scheduling model of FlashAttention-3's overlap. Written from the same
rules; writes out/fa_expected.json, which check/check_js.mjs compares with the page's JavaScript."""
import json, os
Br = Bc = 64; d = 128; nw = 4


def split(m):
    kv = 2 * Bc * d
    if m == "q":
        return dict(w=kv, r=Bc * d * nw + Bc * d * nw, b=1)
    w = kv + Br * nw + nw * Br * (d + 1)
    r = (Bc // nw * d * nw + Br * d * nw) + Br * nw * nw + Bc // nw * d * nw + nw * Br * (d + 1)
    return dict(w=w, r=r, b=3)


def schedule(mode, r, total):
    wg = 2 if mode in ("pp", "both") else 1
    per, pipe = total // wg, mode in ("ip", "both")
    dur = {"G0": 1, "SM": 2 * r, "G1": 1}; res = {"G0": "tc", "SM": "sfu", "G1": "tc"}
    prog = []
    for g in range(wg):
        L = []
        if not pipe:
            for j in range(per): L += [("G0", j), ("SM", j), ("G1", j)]
        else:
            L.append(("G0", 0))
            for j in range(per):
                if j + 1 < per: L.append(("G0", j + 1))
                L += [("SM", j), ("G1", j)]
        prog.append(L)
    done, free = {}, {"tc": 0.0, "sfu": 0.0}
    ptr, lastS, lastE, out = [0] * wg, [0.0] * wg, [0.0] * wg, []

    def deps(g, k, j):
        D = []
        if k == "SM": D.append(("G0", j))
        if k == "G1":
            D.append(("SM", j))
            if j > 0: D.append(("G1", j - 1))
        if k == "G0" and j >= 2: D.append(("SM", j - 2))
        t = 0.0
        for q in D:
            if (g,) + q not in done: return None
            t = max(t, done[(g,) + q])
        return t
    while True:
        best = None
        for g, L in enumerate(prog):
            if ptr[g] >= len(L): continue
            k, j = L[ptr[g]]
            dt = deps(g, k, j)
            if dt is None: continue
            st = max(dt, lastS[g] if pipe else lastE[g], free[res[k]])
            if best is None or st < best[3]: best = (g, k, j, st)
        if best is None: break
        g, k, j, st = best; en = st + dur[k]
        done[(g, k, j)] = en; free[res[k]] = en; lastS[g] = st; lastE[g] = en; ptr[g] += 1; out.append((g, k, j, st, en, res[k]))
    end = max(t[4] for t in out); tc = sum(t[4] - t[3] for t in out if t[5] == "tc")
    return dict(end=round(end, 6), util=round(tc / end, 6), n=len(out))


E = {"split": {m: split(m) for m in ("k", "q")},
     "sched": {f"{m}@{r}": schedule(m, r, 8) for m in ("seq", "pp", "ip", "both") for r in (0.25, 0.5, 0.75, 1.0, 1.5)}}
json.dump(E, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out/fa_expected.json"), "w"), indent=1)
print(E["split"]); print({k: v for k, v in E["sched"].items() if k.endswith("@0.5") or k.endswith("@1.0")})
